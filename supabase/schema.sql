-- ============================================================
-- PhysIQ Database Schema cho Supabase
-- Chạy script này trong SQL Editor của Supabase Dashboard
-- ============================================================

-- 1. Bảng licenses - Lưu trữ license key
CREATE TABLE IF NOT EXISTS licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key VARCHAR(64) UNIQUE NOT NULL,
  owner_name VARCHAR(255),
  owner_email VARCHAR(255),
  domain VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired', 'pending')),
  max_activations INT DEFAULT 1,
  activation_count INT DEFAULT 0,
  expires_at TIMESTAMPTZ,
  last_checkin TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Index cho license_key
CREATE INDEX IF NOT EXISTS idx_licenses_key ON licenses(license_key);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);

-- 2. Bảng clients - Theo dõi các instance đã kích hoạt
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID REFERENCES licenses(id) ON DELETE CASCADE,
  instance_id VARCHAR(128) UNIQUE NOT NULL,
  domain VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_clients_license ON clients(license_id);
CREATE INDEX IF NOT EXISTS idx_clients_instance ON clients(instance_id);

-- 3. Bảng questions - Lưu câu hỏi quiz
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_index INT NOT NULL CHECK (correct_index >= 0 AND correct_index <= 3),
  difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  phase VARCHAR(50),
  explanation TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_active ON questions(is_active);

-- 4. Bảng quiz_attempts - Lưu kết quả quiz
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID REFERENCES licenses(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  score INT NOT NULL,
  total_questions INT NOT NULL,
  details JSONB DEFAULT '[]',
  time_taken_seconds INT,
  difficulty_breakdown JSONB,
  rating VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attempts_license ON quiz_attempts(license_id);
CREATE INDEX IF NOT EXISTS idx_attempts_client ON quiz_attempts(client_id);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

-- Bật RLS cho tất cả bảng
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Licenses: Chỉ service role mới truy cập được (API key bảo mật)
CREATE POLICY "Service role only for licenses" ON licenses
  FOR ALL USING (auth.role() = 'service_role');

-- Clients: Service role only
CREATE POLICY "Service role only for clients" ON clients
  FOR ALL USING (auth.role() = 'service_role');

-- Questions: Cho phép đọc với API key (anon), chỉ service role mới sửa
CREATE POLICY "Public read questions" ON questions
  FOR SELECT USING (true);

CREATE POLICY "Service role modify questions" ON questions
  FOR ALL USING (auth.role() = 'service_role');

-- Quiz attempts: Chỉ service role
CREATE POLICY "Service role only for attempts" ON quiz_attempts
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- Functions & Triggers
-- ============================================================

-- Auto update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER licenses_updated_at
  BEFORE UPDATE ON licenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function để revoke license
CREATE OR REPLACE FUNCTION revoke_license(
  p_license_key VARCHAR,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE licenses
  SET status = 'revoked',
      revoked_at = NOW(),
      revoked_reason = p_reason
  WHERE license_key = p_license_key
    AND status = 'active';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function để checkin license
CREATE OR REPLACE FUNCTION license_checkin(
  p_license_key VARCHAR,
  p_instance_id VARCHAR,
  p_domain VARCHAR DEFAULT NULL,
  p_ip INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS JSONB AS $$
DECLARE
  v_license licenses%ROWTYPE;
  v_client clients%ROWTYPE;
  v_result JSONB;
BEGIN
  SELECT * INTO v_license FROM licenses WHERE license_key = p_license_key;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'LICENSE_NOT_FOUND',
      'message', 'License key không tồn tại'
    );
  END IF;

  IF v_license.status != 'active' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'LICENSE_INVALID',
      'status', v_license.status,
      'message', 'License đã bị vô hiệu hóa',
      'revoked_at', v_license.revoked_at,
      'revoked_reason', v_license.revoked_reason
    );
  END IF;

  IF v_license.expires_at IS NOT NULL AND v_license.expires_at < NOW() THEN
    UPDATE licenses SET status = 'expired' WHERE id = v_license.id;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'LICENSE_EXPIRED',
      'message', 'License đã hết hạn'
    );
  END IF;

  SELECT * INTO v_client FROM clients WHERE instance_id = p_instance_id;

  IF NOT FOUND THEN
    IF v_license.activation_count >= v_license.max_activations THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'MAX_ACTIVATIONS_REACHED',
        'message', 'Đã đạt số lượng kích hoạt tối đa'
      );
    END IF;

    INSERT INTO clients (license_id, instance_id, domain, ip_address, user_agent, metadata)
    VALUES (v_license.id, p_instance_id, p_domain, p_ip, p_user_agent, p_metadata);

    UPDATE licenses SET activation_count = activation_count + 1, last_checkin = NOW()
    WHERE id = v_license.id;
  ELSE
    IF v_client.license_id != v_license.id THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'INSTANCE_MISMATCH',
        'message', 'Instance không thuộc license này'
      );
    END IF;

    UPDATE clients SET last_seen_at = NOW() WHERE id = v_client.id;
    UPDATE licenses SET last_checkin = NOW() WHERE id = v_license.id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'license_key', v_license.license_key,
    'owner_name', v_license.owner_name,
    'expires_at', v_license.expires_at,
    'metadata', v_license.metadata
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Seed: Import câu hỏi mẫu
-- ============================================================

