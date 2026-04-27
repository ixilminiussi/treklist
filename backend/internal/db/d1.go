package db

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

type D1Client struct {
	accountID  string
	databaseID string
	apiToken   string
	httpClient *http.Client
}

func NewD1Client() *D1Client {
	return &D1Client{
		accountID:  os.Getenv("CF_ACCOUNT_ID"),
		databaseID: os.Getenv("CF_D1_DATABASE_ID"),
		apiToken:   os.Getenv("CF_API_TOKEN"),
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}
}

type d1Request struct {
	SQL    string `json:"sql"`
	Params []any  `json:"params"`
}

type d1Response struct {
	Result []struct {
		Results []map[string]any `json:"results"`
		Success bool             `json:"success"`
		Meta    struct {
			RowsAffected int `json:"rows_affected"`
		} `json:"meta"`
	} `json:"result"`
	Success bool `json:"success"`
	Errors  []struct {
		Message string `json:"message"`
	} `json:"errors"`
}

func (c *D1Client) Query(ctx context.Context, sql string, params ...any) ([]map[string]any, error) {
	body, _ := json.Marshal(d1Request{SQL: sql, Params: params})
	url := fmt.Sprintf("https://api.cloudflare.com/client/v4/accounts/%s/d1/database/%s/query",
		c.accountID, c.databaseID)

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	var d1r d1Response
	if err := json.Unmarshal(raw, &d1r); err != nil {
		return nil, fmt.Errorf("d1 decode: %w", err)
	}
	if !d1r.Success {
		if len(d1r.Errors) > 0 {
			return nil, fmt.Errorf("d1 error: %s", d1r.Errors[0].Message)
		}
		return nil, fmt.Errorf("d1 unknown error")
	}
	if len(d1r.Result) == 0 {
		return nil, nil
	}
	return d1r.Result[0].Results, nil
}

func (c *D1Client) Exec(ctx context.Context, sql string, params ...any) (int, error) {
	body, _ := json.Marshal(d1Request{SQL: sql, Params: params})
	url := fmt.Sprintf("https://api.cloudflare.com/client/v4/accounts/%s/d1/database/%s/query",
		c.accountID, c.databaseID)

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
	if err != nil {
		return 0, err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	var d1r d1Response
	if err := json.Unmarshal(raw, &d1r); err != nil {
		return 0, fmt.Errorf("d1 decode: %w", err)
	}
	if !d1r.Success {
		if len(d1r.Errors) > 0 {
			return 0, fmt.Errorf("d1 error: %s", d1r.Errors[0].Message)
		}
		return 0, fmt.Errorf("d1 unknown error")
	}
	if len(d1r.Result) == 0 {
		return 0, nil
	}
	return d1r.Result[0].Meta.RowsAffected, nil
}

func Str(m map[string]any, key string) string {
	v, _ := m[key].(string)
	return v
}

func StrPtr(m map[string]any, key string) *string {
	v, ok := m[key].(string)
	if !ok || v == "" {
		return nil
	}
	return &v
}

func Float64Ptr(m map[string]any, key string) *float64 {
	switch v := m[key].(type) {
	case float64:
		return &v
	case int64:
		f := float64(v)
		return &f
	}
	return nil
}

func TimeVal(m map[string]any, key string) time.Time {
	s, _ := m[key].(string)
	t, _ := time.Parse(time.RFC3339, s)
	return t
}

func TimePtr(m map[string]any, key string) *time.Time {
	s, _ := m[key].(string)
	if s == "" {
		return nil
	}
	t, err := time.Parse(time.RFC3339, s)
	if err != nil {
		return nil
	}
	return &t
}
