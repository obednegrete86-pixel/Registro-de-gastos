CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  username VARCHAR(32) NOT NULL,
  expense_type VARCHAR(64) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  amount INTEGER NOT NULL CHECK (amount >= 0),
  spent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_spent_at ON expenses (spent_at);
CREATE INDEX IF NOT EXISTS idx_expenses_username ON expenses (username);
