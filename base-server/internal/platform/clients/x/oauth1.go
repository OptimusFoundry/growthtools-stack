package x

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha1"
	"encoding/base64"
	"fmt"
	"maps"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"
)

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
	maps.Copy(allParams, oauthParams)
	maps.Copy(allParams, queryParams)

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
