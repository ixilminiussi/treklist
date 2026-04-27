package main

import (
	"log"
	"net/http"
	"os"
	"treklist/internal/db"
	"treklist/internal/handlers"
	"treklist/internal/ws"
)

func main() {
	d1 := db.NewD1Client()
	h := handlers.New(d1)
	hub := ws.NewHub()

	mux := http.NewServeMux()

	// Auth
	mux.HandleFunc("POST /api/auth/register", h.Register)
	mux.HandleFunc("POST /api/auth/login", h.Login)

	// Users
	mux.HandleFunc("GET /api/users/{userID}", h.GetProfile)
	mux.HandleFunc("PATCH /api/users/{userID}", h.UpdateProfile)

	// Treks
	mux.HandleFunc("POST /api/treks", h.CreateTrek)
	mux.HandleFunc("GET /api/treks/{code}", h.GetTrek)
	mux.HandleFunc("POST /api/treks/{code}/join", h.JoinTrek)
	mux.HandleFunc("POST /api/treks/{code}/close", h.CloseTrek)
	mux.HandleFunc("DELETE /api/treks/{code}/trekkers/{trekkerID}", h.KickTrekker)

	// Items & statuses
	mux.HandleFunc("GET /api/treks/{code}/items", h.GetTrekItems)
	mux.HandleFunc("POST /api/treks/{code}/items/status", h.SetItemStatus)
	mux.HandleFunc("POST /api/treks/{code}/items/provision", h.UpsertProvision)
	mux.HandleFunc("POST /api/treks/{code}/items/claim", h.ClaimProvision)
	mux.HandleFunc("DELETE /api/treks/{code}/items/provision/{provisionID}/claim", h.UnclaimProvision)
	mux.HandleFunc("POST /api/treks/{code}/items/annotate", h.AddAnnotation)
	mux.HandleFunc("DELETE /api/treks/{code}/annotations/{annotationID}", h.DeleteAnnotation)
	mux.HandleFunc("POST /api/treks/{code}/items/custom", h.AddCustomItem)
	mux.HandleFunc("POST /api/treks/{code}/items/weight", h.SetItemWeight)

	// Checklist & weights (static data)
	mux.HandleFunc("GET /api/checklist", h.GetChecklist)
	mux.HandleFunc("GET /api/weights", h.GetItemWeights)

	// WebSocket
	mux.HandleFunc("GET /ws/{code}", hub.ServeWS)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("treklist backend listening on :%s", port)
	if err := http.ListenAndServe(":"+port, cors(mux)); err != nil {
		log.Fatal(err)
	}
}

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", os.Getenv("ALLOWED_ORIGIN"))
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Session-Token")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
