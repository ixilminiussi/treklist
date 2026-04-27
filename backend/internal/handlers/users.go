package handlers

import (
	"encoding/json"
	"net/http"
	"time"
	"treklist/internal/db"
	"treklist/internal/models"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type registerRequest struct {
	Email    string       `json:"email"`
	Username string       `json:"username"`
	Password string       `json:"password"`
	Birthday *string      `json:"birthday,omitempty"`
	WeightKg *float64     `json:"weight_kg,omitempty"`
	Sex      *models.Sex  `json:"sex,omitempty"`
	Gender   *string      `json:"gender,omitempty"`
	Color    string       `json:"color"`
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if req.Email == "" || req.Username == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "email, username, password required")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to hash password")
		return
	}

	id := uuid.New().String()
	ctx := r.Context()
	_, err = h.DB.Exec(ctx,
		`INSERT INTO users (id, email, username, password_hash, birthday, weight_kg, sex, gender, color, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		id, req.Email, req.Username, string(hash),
		req.Birthday, req.WeightKg, req.Sex, req.Gender, req.Color,
		time.Now().UTC().Format(time.RFC3339),
	)
	if err != nil {
		writeError(w, http.StatusConflict, "email or username already taken")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]string{"id": id, "username": req.Username})
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}

	ctx := r.Context()
	rows, err := h.DB.Query(ctx, `SELECT * FROM users WHERE email = ?`, req.Email)
	if err != nil || len(rows) == 0 {
		writeError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	row := rows[0]
	hash := db.Str(row, "password_hash")
	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.Password)); err != nil {
		writeError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"id":       db.Str(row, "id"),
		"username": db.Str(row, "username"),
		"email":    db.Str(row, "email"),
		"color":    db.Str(row, "color"),
		"sex":      db.Str(row, "sex"),
		"gender":   db.Str(row, "gender"),
	})
}

func (h *Handler) GetProfile(w http.ResponseWriter, r *http.Request) {
	userID := r.PathValue("userID")
	ctx := r.Context()

	rows, err := h.DB.Query(ctx, `SELECT id, username, color, sex, gender, weight_kg, birthday FROM users WHERE id = ?`, userID)
	if err != nil || len(rows) == 0 {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}
	writeJSON(w, http.StatusOK, rows[0])
}

func (h *Handler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	userID := r.PathValue("userID")
	ctx := r.Context()

	var fields map[string]any
	if err := json.NewDecoder(r.Body).Decode(&fields); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}

	allowed := map[string]bool{"username": true, "birthday": true, "weight_kg": true, "sex": true, "gender": true, "color": true}
	for k := range fields {
		if !allowed[k] {
			delete(fields, k)
		}
	}
	if len(fields) == 0 {
		writeError(w, http.StatusBadRequest, "no updatable fields")
		return
	}

	sets := ""
	vals := []any{}
	for k, v := range fields {
		if sets != "" {
			sets += ", "
		}
		sets += k + " = ?"
		vals = append(vals, v)
	}
	vals = append(vals, userID)

	_, err := h.DB.Exec(ctx, "UPDATE users SET "+sets+" WHERE id = ?", vals...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update profile")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"updated": userID})
}