INSERT INTO questions (question_text, options, correct_index, difficulty, phase) VALUES
-- Easy
('Vận tốc là gì?', '["Quãng đường đi được trong một đơn vị thời gian", "Gia tốc trên thời gian", "Lực tác động lên vật", "Năng lượng của vật"]', 0, 'easy', 'Cơ bản'),
('Định luật Newton thứ nhất nói gì?', '["Vật sẽ giữ nguyên trạng thái nếu không có lực tác dụng", "Lực bằng khối lượng nhân gia tốc", "Lực tác dụng bằng lực phản lực", "Vật luôn chuyển động"]', 0, 'easy', 'Cơ bản'),
('Đơn vị của lực là gì?', '["Newton", "Joule", "Watt", "Pascal"]', 0, 'easy', 'Cơ bản'),
('Năng lượng động học phụ thuộc vào gì?', '["Khối lượng và vận tốc", "Chỉ khối lượng", "Chỉ vận tốc", "Gia tốc"]', 0, 'easy', 'Cơ bản'),
('Trọng lực tác dụng lên vật có phương như thế nào?', '["Hướng xuống dưới (về tâm Trái Đất)", "Hướng lên trên", "Ngang theo chiều chuyển động", "Theo phương ngang"]', 0, 'easy', 'Cơ bản'),
('Gia tốc rơi tự do trên Trái Đất bằng bao nhiêu?', '["10 m/s²", "20 m/s²", "5 m/s²", "15 m/s²"]', 0, 'easy', 'Cơ bản'),
('Công cơ học được tính theo công thức nào?', '["W = F × s × cos(θ)", "W = m × v", "W = a × t", "W = F / t"]', 0, 'easy', 'Cơ bản'),
('Chuyển động thẳng đều có đặc điểm nào?', '["Vận tốc không đổi", "Gia tốc không đổi", "Lực tác dụng lên vật lớn", "Vật có gia tốc dương"]', 0, 'easy', 'Cơ bản'),
('Áp suất được định nghĩa là gì?', '["Lực trên một đơn vị diện tích", "Lực nhân diện tích", "Lực chia thời gian", "Khối lượng trên diện tích"]', 0, 'easy', 'Cơ bản'),
('Động lượng là gì?', '["Tích của khối lượng và vận tốc", "Chia khối lượng cho vận tốc", "Lực chia thời gian", "Gia tốc nhân khối lượng"]', 0, 'easy', 'Cơ bản'),

