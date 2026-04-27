package models

import "time"

type Sex string
type Gender string
type TrekStatus string
type ItemStatus string
type ProvisionType string

const (
	SexMale   Sex = "M"
	SexFemale Sex = "F"
	SexOther  Sex = "X"

	TrekStatusActive   TrekStatus = "active"
	TrekStatusArchived TrekStatus = "archived"

	StatusNeed      ItemStatus = "need"
	StatusWillGet   ItemStatus = "will_get"
	StatusGotIt     ItemStatus = "got_it"
	StatusProvided  ItemStatus = "provided"
	StatusShared    ItemStatus = "shared"
	StatusDontNeed  ItemStatus = "dont_need"

	ProvisionTypeProvided ProvisionType = "provided"
	ProvisionTypeShared   ProvisionType = "shared"
)

type User struct {
	ID           string     `json:"id"`
	Email        string     `json:"email,omitempty"`
	Username     string     `json:"username"`
	PasswordHash string     `json:"-"`
	Birthday     *time.Time `json:"birthday,omitempty"`
	WeightKg     *float64   `json:"weight_kg,omitempty"`
	Sex          *Sex       `json:"sex,omitempty"`
	Gender       *Gender    `json:"gender,omitempty"`
	Color        string     `json:"color"`
	CreatedAt    time.Time  `json:"created_at"`
}

type Trek struct {
	Code        string     `json:"code"`
	Name        string     `json:"name"`
	TrekType    string     `json:"trek_type"`
	FoodSource  string     `json:"food_source"`
	Camping     string     `json:"camping"`
	Weather     string     `json:"weather"`
	Temperature string     `json:"temperature"`
	CreatorID   string     `json:"creator_id"`
	Status      TrekStatus `json:"status"`
	CreatedAt   time.Time  `json:"created_at"`
	ClosedAt    *time.Time `json:"closed_at,omitempty"`
}

type Trekker struct {
	ID           string     `json:"id"`
	TrekCode     string     `json:"trek_code"`
	UserID       *string    `json:"user_id,omitempty"`
	GuestName    *string    `json:"guest_name,omitempty"`
	SessionToken string     `json:"-"`
	Color        string     `json:"color"`
	JoinedAt     time.Time  `json:"joined_at"`
	KickedAt     *time.Time `json:"kicked_at,omitempty"`
	// Derived
	DisplayName string   `json:"display_name"`
	WeightKg    *float64 `json:"weight_kg,omitempty"`
	Sex         *Sex     `json:"sex,omitempty"`
}

type ItemStatusRow struct {
	TrekkerID string     `json:"trekker_id"`
	ItemName  string     `json:"item_name"`
	Status    ItemStatus `json:"status"`
	UpdatedAt time.Time  `json:"updated_at"`
}

type ItemProvision struct {
	ID        string        `json:"id"`
	TrekkerID string        `json:"trekker_id"`
	ItemName  string        `json:"item_name"`
	Type      ProvisionType `json:"type"`
	Quantity  int           `json:"quantity"`
}

type ProvisionClaim struct {
	ID          string  `json:"id"`
	ProvisionID string  `json:"provision_id"`
	ClaimedBy   string  `json:"claimed_by"` // trekker_id
}

type ItemWeight struct {
	ItemName     string  `json:"item_name"`
	DefaultGrams float64 `json:"default_grams"`
}

type TrekkerWeight struct {
	TrekkerID   string  `json:"trekker_id"`
	ItemName    string  `json:"item_name"`
	CustomGrams float64 `json:"custom_grams"`
}

type Annotation struct {
	ID        string    `json:"id"`
	TrekkerID string    `json:"trekker_id"`
	ItemName  string    `json:"item_name"`
	Body      string    `json:"body"`
	CreatedAt time.Time `json:"created_at"`
}

type CustomItem struct {
	ID        string  `json:"id"`
	TrekCode  string  `json:"trek_code"`
	TrekkerID string  `json:"trekker_id"`
	Name      string  `json:"name"`
	Category  *string `json:"category,omitempty"`
}

// ChecklistItem is the embedded static item definition
type ChecklistItem struct {
	Type     string            `json:"type"` // "category" or "item"
	Name     string            `json:"name"`
	Category *string           `json:"category,omitempty"`
	Filters  map[string]string `json:"filters"`
}
