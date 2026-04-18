package processor

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
)

// fetchXProfile retrieves the authenticated user's profile from X API v2.
func (p *PlatformProcessor) fetchXProfile(ctx context.Context, accessToken string) (string, string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.x.com/2/users/me?user.fields=username", nil)
	if err != nil {
		return "", "", err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	var result struct {
		Data struct {
			ID       string `json:"id"`
			Username string `json:"username"`
			Name     string `json:"name"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", "", err
	}
	displayName := result.Data.Name
	if displayName == "" {
		displayName = "@" + result.Data.Username
	}
	return result.Data.ID, displayName, nil
}

// fetchUserProfile retrieves the user's profile info from the platform to get their ID and display name.
func (p *PlatformProcessor) fetchUserProfile(ctx context.Context, platform, accessToken, openID string) (userID, displayName string, err error) {
	switch platform {
	case "linkedin":
		return p.fetchLinkedInProfile(ctx, accessToken)
	case "facebook":
		return p.fetchFacebookProfile(ctx, accessToken)
	case "instagram":
		return p.fetchInstagramProfile(ctx, accessToken)
	case "threads":
		return p.fetchThreadsProfile(ctx, accessToken)
	case "tiktok":
		return p.fetchTikTokProfile(ctx, accessToken, openID)
	case "pinterest":
		return p.fetchPinterestProfile(ctx, accessToken)
	default:
		return "", "", fmt.Errorf("unsupported platform: %s", platform)
	}
}

func (p *PlatformProcessor) fetchLinkedInProfile(ctx context.Context, accessToken string) (string, string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.linkedin.com/v2/userinfo", nil)
	if err != nil {
		return "", "", err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	var result struct {
		Sub  string `json:"sub"`
		Name string `json:"name"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", "", err
	}
	return result.Sub, result.Name, nil
}

func (p *PlatformProcessor) fetchFacebookProfile(ctx context.Context, accessToken string) (string, string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://graph.facebook.com/v21.0/me?fields=id,name&access_token="+accessToken, nil)
	if err != nil {
		return "", "", err
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	var result struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", "", err
	}
	return result.ID, result.Name, nil
}

func (p *PlatformProcessor) fetchInstagramProfile(ctx context.Context, accessToken string) (string, string, error) {
	// First get the user's pages, then get the IG business account from the page
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://graph.facebook.com/v21.0/me/accounts?fields=instagram_business_account,name&access_token="+accessToken, nil)
	if err != nil {
		return "", "", err
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	var result struct {
		Data []struct {
			InstagramBusinessAccount struct {
				ID string `json:"id"`
			} `json:"instagram_business_account"`
			Name string `json:"name"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", "", err
	}

	for _, page := range result.Data {
		if page.InstagramBusinessAccount.ID != "" {
			return page.InstagramBusinessAccount.ID, page.Name, nil
		}
	}
	return "", "", errors.New("no Instagram business account found")
}

func (p *PlatformProcessor) fetchThreadsProfile(ctx context.Context, accessToken string) (string, string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://graph.threads.net/v1.0/me?fields=id,username&access_token="+accessToken, nil)
	if err != nil {
		return "", "", err
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	var result struct {
		ID       string `json:"id"`
		Username string `json:"username"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", "", err
	}
	return result.ID, result.Username, nil
}

func (p *PlatformProcessor) fetchTikTokProfile(ctx context.Context, accessToken, openID string) (string, string, error) {
	if openID != "" {
		// TikTok returns open_id in the token response
		return openID, "", nil
	}

	payload := `{"fields":["open_id","display_name"]}`
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://open.tiktokapis.com/v2/user/info/", strings.NewReader(payload))
	if err != nil {
		return "", "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	var result struct {
		Data struct {
			User struct {
				OpenID      string `json:"open_id"`
				DisplayName string `json:"display_name"`
			} `json:"user"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", "", err
	}
	return result.Data.User.OpenID, result.Data.User.DisplayName, nil
}

func (p *PlatformProcessor) fetchPinterestProfile(ctx context.Context, accessToken string) (string, string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.pinterest.com/v5/user_account", nil)
	if err != nil {
		return "", "", err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	var result struct {
		Username string `json:"username"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", "", err
	}
	return result.Username, result.Username, nil
}
