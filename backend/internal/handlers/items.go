package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"
	"treklist/internal/db"
	"treklist/internal/models"

	"github.com/google/uuid"
)

func (h *Handler) GetTrekItems(w http.ResponseWriter, r *http.Request) {
	code := strings.ToUpper(r.PathValue("code"))
	ctx := r.Context()

	statuses, err := h.DB.Query(ctx,
		`SELECT s.* FROM item_statuses s
		 JOIN trekkers t ON s.trekker_id = t.id
		 WHERE t.trek_code = ? AND t.kicked_at IS NULL`, code)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch statuses")
		return
	}

	provisions, err := h.DB.Query(ctx,
		`SELECT p.*, c.id as claim_id, c.claimed_by
		 FROM item_provisions p
		 JOIN trekkers t ON p.trekker_id = t.id
		 LEFT JOIN provision_claims c ON c.provision_id = p.id
		 WHERE t.trek_code = ?`, code)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch provisions")
		return
	}

	annotations, err := h.DB.Query(ctx,
		`SELECT a.* FROM annotations a
		 JOIN trekkers t ON a.trekker_id = t.id
		 WHERE t.trek_code = ?`, code)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch annotations")
		return
	}

	customItems, err := h.DB.Query(ctx,
		`SELECT ci.* FROM custom_items ci WHERE ci.trek_code = ?`, code)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch custom items")
		return
	}

	weights, err := h.DB.Query(ctx,
		`SELECT tw.* FROM trekker_weights tw
		 JOIN trekkers t ON tw.trekker_id = t.id
		 WHERE t.trek_code = ?`, code)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch weights")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"statuses":     statuses,
		"provisions":   provisions,
		"annotations":  annotations,
		"custom_items": customItems,
		"weights":      weights,
	})
}

type setStatusRequest struct {
	ItemName string           `json:"item_name"`
	Status   models.ItemStatus `json:"status"`
}

func (h *Handler) SetItemStatus(w http.ResponseWriter, r *http.Request) {
	code := strings.ToUpper(r.PathValue("code"))
	token := authTrekker(r)
	ctx := r.Context()

	trekker, ok := h.resolveTrekker(w, r, code, token)
	if !ok {
		return
	}

	var req setStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}

	_, err := h.DB.Exec(ctx,
		`INSERT INTO item_statuses (trekker_id, item_name, status, updated_at)
		 VALUES (?, ?, ?, ?)
		 ON CONFLICT(trekker_id, item_name) DO UPDATE SET status=excluded.status, updated_at=excluded.updated_at`,
		trekker.ID, req.ItemName, req.Status, time.Now().UTC().Format(time.RFC3339),
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to set status")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"trekker_id": trekker.ID,
		"item_name":  req.ItemName,
		"status":     string(req.Status),
	})
}

type upsertProvisionRequest struct {
	ItemName string              `json:"item_name"`
	Type     models.ProvisionType `json:"type"`
	Quantity int                 `json:"quantity"`
}

func (h *Handler) UpsertProvision(w http.ResponseWriter, r *http.Request) {
	code := strings.ToUpper(r.PathValue("code"))
	token := authTrekker(r)
	ctx := r.Context()

	trekker, ok := h.resolveTrekker(w, r, code, token)
	if !ok {
		return
	}

	var req upsertProvisionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if req.Quantity < 1 || req.Quantity > 20 {
		writeError(w, http.StatusBadRequest, "quantity must be 1-20")
		return
	}

	existing, _ := h.DB.Query(ctx,
		`SELECT id FROM item_provisions WHERE trekker_id = ? AND item_name = ?`,
		trekker.ID, req.ItemName)

	var provisionID string
	if len(existing) > 0 {
		provisionID = db.Str(existing[0], "id")
		h.DB.Exec(ctx,
			`UPDATE item_provisions SET type = ?, quantity = ? WHERE id = ?`,
			req.Type, req.Quantity, provisionID)
		// Remove excess claims if quantity reduced
		h.DB.Exec(ctx,
			`DELETE FROM provision_claims WHERE provision_id = ? AND id NOT IN (
			   SELECT id FROM provision_claims WHERE provision_id = ? ORDER BY rowid LIMIT ?
			 )`, provisionID, provisionID, req.Quantity)
	} else {
		provisionID = uuid.New().String()
		h.DB.Exec(ctx,
			`INSERT INTO item_provisions (id, trekker_id, item_name, type, quantity) VALUES (?, ?, ?, ?, ?)`,
			provisionID, trekker.ID, req.ItemName, req.Type, req.Quantity)
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"provision_id": provisionID,
		"trekker_id":   trekker.ID,
		"item_name":    req.ItemName,
		"type":         req.Type,
		"quantity":     req.Quantity,
	})
}

type claimProvisionRequest struct {
	ProvisionID string `json:"provision_id"`
}

func (h *Handler) ClaimProvision(w http.ResponseWriter, r *http.Request) {
	code := strings.ToUpper(r.PathValue("code"))
	token := authTrekker(r)
	ctx := r.Context()

	trekker, ok := h.resolveTrekker(w, r, code, token)
	if !ok {
		return
	}

	var req claimProvisionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}

	provRows, err := h.DB.Query(ctx, `SELECT quantity FROM item_provisions WHERE id = ?`, req.ProvisionID)
	if err != nil || len(provRows) == 0 {
		writeError(w, http.StatusNotFound, "provision not found")
		return
	}
	quantity := int(provRows[0]["quantity"].(float64))

	claimRows, _ := h.DB.Query(ctx, `SELECT COUNT(*) as cnt FROM provision_claims WHERE provision_id = ?`, req.ProvisionID)
	claimed := 0
	if len(claimRows) > 0 {
		claimed = int(claimRows[0]["cnt"].(float64))
	}
	if claimed >= quantity {
		writeError(w, http.StatusConflict, "no slots available")
		return
	}

	claimID := uuid.New().String()
	_, err = h.DB.Exec(ctx,
		`INSERT OR IGNORE INTO provision_claims (id, provision_id, claimed_by) VALUES (?, ?, ?)`,
		claimID, req.ProvisionID, trekker.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to claim")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"claim_id": claimID})
}

