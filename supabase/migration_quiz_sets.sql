-- Migration: Quiz Sets - Mỗi license có bộ câu hỏi riêng
-- Chạy trong Supabase SQL Editor

-- Tạo bảng quiz_sets
CREATE TABLE IF NOT EXISTS quiz_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  subject VARCHAR(100),
  grade VARCHAR(50),
  question_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_sets_active ON quiz_sets(is_active);

-- Bảng trung gian license - quiz_set
CREATE TABLE IF NOT EXISTS license_quiz_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID REFERENCES licenses(id) ON DELETE CASCADE,
  quiz_set_id UUID REFERENCES quiz_sets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(license_id)
);

CREATE INDEX IF NOT EXISTS idx_lqs_license ON license_quiz_sets(license_id);
CREATE INDEX IF NOT EXISTS idx_lqs_quiz_set ON license_quiz_sets(quiz_set_id);

-- Thêm quiz_set_id vào questions để lọc
ALTER TABLE questions ADD COLUMN IF NOT EXISTS quiz_set_id UUID REFERENCES quiz_sets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_questions_quiz_set ON questions(quiz_set_id);

-- RLS
ALTER TABLE quiz_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_quiz_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Policy: Service role only
CREATE POLICY "Service role quiz_sets" ON quiz_sets FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role license_quiz_sets" ON license_quiz_sets FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role questions update" ON questions FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Public read questions" ON questions;
CREATE POLICY "Public read questions" ON questions FOR SELECT USING (true);

-- Tạo quiz set mặc định
INSERT INTO quiz_sets (id, name, description, subject, grade, question_count) 
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Vật Lý 10 - Cơ bản', '30 câu hỏi Vật Lý lớp 10', 'Vật Lý', 'Lớp 10', 30)
ON CONFLICT DO NOTHING;

-- Gán tất cả câu hỏi hiện tại vào quiz set mặc định
UPDATE questions SET quiz_set_id = '00000000-0000-0000-0000-000000000001' WHERE quiz_set_id IS NULL;