-- Medium
('Công thức tính thế năng trọng trường là gì?', '["Ep = mgh", "Ep = ½mv²", "Ep = F × d", "Ep = v²/g"]', 0, 'medium', 'Trung bình'),
('Định luật bảo toàn năng lượng cơ học nói rằng', '["Tổng năng lượng động học và thế năng không đổi", "Năng lượng luôn tăng", "Năng lượng luôn giảm", "Không có sự bảo toàn năng lượng"]', 0, 'medium', 'Trung bình'),
('Momen lực được tính như thế nào?', '["M = F × d (d là cánh tay đòn)", "M = F / d", "M = F × v", "M = F + d"]', 0, 'medium', 'Trung bình'),
('Chuyển động tròn đều có tốc độ như thế nào?', '["Tốc độ không đổi nhưng vận tốc thay đổi", "Cả tốc độ và vận tốc không đổi", "Tốc độ thay đổi", "Vật không có gia tốc"]', 0, 'medium', 'Trung bình'),
('Gia tốc hướng tâm trong chuyển động tròn đều bằng', '["a = v²/r", "a = v × r", "a = v/r", "a = r/v"]', 0, 'medium', 'Trung bình'),
('Công tố của lò xo được tính bằng', '["Ep = ½kx²", "Ep = kx", "Ep = k/x²", "Ep = x²/k"]', 0, 'medium', 'Trung bình'),
('Sóng cơ học là gì?', '["Sự lan truyền dao động trong môi trường", "Chuyển động của các hạt vật chất", "Một loại năng lượng điện", "Ánh sáng di chuyển"]', 0, 'medium', 'Trung bình'),
('Tần số sóng và bước sóng có mối liên hệ gì?', '["v = λ × f (v là vận tốc sóng)", "v = λ / f", "v = f / λ", "f = λ + v"]', 0, 'medium', 'Trung bình'),
('Định luật Hooke nói rằng', '["Lực đàn hồi tỉ lệ với độ biến dạng", "Lực tỉ lệ với vận tốc", "Lực tỉ lệ với khối lượng", "Lực không phụ thuộc vào gì"]', 0, 'medium', 'Trung bình'),
('Hiệu suất cơ học được định nghĩa là', '["Tỉ số giữa công có ích và công toàn phần", "Công toàn phần chia công có ích", "Tổng của tất cả các công", "Lực chia vận tốc"]', 0, 'medium', 'Trung bình'),

-- Hard
('Trong chuyển động của hành tinh, điều nào là đúng?', '["Quỹ đạo elip, tốc độ không đều theo quỹ đạo", "Quỹ đạo tròn, tốc độ đều", "Quỹ đạo parabol", "Tốc độ luôn tăng"]', 0, 'hard', 'Nâng cao'),
('Định luật bảo toàn động lượng áp dụng khi nào?', '["Không có lực ngoài tác dụng hoặc lực ngoài cân bằng", "Lực ngoài luôn tác dụng", "Khi vật đứng yên", "Khi gia tốc bằng không"]', 0, 'hard', 'Nâng cao'),
('Hiệu ứng Doppler xảy ra khi nào?', '["Nguồn sóng và quan sát viên chuyển động tương đối", "Sóng di chuyển thẳng", "Không có chuyển động", "Sóng ngừng lan truyền"]', 0, 'hard', 'Nâng cao'),
('Cơ năng của hệ bảo toàn khi nào?', '["Chỉ lực bảo toàn (như trọng lực) tác dụng", "Có ma sát", "Vật chuyển động nhanh", "Vật chuyển động chậm"]', 0, 'hard', 'Nâng cao'),
('Phương trình dao động điều hòa là gì?', '["x = A × cos(ωt + φ)", "x = A × sin(t)", "x = t²", "x = A + t"]', 0, 'hard', 'Nâng cao'),
('Khối tâm của hệ là gì?', '["Điểm mà toàn bộ khối lượng tập trung", "Trung điểm hình học", "Điểm cao nhất", "Điểm thấp nhất"]', 0, 'hard', 'Nâng cao'),
('Mối liên hệ giữa lực và động lượng là gì?', '["F = dp/dt (p là động lượng)", "F = m × v", "F = a/m", "F = v²/r"]', 0, 'hard', 'Nâng cao'),
('Công suất được định nghĩa là', '["Công thực hiện trong một đơn vị thời gian", "Công nhân lực", "Lực chia vận tốc", "Khối lượng nhân gia tốc"]', 0, 'hard', 'Nâng cao'),
('Hai vật va chạm không đàn hồi có đặc điểm gì?', '["Sau va chạm chúng chuyển động cùng nhau", "Động năng được bảo toàn hoàn toàn", "Không mất năng lượng", "Lực bằng không"]', 0, 'hard', 'Nâng cao'),
('Moment quán tính phụ thuộc vào gì?', '["Khối lượng và khoảng cách từ trục quay", "Chỉ khối lượng", "Chỉ vận tốc góc", "Lực tác dụng"]', 0, 'hard', 'Nâng cao');
