package x

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha1"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	"base-server/internal/infra/observability"
)

// Client handles HTTP communication with the X (Twitter) API.
type Client struct {
	apiKey     string
	apiSecret  string
	httpClient *http.Client
	logger     *observability.Logger
}

// NewClient creates a new X API client with app-level credentials.
func NewClient(apiKey, apiSecret string, logger *observability.Logger) *Client {
	return &Client{
		apiKey:     apiKey,
		apiSecret:  apiSecret,
		httpClient: &http.Client{},
		logger:     logger,
	}
}

// CreateTweet posts a tweet via the X v2 API.
func (c *Client) CreateTweet(ctx context.Context, req CreateTweetRequest, accessToken, tokenSecret string) (CreateTweetResponse, error) {
	payload := map[string]any{
		"text": req.Text,
	}
	if len(req.MediaIDs) > 0 {
		payload["media"] = map[string]any{
			"media_ids": req.MediaIDs,
		}
	}
	if req.ReplyToID != "" {
		payload["reply"] = map[string]any{
			"in_reply_to_tweet_id": req.ReplyToID,
		}
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return CreateTweetResponse{}, fmt.Errorf("xapi: failed to marshal payload: %w", err)
	}

	endpoint := "https://api.x.com/2/tweets"
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(string(body)))
	if err != nil {
		return CreateTweetResponse{}, fmt.Errorf("xapi: failed to create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", c.authHeader(http.MethodPost, endpoint, nil, accessToken, tokenSecret))

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return CreateTweetResponse{}, fmt.Errorf("xapi: request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusCreated {
		return CreateTweetResponse{}, fmt.Errorf("xapi: API returned %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return CreateTweetResponse{}, fmt.Errorf("xapi: failed to parse response: %w", err)
	}

	return CreateTweetResponse{ID: result.Data.ID}, nil
}

// UploadMedia uploads media to X via the v2 API with OAuth 2.0 Bearer auth.
// Uses a single multipart POST for simple image uploads.
func (c *Client) UploadMedia(ctx context.Context, req UploadMediaRequest, accessToken, tokenSecret string) (string, error) {
	mediaType := req.MediaType
	if mediaType == "" {
		mediaType = "image/jpeg"
	}

	mediaCategory := "tweet_image"
	if strings.HasPrefix(mediaType, "video/") {
		mediaCategory = "tweet_video"
	} else if strings.HasPrefix(mediaType, "image/gif") {
		mediaCategory = "tweet_gif"
	}

	endpoint := "https://api.x.com/2/media/upload"

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)

	if err := writer.WriteField("media_category", mediaCategory); err != nil {
		return "", fmt.Errorf("xapi: failed to write media_category: %w", err)
	}

	h := make(textproto.MIMEHeader)
	h.Set("Content-Disposition", `form-data; name="media"; filename="upload"`)
	h.Set("Content-Type", mediaType)
	part, err := writer.CreatePart(h)
	if err != nil {
		return "", fmt.Errorf("xapi: failed to create media part: %w", err)
	}
	if _, err := part.Write(req.MediaBytes); err != nil {
		return "", fmt.Errorf("xapi: failed to write media bytes: %w", err)
	}
	if err := writer.Close(); err != nil {
		return "", fmt.Errorf("xapi: failed to close multipart writer: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, &body)
	if err != nil {
		return "", fmt.Errorf("xapi: failed to create upload request: %w", err)
	}
	httpReq.Header.Set("Content-Type", writer.FormDataContentType())
	httpReq.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return "", fmt.Errorf("xapi: upload request failed: %w", err)
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("xapi: media upload failed with %d: %s", resp.StatusCode, string(respBody))
	}

	// v2 response shape: { "data": { "id": "...", "media_key": "...", "processing_info": {...} } }
	// Fallback to v1.1-style: { "media_id_string": "...", "processing_info": {...} }
	var v2Result struct {
		Data struct {
			ID             string          `json:"id"`
			MediaKey       string          `json:"media_key"`
			ProcessingInfo *processingInfo `json:"processing_info"`
		} `json:"data"`
		MediaIDString  string          `json:"media_id_string"`
		ProcessingInfo *processingInfo `json:"processing_info"`
	}
	if err := json.Unmarshal(respBody, &v2Result); err != nil {
		return "", fmt.Errorf("xapi: failed to parse upload response: %w", err)
	}

	mediaID := v2Result.Data.ID
	if mediaID == "" {
		mediaID = v2Result.MediaIDString
	}
	if mediaID == "" {
		return "", fmt.Errorf("xapi: no media ID in response: %s", string(respBody))
	}

	// Videos come back with processing_info; X won't accept the media_id
	// in a tweet until the transcode finishes. Poll STATUS until
	// succeeded (or fail fast on failed/timeout). Images don't emit
	// processing_info, so this short-circuits for them.
	pi := v2Result.Data.ProcessingInfo
	if pi == nil {
		pi = v2Result.ProcessingInfo
	}
	if pi != nil && pi.State != "" && pi.State != "succeeded" {
		if err := c.waitForMediaReady(ctx, mediaID, accessToken, pi); err != nil {
			return "", err
		}
	}
	return mediaID, nil
}

// processingInfo mirrors the subset of X's media processing status we
// care about. X returns check_after_secs as a hint for the next poll.
type processingInfo struct {
	State          string `json:"state"`
	CheckAfterSecs int    `json:"check_after_secs"`
	Error          *struct {
		Code    int    `json:"code"`
		Name    string `json:"name"`
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

// waitForMediaReady polls /2/media/upload?command=STATUS until the
// media's processing state is "succeeded". X exposes check_after_secs
// to pace callers; we honor it but clamp to a sane range. Bounded by a
// 2-minute overall timeout — capture clips are short, and anything
// that's still transcoding after 2 minutes probably isn't coming back.
func (c *Client) waitForMediaReady(ctx context.Context, mediaID, accessToken string, initial *processingInfo) error {
	const overallTimeout = 2 * time.Minute
	deadline := time.Now().Add(overallTimeout)

	pi := initial
	for {
		// Honor check_after_secs, clamped to [1, 10] so we don't stall
		// on a zero or unreasonably large hint.
		wait := time.Duration(pi.CheckAfterSecs) * time.Second
		if wait < time.Second {
			wait = time.Second
		}
		if wait > 10*time.Second {
			wait = 10 * time.Second
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(wait):
		}

		if time.Now().After(deadline) {
			return fmt.Errorf("xapi: media %s still in state %s after %s", mediaID, pi.State, overallTimeout)
		}

		next, err := c.getMediaStatus(ctx, mediaID, accessToken)
		if err != nil {
			return err
		}
		switch next.State {
		case "succeeded":
			return nil
		case "failed":
			if next.Error != nil {
				return fmt.Errorf("xapi: media %s processing failed: %s (%d)", mediaID, next.Error.Message, next.Error.Code)
			}
			return fmt.Errorf("xapi: media %s processing failed", mediaID)
		}
		pi = next
	}
}

func (c *Client) getMediaStatus(ctx context.Context, mediaID, accessToken string) (*processingInfo, error) {
	endpoint := fmt.Sprintf("https://api.x.com/2/media/upload?command=STATUS&media_id=%s", mediaID)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("xapi: failed to build STATUS request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("xapi: STATUS request failed: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("xapi: STATUS returned %d: %s", resp.StatusCode, string(body))
	}
	var result struct {
		Data struct {
			ProcessingInfo *processingInfo `json:"processing_info"`
		} `json:"data"`
		ProcessingInfo *processingInfo `json:"processing_info"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("xapi: failed to parse STATUS response: %w", err)
	}
	pi := result.Data.ProcessingInfo
	if pi == nil {
		pi = result.ProcessingInfo
	}
	if pi == nil {
		return nil, fmt.Errorf("xapi: STATUS response missing processing_info: %s", string(body))
	}
	return pi, nil
}

// uploadMediaLegacy is the old v1.1 chunked flow, kept for reference.
func (c *Client) uploadMediaLegacy(ctx context.Context, req UploadMediaRequest, accessToken, tokenSecret string) (string, error) {
	totalBytes := len(req.MediaBytes)
	mediaType := req.MediaType
	if mediaType == "" {
		mediaType = "image/jpeg"
	}

	uploadURL := "https://upload.twitter.com/1.1/media/upload.json"

	initParams := url.Values{}
	initParams.Set("command", "INIT")
	initParams.Set("total_bytes", strconv.Itoa(totalBytes))
	initParams.Set("media_type", mediaType)

	initReq, err := http.NewRequestWithContext(ctx, http.MethodPost, uploadURL, strings.NewReader(initParams.Encode()))
	if err != nil {
		return "", fmt.Errorf("xapi: failed to create INIT request: %w", err)
	}
	initReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	initReq.Header.Set("Authorization", c.authHeader(http.MethodPost, uploadURL, initParams, accessToken, tokenSecret))

	initResp, err := c.httpClient.Do(initReq)
	if err != nil {
		return "", fmt.Errorf("xapi: INIT request failed: %w", err)
	}
	defer initResp.Body.Close()
	initBody, _ := io.ReadAll(initResp.Body)

	if initResp.StatusCode != http.StatusAccepted && initResp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("xapi: INIT failed with %d: %s", initResp.StatusCode, string(initBody))
	}

	var initResult struct {
		MediaIDString string `json:"media_id_string"`
	}
	if err := json.Unmarshal(initBody, &initResult); err != nil {
		return "", fmt.Errorf("xapi: failed to parse INIT response: %w", err)
	}

	const chunkSize = 5 * 1024 * 1024
	for i := 0; i < totalBytes; i += chunkSize {
		end := i + chunkSize
		if end > totalBytes {
			end = totalBytes
		}
		chunk := req.MediaBytes[i:end]
		segmentIndex := i / chunkSize

		appendParams := url.Values{}
		appendParams.Set("command", "APPEND")
		appendParams.Set("media_id", initResult.MediaIDString)
		appendParams.Set("segment_index", strconv.Itoa(segmentIndex))
		appendParams.Set("media_data", base64.StdEncoding.EncodeToString(chunk))

		appendReq, err := http.NewRequestWithContext(ctx, http.MethodPost, uploadURL, strings.NewReader(appendParams.Encode()))
		if err != nil {
			return "", fmt.Errorf("xapi: failed to create APPEND request: %w", err)
		}
		appendReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		appendReq.Header.Set("Authorization", c.authHeader(http.MethodPost, uploadURL, appendParams, accessToken, tokenSecret))

		appendResp, err := c.httpClient.Do(appendReq)
		if err != nil {
			return "", fmt.Errorf("xapi: APPEND request failed: %w", err)
		}
		appendResp.Body.Close()
		if appendResp.StatusCode != http.StatusNoContent && appendResp.StatusCode != http.StatusOK {
			return "", fmt.Errorf("xapi: APPEND failed with %d", appendResp.StatusCode)
		}
	}

	finalizeParams := url.Values{}
	finalizeParams.Set("command", "FINALIZE")
	finalizeParams.Set("media_id", initResult.MediaIDString)

	finalizeReq, err := http.NewRequestWithContext(ctx, http.MethodPost, uploadURL, strings.NewReader(finalizeParams.Encode()))
	if err != nil {
		return "", fmt.Errorf("xapi: failed to create FINALIZE request: %w", err)
	}
	finalizeReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	finalizeReq.Header.Set("Authorization", c.authHeader(http.MethodPost, uploadURL, finalizeParams, accessToken, tokenSecret))

	finalizeResp, err := c.httpClient.Do(finalizeReq)
	if err != nil {
		return "", fmt.Errorf("xapi: FINALIZE request failed: %w", err)
	}
	defer finalizeResp.Body.Close()

	if finalizeResp.StatusCode != http.StatusCreated && finalizeResp.StatusCode != http.StatusOK {
		finalizeBody, _ := io.ReadAll(finalizeResp.Body)
		return "", fmt.Errorf("xapi: FINALIZE failed with %d: %s", finalizeResp.StatusCode, string(finalizeBody))
	}

	return initResult.MediaIDString, nil
}

// GetTweetMetrics retrieves public engagement metrics for a tweet.
func (c *Client) GetTweetMetrics(ctx context.Context, tweetID, accessToken, tokenSecret string) (TweetMetrics, error) {
	endpoint := fmt.Sprintf("https://api.x.com/2/tweets/%s?tweet.fields=public_metrics", tweetID)

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return TweetMetrics{}, fmt.Errorf("xapi: failed to create request: %w", err)
	}

	params := url.Values{}
	params.Set("tweet.fields", "public_metrics")
	httpReq.Header.Set("Authorization", c.authHeader(http.MethodGet, fmt.Sprintf("https://api.x.com/2/tweets/%s", tweetID), params, accessToken, tokenSecret))

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return TweetMetrics{}, fmt.Errorf("xapi: request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return TweetMetrics{}, fmt.Errorf("xapi: API returned %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		Data struct {
			PublicMetrics struct {
				RetweetCount    int `json:"retweet_count"`
				ReplyCount      int `json:"reply_count"`
				LikeCount       int `json:"like_count"`
				QuoteCount      int `json:"quote_count"`
				BookmarkCount   int `json:"bookmark_count"`
				ImpressionCount int `json:"impression_count"`
			} `json:"public_metrics"`
		} `json:"data"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return TweetMetrics{}, fmt.Errorf("xapi: failed to parse response: %w", err)
	}

	m := result.Data.PublicMetrics
	return TweetMetrics{
		ImpressionCount: m.ImpressionCount,
		LikeCount:       m.LikeCount,
		ReplyCount:      m.ReplyCount,
		RetweetCount:    m.RetweetCount,
		QuoteCount:      m.QuoteCount,
		BookmarkCount:   m.BookmarkCount,
	}, nil
}

// VerifyCredentials checks if an OAuth 2.0 Bearer token is still valid by calling GET /2/users/me.
func (c *Client) VerifyCredentials(ctx context.Context, accessToken string) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.x.com/2/users/me", nil)
	if err != nil {
		return fmt.Errorf("xapi: failed to create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("xapi: request failed: %w", err)
	}
	defer resp.Body.Close()
	io.ReadAll(resp.Body)

	// 200 = valid token, 403 = valid token but endpoint not accessible (Free tier),
	// 429 = rate limited (token is still valid). Only 401 means the token is expired/revoked.
	if resp.StatusCode == http.StatusUnauthorized {
		return fmt.Errorf("xapi: verify credentials returned %d", resp.StatusCode)
	}

	return nil
}

// authHeader returns the appropriate Authorization header value.
// If tokenSecret is empty, the token is an OAuth 2.0 Bearer token.
// Otherwise, it's an OAuth 1.0a token requiring HMAC-SHA1 signing.
func (c *Client) authHeader(method, baseURL string, queryParams url.Values, accessToken, tokenSecret string) string {
	if tokenSecret == "" {
		return "Bearer " + accessToken
	}
	return c.buildOAuth1Header(method, baseURL, queryParams, accessToken, tokenSecret)
}

// buildOAuth1Header constructs an OAuth 1.0a Authorization header using HMAC-SHA1.
func (c *Client) buildOAuth1Header(method, baseURL string, queryParams url.Values, oauthToken, oauthTokenSecret string) string {
	nonce := make([]byte, 16)
	rand.Read(nonce)
	oauthNonce := base64.StdEncoding.EncodeToString(nonce)

	timestamp := strconv.FormatInt(time.Now().Unix(), 10)

	oauthParams := url.Values{}
	oauthParams.Set("oauth_consumer_key", c.apiKey)
	oauthParams.Set("oauth_nonce", oauthNonce)
	oauthParams.Set("oauth_signature_method", "HMAC-SHA1")
	oauthParams.Set("oauth_timestamp", timestamp)
	oauthParams.Set("oauth_token", oauthToken)
	oauthParams.Set("oauth_version", "1.0")

	allParams := url.Values{}
	for k, v := range oauthParams {
		allParams[k] = v
	}
	if queryParams != nil {
		for k, v := range queryParams {
			allParams[k] = v
		}
	}

	var paramPairs []string
	for k := range allParams {
		for _, v := range allParams[k] {
			paramPairs = append(paramPairs, url.QueryEscape(k)+"="+url.QueryEscape(v))
		}
	}
	sort.Strings(paramPairs)
	paramString := strings.Join(paramPairs, "&")

	signatureBase := strings.ToUpper(method) + "&" + url.QueryEscape(baseURL) + "&" + url.QueryEscape(paramString)
	signingKey := url.QueryEscape(c.apiSecret) + "&" + url.QueryEscape(oauthTokenSecret)

	mac := hmac.New(sha1.New, []byte(signingKey))
	mac.Write([]byte(signatureBase))
	signature := base64.StdEncoding.EncodeToString(mac.Sum(nil))

	return fmt.Sprintf(`OAuth oauth_consumer_key="%s", oauth_nonce="%s", oauth_signature="%s", oauth_signature_method="HMAC-SHA1", oauth_timestamp="%s", oauth_token="%s", oauth_version="1.0"`,
		url.QueryEscape(c.apiKey),
		url.QueryEscape(oauthNonce),
		url.QueryEscape(signature),
		timestamp,
		url.QueryEscape(oauthToken),
	)
}
