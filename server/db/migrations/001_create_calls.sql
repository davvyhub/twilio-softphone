CREATE TABLE IF NOT EXISTS calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  call_sid TEXT UNIQUE NOT NULL,
  direction TEXT NOT NULL CHECK(direction IN ('inbound', 'outbound')),
  status TEXT NOT NULL DEFAULT 'initiated',
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  contact_name TEXT,
  duration_sec INTEGER DEFAULT 0,
  started_at DATETIME,
  ended_at DATETIME,
  recording_url TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at);
CREATE INDEX IF NOT EXISTS idx_calls_from_number ON calls(from_number);
