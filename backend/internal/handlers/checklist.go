package handlers

import (
	_ "embed"
	"encoding/json"
	"net/http"
	"treklist/internal/models"
)

//go:embed data/checklist.json
var checklistJSON []byte

var checklistItems []models.ChecklistItem

func init() {
	if err := json.Unmarshal(checklistJSON, &checklistItems); err != nil {
		panic("failed to parse checklist.json: " + err.Error())
	}
}

func (h *Handler) GetChecklist(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, checklistItems)
}
