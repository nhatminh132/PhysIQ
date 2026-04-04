-- Add custom_config to licenses for custom backgrounds and button colors
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS custom_config JSONB DEFAULT '{"backgrounds": [], "button_color": ""}';
