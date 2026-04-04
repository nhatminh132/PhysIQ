-- Update button color for the special license
UPDATE licenses 
SET custom_config = '{
  "backgrounds": [
    "https://mxtgjrjfchgbffimqwdr.supabase.co/storage/v1/object/public/Images/1.png",
    "https://mxtgjrjfchgbffimqwdr.supabase.co/storage/v1/object/public/Images/2.png",
    "https://mxtgjrjfchgbffimqwdr.supabase.co/storage/v1/object/public/Images/3.png",
    "https://mxtgjrjfchgbffimqwdr.supabase.co/storage/v1/object/public/Images/4.png",
    "https://mxtgjrjfchgbffimqwdr.supabase.co/storage/v1/object/public/Images/5.png",
    "https://mxtgjrjfchgbffimqwdr.supabase.co/storage/v1/object/public/Images/6.png"
  ],
  "button_color": "#A0C4FF"
}'
WHERE license_key = 'PHY-QRN34GPH8S1FQOMDL5KA1QLK';