func (h *Handler) UnclaimProvision(w http.ResponseWriter, r *http.Request) {
	code := strings.ToUpper(r.PathValue("code"))
	provisionID := r.PathValue("provisionID")
	token := authTrekker(r)
	ctx := r.Context()

	trekker, ok := h.resolveTrekker(w, r, code, token)
	if !ok {
		return
	}

	h.DB.Exec(ctx,
		`DELETE FROM provision_claims WHERE provision_id = ? AND claimed_by = ?`,
		provisionID, trekker.ID)
	writeJSON(w, http.StatusOK, map[string]string{"unclaimed": provisionID})
}

type annotateRequest struct {
	ItemName string `json:"item_name"`
	Body     string `json:"body"`
}

func (h *Handler) AddAnnotation(w http.ResponseWriter, r *http.Request) {
	code := strings.ToUpper(r.PathValue("code"))
	token := authTrekker(r)
	ctx := r.Context()

	trekker, ok := h.resolveTrekker(w, r, code, token)
	if !ok {
		return
	}

	var req annotateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if req.Body == "" {
		writeError(w, http.StatusBadRequest, "body required")
		return
	}

	id := uuid.New().String()
	_, err := h.DB.Exec(ctx,
		`INSERT INTO annotations (id, trekker_id, item_name, body, created_at) VALUES (?, ?, ?, ?, ?)`,
		id, trekker.ID, req.ItemName, req.Body, time.Now().UTC().Format(time.RFC3339))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to add annotation")
		return
	}

	ann := models.Annotation{ID: id, TrekkerID: trekker.ID, ItemName: req.ItemName, Body: req.Body, CreatedAt: time.Now().UTC()}
	writeJSON(w, http.StatusCreated, ann)
}

func (h *Handler) DeleteAnnotation(w http.ResponseWriter, r *http.Request) {
	code := strings.ToUpper(r.PathValue("code"))
	annotationID := r.PathValue("annotationID")
	token := authTrekker(r)
	ctx := r.Context()

	trekker, ok := h.resolveTrekker(w, r, code, token)
	if !ok {
		return
	}

	h.DB.Exec(ctx, `DELETE FROM annotations WHERE id = ? AND trekker_id = ?`, annotationID, trekker.ID)
	writeJSON(w, http.StatusOK, map[string]string{"deleted": annotationID})
}

type addCustomItemRequest struct {
	Name     string  `json:"name"`
	Category *string `json:"category,omitempty"`
}

func (h *Handler) AddCustomItem(w http.ResponseWriter, r *http.Request) {
	code := strings.ToUpper(r.PathValue("code"))
	token := authTrekker(r)
	ctx := r.Context()

	trekker, ok := h.resolveTrekker(w, r, code, token)
	if !ok {
		return
	}

	var req addCustomItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "name required")
		return
	}

	id := uuid.New().String()
	_, err := h.DB.Exec(ctx,
		`INSERT INTO custom_items (id, trek_code, trekker_id, name, category) VALUES (?, ?, ?, ?, ?)`,
		id, code, trekker.ID, req.Name, req.Category)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to add custom item")
		return
	}

	writeJSON(w, http.StatusCreated, models.CustomItem{
		ID: id, TrekCode: code, TrekkerID: trekker.ID, Name: req.Name, Category: req.Category,
	})
}

type setWeightRequest struct {
	ItemName    string  `json:"item_name"`
	CustomGrams float64 `json:"custom_grams"`
}

func (h *Handler) SetItemWeight(w http.ResponseWriter, r *http.Request) {
	code := strings.ToUpper(r.PathValue("code"))
	token := authTrekker(r)
	ctx := r.Context()

	trekker, ok := h.resolveTrekker(w, r, code, token)
	if !ok {
		return
	}

	var req setWeightRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}

	_, err := h.DB.Exec(ctx,
		`INSERT INTO trekker_weights (trekker_id, item_name, custom_grams)
		 VALUES (?, ?, ?)
		 ON CONFLICT(trekker_id, item_name) DO UPDATE SET custom_grams=excluded.custom_grams`,
		trekker.ID, req.ItemName, req.CustomGrams)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to set weight")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"trekker_id":   trekker.ID,
		"item_name":    req.ItemName,
		"custom_grams": req.CustomGrams,
	})
}

func (h *Handler) GetItemWeights(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	rows, err := h.DB.Query(ctx, `SELECT item_name, default_grams FROM item_weights`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch weights")
		return
	}
	writeJSON(w, http.StatusOK, rows)
}

func (h *Handler) resolveTrekker(w http.ResponseWriter, r *http.Request, code, token string) (models.Trekker, bool) {
	rows, err := h.DB.Query(r.Context(),
		`SELECT * FROM trekkers WHERE session_token = ? AND trek_code = ? AND kicked_at IS NULL`,
		token, code)
	if err != nil || len(rows) == 0 {
		writeError(w, http.StatusUnauthorized, "invalid session")
		return models.Trekker{}, false
	}
	return trekkerFromRow(rows[0]), true
}
