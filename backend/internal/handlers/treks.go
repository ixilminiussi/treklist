package handlers

import (
	"crypto/rand"
	"encoding/json"
	"math/big"
	"net/http"
	"strings"
	"time"
	"treklist/internal/db"
	"treklist/internal/models"

	"github.com/google/uuid"
)

const codeChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

func generateCode() string {
	b := make([]byte, 5)
	for i := range b {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(codeChars))))
		b[i] = codeChars[n.Int64()]
	}
	return string(b)
}

func generateToken() string {
	return uuid.New().String()
}

type createTrekRequest struct {
	Name        string `json:"name"`
	TrekType    string `json:"trek_type"`
	FoodSource  string `json:"food_source"`
	Camping     string `json:"camping"`
	Weather     string `json:"weather"`
	Temperature string `json:"temperature"`
	// Creator identity
	GuestName *string `json:"guest_name,omitempty"`
	UserID    *string `json:"user_id,omitempty"`
	Color     string  `json:"color"`
}

type createTrekResponse struct {
	Trek         models.Trek    `json:"trek"`
	Trekker      models.Trekker `json:"trekker"`
	SessionToken string         `json:"session_token"`
}

func (h *Handler) CreateTrek(w http.ResponseWriter, r *http.Request) {
	var req createTrekRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if req.Name == "" || req.TrekType == "" {
		writeError(w, http.StatusBadRequest, "name and trek_type required")
		return
	}

	ctx := r.Context()
	code := generateCode()
	creatorID := ""
	if req.UserID != nil {
		creatorID = *req.UserID
	}

	_, err := h.DB.Exec(ctx,
		`INSERT INTO treks (code, name, trek_type, food_source, camping, weather, temperature, creator_id, status, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
		code, req.Name, req.TrekType, req.FoodSource, req.Camping, req.Weather, req.Temperature,
		creatorID, time.Now().UTC().Format(time.RFC3339),
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create trek")
		return
	}

	trekkerID := uuid.New().String()
	token := generateToken()
	displayName := ""
	if req.GuestName != nil {
		displayName = *req.GuestName
	}

	_, err = h.DB.Exec(ctx,
		`INSERT INTO trekkers (id, trek_code, user_id, guest_name, session_token, color, joined_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		trekkerID, code, req.UserID, req.GuestName, token, req.Color,
		time.Now().UTC().Format(time.RFC3339),
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create trekker")
		return
	}

	trek := models.Trek{
		Code: code, Name: req.Name, TrekType: req.TrekType,
		FoodSource: req.FoodSource, Camping: req.Camping,
		Weather: req.Weather, Temperature: req.Temperature,
		Status: models.TrekStatusActive, CreatedAt: time.Now().UTC(),
	}
	trekker := models.Trekker{
		ID: trekkerID, TrekCode: code, UserID: req.UserID,
		GuestName: req.GuestName, Color: req.Color,
		JoinedAt: time.Now().UTC(), DisplayName: displayName,
	}

	writeJSON(w, http.StatusCreated, createTrekResponse{
		Trek: trek, Trekker: trekker, SessionToken: token,
	})
}

type joinTrekRequest struct {
	GuestName *string `json:"guest_name,omitempty"`
	UserID    *string `json:"user_id,omitempty"`
	Color     string  `json:"color"`
}

type joinTrekResponse struct {
	Trek         models.Trek    `json:"trek"`
	Trekker      models.Trekker `json:"trekker"`
	SessionToken string         `json:"session_token"`
}

func (h *Handler) JoinTrek(w http.ResponseWriter, r *http.Request) {
	code := strings.ToUpper(r.PathValue("code"))
	var req joinTrekRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}

	ctx := r.Context()
	rows, err := h.DB.Query(ctx, `SELECT * FROM treks WHERE code = ?`, code)
	if err != nil || len(rows) == 0 {
		writeError(w, http.StatusNotFound, "trek not found")
		return
	}

	row := rows[0]
	if db.Str(row, "status") != "active" {
		writeError(w, http.StatusGone, "trek is no longer active")
		return
	}

	trekkerID := uuid.New().String()
	token := generateToken()
	displayName := ""
	if req.GuestName != nil {
		displayName = *req.GuestName
	}

	_, err = h.DB.Exec(ctx,
		`INSERT INTO trekkers (id, trek_code, user_id, guest_name, session_token, color, joined_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		trekkerID, code, req.UserID, req.GuestName, token, req.Color,
		time.Now().UTC().Format(time.RFC3339),
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to join trek")
		return
	}

	trek := trekFromRow(row)
	trekker := models.Trekker{
		ID: trekkerID, TrekCode: code, UserID: req.UserID,
		GuestName: req.GuestName, Color: req.Color,
		JoinedAt: time.Now().UTC(), DisplayName: displayName,
	}

	writeJSON(w, http.StatusCreated, joinTrekResponse{
		Trek: trek, Trekker: trekker, SessionToken: token,
	})
}

func (h *Handler) GetTrek(w http.ResponseWriter, r *http.Request) {
	code := strings.ToUpper(r.PathValue("code"))
	ctx := r.Context()

	rows, err := h.DB.Query(ctx, `SELECT * FROM treks WHERE code = ?`, code)
	if err != nil || len(rows) == 0 {
		writeError(w, http.StatusNotFound, "trek not found")
		return
	}

	trek := trekFromRow(rows[0])

	trekkerRows, err := h.DB.Query(ctx,
		`SELECT t.*, u.username, u.weight_kg, u.sex, u.color as u_color
		 FROM trekkers t LEFT JOIN users u ON t.user_id = u.id
		 WHERE t.trek_code = ? AND t.kicked_at IS NULL`, code)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch trekkers")
		return
	}

	trekkers := make([]models.Trekker, 0, len(trekkerRows))
	for _, tr := range trekkerRows {
		trekkers = append(trekkers, trekkerFromRow(tr))
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"trek":     trek,
		"trekkers": trekkers,
	})
}

func (h *Handler) CloseTrek(w http.ResponseWriter, r *http.Request) {
	code := strings.ToUpper(r.PathValue("code"))
	token := authTrekker(r)
	ctx := r.Context()

	trekRows, err := h.DB.Query(ctx, `SELECT creator_id FROM treks WHERE code = ?`, code)
	if err != nil || len(trekRows) == 0 {
		writeError(w, http.StatusNotFound, "trek not found")
		return
	}
	creatorID := db.Str(trekRows[0], "creator_id")

	tRows, err := h.DB.Query(ctx, `SELECT user_id FROM trekkers WHERE session_token = ? AND trek_code = ?`, token, code)
	if err != nil || len(tRows) == 0 {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	callerUserID := db.Str(tRows[0], "user_id")
	if callerUserID == "" || callerUserID != creatorID {
		writeError(w, http.StatusForbidden, "only creator can close trek")
		return
	}

	_, err = h.DB.Exec(ctx,
		`UPDATE treks SET status = 'archived', closed_at = ? WHERE code = ?`,
		time.Now().UTC().Format(time.RFC3339), code,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to close trek")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "archived"})
}

func (h *Handler) KickTrekker(w http.ResponseWriter, r *http.Request) {
	code := strings.ToUpper(r.PathValue("code"))
	trekkerID := r.PathValue("trekkerID")
	token := authTrekker(r)
	ctx := r.Context()

	trekRows, err := h.DB.Query(ctx, `SELECT creator_id FROM treks WHERE code = ?`, code)
	if err != nil || len(trekRows) == 0 {
		writeError(w, http.StatusNotFound, "trek not found")
		return
	}
	creatorID := db.Str(trekRows[0], "creator_id")

	tRows, err := h.DB.Query(ctx, `SELECT user_id FROM trekkers WHERE session_token = ? AND trek_code = ?`, token, code)
	if err != nil || len(tRows) == 0 {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if db.Str(tRows[0], "user_id") != creatorID {
		writeError(w, http.StatusForbidden, "only creator can kick trekkers")
		return
	}

	_, err = h.DB.Exec(ctx,
		`UPDATE trekkers SET kicked_at = ? WHERE id = ? AND trek_code = ?`,
		time.Now().UTC().Format(time.RFC3339), trekkerID, code,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to kick trekker")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"kicked": trekkerID})
}

func trekFromRow(row map[string]any) models.Trek {
	status := models.TrekStatus(db.Str(row, "status"))
	return models.Trek{
		Code:        db.Str(row, "code"),
		Name:        db.Str(row, "name"),
		TrekType:    db.Str(row, "trek_type"),
		FoodSource:  db.Str(row, "food_source"),
		Camping:     db.Str(row, "camping"),
		Weather:     db.Str(row, "weather"),
		Temperature: db.Str(row, "temperature"),
		CreatorID:   db.Str(row, "creator_id"),
		Status:      status,
		CreatedAt:   db.TimeVal(row, "created_at"),
		ClosedAt:    db.TimePtr(row, "closed_at"),
	}
}

func trekkerFromRow(row map[string]any) models.Trekker {
	displayName := db.Str(row, "username")
	if displayName == "" {
		displayName = db.Str(row, "guest_name")
	}
	color := db.Str(row, "color")
	if color == "" {
		color = db.Str(row, "u_color")
	}
	sex := models.Sex(db.Str(row, "sex"))
	var sexPtr *models.Sex
	if sex != "" {
		sexPtr = &sex
	}
	return models.Trekker{
		ID:          db.Str(row, "id"),
		TrekCode:    db.Str(row, "trek_code"),
		UserID:      db.StrPtr(row, "user_id"),
		GuestName:   db.StrPtr(row, "guest_name"),
		Color:       color,
		JoinedAt:    db.TimeVal(row, "joined_at"),
		KickedAt:    db.TimePtr(row, "kicked_at"),
		DisplayName: displayName,
		WeightKg:    db.Float64Ptr(row, "weight_kg"),
		Sex:         sexPtr,
	}
}
