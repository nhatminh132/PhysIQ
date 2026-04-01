-- Add updated_at column to license_quiz_sets
ALTER TABLE license_quiz_sets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Also add timestamps to quiz_sets if missing
ALTER TABLE quiz_sets ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE quiz_sets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
