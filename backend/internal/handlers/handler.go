package handlers

import (
	"encoding/json"
	"net/http"
	"treklist/internal/db"
)

type Handler struct {
	DB *db.D1Client
}

func New(d *db.D1Client) *Handler {
	return &Handler{DB: d}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func authTrekker(r *http.Request) string {
	return r.Header.Get("X-Session-Token")
}
