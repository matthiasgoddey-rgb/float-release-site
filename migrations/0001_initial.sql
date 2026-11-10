PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS daily_metrics (
  day TEXT NOT NULL,
  event TEXT NOT NULL CHECK (event IN ('page_view', 'cta_click', 'engaged_time', 'download_response')),
  page TEXT NOT NULL DEFAULT '',
  item TEXT NOT NULL DEFAULT '',
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  seconds INTEGER NOT NULL DEFAULT 0 CHECK (seconds >= 0),
  PRIMARY KEY (day, event, page, item)
);

CREATE INDEX IF NOT EXISTS daily_metrics_day_idx ON daily_metrics(day);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  display_name TEXT NOT NULL DEFAULT 'Floater Typist user',
  review_text TEXT NOT NULL CHECK (length(review_text) BETWEEN 1 AND 1200),
  publish_consent INTEGER NOT NULL DEFAULT 0 CHECK (publish_consent IN (0, 1)),
  deletion_token_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'hidden')),
  submitted_at TEXT NOT NULL,
  moderated_at TEXT,
  moderator TEXT
);

CREATE INDEX IF NOT EXISTS reviews_status_submitted_idx ON reviews(status, submitted_at DESC);

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('announcement', 'release', 'sponsored')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'live', 'archived')),
  eyebrow TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  quote_text TEXT NOT NULL DEFAULT '',
  quote_attribution TEXT NOT NULL DEFAULT '',
  quote_source TEXT NOT NULL DEFAULT '',
  quote_permission TEXT NOT NULL DEFAULT '',
  cta_label TEXT NOT NULL DEFAULT '',
  cta_url TEXT NOT NULL DEFAULT '',
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  placement TEXT NOT NULL DEFAULT 'banner' CHECK (placement IN ('banner', 'page', 'both')),
  priority INTEGER NOT NULL DEFAULT 0 CHECK (priority BETWEEN -100 AND 100),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS announcements_status_placement_idx ON announcements(status, placement, starts_at, ends_at, priority DESC);

CREATE TABLE IF NOT EXISTS admin_audit (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  item_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  occurred_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_audit_occurred_at_idx ON admin_audit(occurred_at DESC);

