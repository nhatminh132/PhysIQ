-- Migration: Thêm bảng license_users cho danh sách user chi tiết
-- Chạy trong Supabase SQL Editor

-- Tạo bảng license_users
CREATE TABLE IF NOT EXISTS license_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID REFERENCES licenses(id) ON DELETE CASCADE,
  instance_id VARCHAR(128) NOT NULL,
  display_name VARCHAR(255),
  ip_address INET,
  ip_country VARCHAR(10),
  ip_city VARCHAR(100),
  browser VARCHAR(100),
  browser_version VARCHAR(50),
  os VARCHAR(100),
  os_version VARCHAR(50),
  device_type VARCHAR(50),
  domain VARCHAR(255),
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  total_sessions INT DEFAULT 0,
  last_session_duration INT,
  last_country VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  UNIQUE(license_id, instance_id)
);

CREATE INDEX IF NOT EXISTS idx_license_users_license ON license_users(license_id);
CREATE INDEX IF NOT EXISTS idx_license_users_instance ON license_users(instance_id);
CREATE INDEX IF NOT EXISTS idx_license_users_active ON license_users(license_id, is_active);

-- Enable RLS
ALTER TABLE license_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only for license_users" ON license_users
  FOR ALL USING (auth.role() = 'service_role');

-- Backup: Nếu bảng clients đã có data, migrate sang license_users
INSERT INTO license_users (license_id, instance_id, ip_address, domain, first_seen_at, last_seen_at, is_active)
SELECT license_id, instance_id, ip_address, domain, first_seen_at, last_seen_at, is_active
FROM clients
WHERE license_id IS NOT NULL
ON CONFLICT (license_id, instance_id) DO NOTHING;
