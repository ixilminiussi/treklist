CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  birthday      TEXT,
  weight_kg     REAL,
  sex           TEXT CHECK(sex IN ('M','F','X')),
  gender        TEXT,
  color         TEXT NOT NULL DEFAULT '#4f9cf9',
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS treks (
  code        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  trek_type   TEXT NOT NULL,
  food_source TEXT NOT NULL DEFAULT '',
  camping     TEXT NOT NULL DEFAULT '',
  weather     TEXT NOT NULL DEFAULT '',
  temperature TEXT NOT NULL DEFAULT '',
  creator_id  TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','archived')),
  created_at  TEXT NOT NULL,
  closed_at   TEXT
);

CREATE TABLE IF NOT EXISTS trekkers (
  id            TEXT PRIMARY KEY,
  trek_code     TEXT NOT NULL REFERENCES treks(code),
  user_id       TEXT REFERENCES users(id),
  guest_name    TEXT,
  session_token TEXT NOT NULL UNIQUE,
  color         TEXT NOT NULL DEFAULT '#4f9cf9',
  joined_at     TEXT NOT NULL,
  kicked_at     TEXT
);

CREATE INDEX IF NOT EXISTS idx_trekkers_trek ON trekkers(trek_code);
CREATE INDEX IF NOT EXISTS idx_trekkers_token ON trekkers(session_token);

CREATE TABLE IF NOT EXISTS item_statuses (
  trekker_id TEXT NOT NULL REFERENCES trekkers(id),
  item_name  TEXT NOT NULL,
  status     TEXT NOT NULL CHECK(status IN ('need','will_get','got_it','provided','shared','dont_need')),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (trekker_id, item_name)
);

CREATE TABLE IF NOT EXISTS item_provisions (
  id         TEXT PRIMARY KEY,
  trekker_id TEXT NOT NULL REFERENCES trekkers(id),
  item_name  TEXT NOT NULL,
  type       TEXT NOT NULL CHECK(type IN ('provided','shared')),
  quantity   INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_provisions_trekker ON item_provisions(trekker_id, item_name);

CREATE TABLE IF NOT EXISTS provision_claims (
  id           TEXT PRIMARY KEY,
  provision_id TEXT NOT NULL REFERENCES item_provisions(id) ON DELETE CASCADE,
  claimed_by   TEXT NOT NULL REFERENCES trekkers(id),
  UNIQUE(provision_id, claimed_by)
);

CREATE TABLE IF NOT EXISTS item_weights (
  item_name     TEXT PRIMARY KEY,
  default_grams REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS trekker_weights (
  trekker_id   TEXT NOT NULL REFERENCES trekkers(id),
  item_name    TEXT NOT NULL,
  custom_grams REAL NOT NULL,
  PRIMARY KEY (trekker_id, item_name)
);

CREATE TABLE IF NOT EXISTS annotations (
  id         TEXT PRIMARY KEY,
  trekker_id TEXT NOT NULL REFERENCES trekkers(id),
  item_name  TEXT NOT NULL,
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS custom_items (
  id         TEXT PRIMARY KEY,
  trek_code  TEXT NOT NULL REFERENCES treks(code),
  trekker_id TEXT NOT NULL REFERENCES trekkers(id),
  name       TEXT NOT NULL,
  category   TEXT
);
