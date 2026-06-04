-- ============================================================================
-- SafeShift Comprehensive Seed Data
-- DEVTrails 2026 Hackathon Demo
-- Run AFTER all migrations. Requires pgcrypto extension for crypt/gen_salt.
-- ============================================================================

-- ============================================================================
-- SECTION 0: Clean Slate
-- Delete in reverse FK order. Do NOT delete plan_packages.
-- ============================================================================

DELETE FROM payout_ledger;
DELETE FROM coins_ledger;
DELETE FROM vehicle_asset_locks;
DELETE FROM driver_activity_logs;
DELETE FROM parametric_claims;
DELETE FROM premium_recommendations;
DELETE FROM weekly_policies;
DELETE FROM live_disruption_events;
DELETE FROM payment_transactions;
DELETE FROM razorpay_payment_events;
DELETE FROM parametric_trigger_ledger;
DELETE FROM system_logs;
DELETE FROM profiles;
DELETE FROM auth.users;

-- ============================================================================
-- SECTION 1: auth.users
-- The handle_new_user trigger will auto-create profiles rows.
-- ============================================================================

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES
(
  'aaaaaaaa-1111-1111-1111-111111111111'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated',
  'rajesh@safeshift.app',
  crypt('password123', gen_salt('bf')),
  NOW(),
  '{"full_name": "Rajesh Kumar"}'::jsonb,
  '2025-12-20 10:00:00+05:30'::timestamptz, NOW(),
  '', '', '', ''
),
(
  'aaaaaaaa-2222-2222-2222-222222222222'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated',
  'priya@safeshift.app',
  crypt('password123', gen_salt('bf')),
  NOW(),
  '{"full_name": "Priya Sharma"}'::jsonb,
  '2026-02-15 10:00:00+05:30'::timestamptz, NOW(),
  '', '', '', ''
),
(
  'aaaaaaaa-3333-3333-3333-333333333333'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated',
  'suresh@safeshift.app',
  crypt('password123', gen_salt('bf')),
  NOW(),
  '{"full_name": "Suresh Patel"}'::jsonb,
  '2026-03-20 10:00:00+05:30'::timestamptz, NOW(),
  '', '', '', ''
),
(
  'aaaaaaaa-4444-4444-4444-444444444444'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated',
  'meera@safeshift.app',
  crypt('password123', gen_salt('bf')),
  NOW(),
  '{"full_name": "Meera Iyer"}'::jsonb,
  '2026-01-25 10:00:00+05:30'::timestamptz, NOW(),
  '', '', '', ''
),
(
  'aaaaaaaa-5555-5555-5555-555555555555'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated',
  'amit@safeshift.app',
  crypt('password123', gen_salt('bf')),
  NOW(),
  '{"full_name": "Amit Deshmukh"}'::jsonb,
  '2026-03-01 10:00:00+05:30'::timestamptz, NOW(),
  '', '', '', ''
),
(
  'aaaaaaaa-6666-6666-6666-666666666666'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated',
  'lakshmi@safeshift.app',
  crypt('password123', gen_salt('bf')),
  NOW(),
  '{"full_name": "Lakshmi Reddy"}'::jsonb,
  '2026-03-10 10:00:00+05:30'::timestamptz, NOW(),
  '', '', '', ''
),
(
  'aaaaaaaa-7777-7777-7777-777777777777'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated',
  'vikram@safeshift.app',
  crypt('password123', gen_salt('bf')),
  NOW(),
  '{"full_name": "Vikram Das"}'::jsonb,
  '2026-02-20 10:00:00+05:30'::timestamptz, NOW(),
  '', '', '', ''
),
(
  'aaaaaaaa-8888-8888-8888-888888888888'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated',
  'admin@safeshift.app',
  crypt('password123', gen_salt('bf')),
  NOW(),
  '{"full_name": "SafeShift Admin"}'::jsonb,
  '2025-12-01 10:00:00+05:30'::timestamptz, NOW(),
  '', '', '', ''
);

-- ============================================================================
-- SECTION 2: UPDATE profiles
-- The trigger auto-created rows. Now update each with full details.
-- ============================================================================

-- Rajesh Kumar - Mumbai, high tier, veteran driver
UPDATE profiles SET
  phone_number     = '919876543210',
  language         = 'hi',
  aadhaar_verified = true,
  aadhaar_hash     = md5('AADHAAR-RAJESH'),
  dl_number        = 'MH0120210012345',
  dl_verified      = true,
  rc_number        = 'MH01AB1234',
  rc_verified      = true,
  vehicle_hash     = md5('VIN-1'),
  upi_id           = 'rajesh@upi',
  upi_verified     = true,
  city             = 'mumbai',
  zone_latitude    = 19.065000,
  zone_longitude   = 72.895000,
  onboarding_status = 'complete',
  role             = 'driver',
  trust_score      = 0.92,
  referral_code    = 'RAJESH01',
  auto_renew_enabled = true
WHERE id = 'aaaaaaaa-1111-1111-1111-111111111111';

-- Priya Sharma - Delhi, medium tier
UPDATE profiles SET
  phone_number     = '919876543211',
  language         = 'hi',
  aadhaar_verified = true,
  aadhaar_hash     = md5('AADHAAR-PRIYA'),
  dl_number        = 'DL0620200067890',
  dl_verified      = true,
  rc_number        = 'DL06CD5678',
  rc_verified      = true,
  vehicle_hash     = md5('VIN-2'),
  upi_id           = 'priya@upi',
  upi_verified     = true,
  city             = 'delhi',
  zone_latitude    = 28.647000,
  zone_longitude   = 77.316000,
  onboarding_status = 'complete',
  role             = 'driver',
  trust_score      = 0.75,
  referral_code    = 'PRIYA002',
  auto_renew_enabled = true
WHERE id = 'aaaaaaaa-2222-2222-2222-222222222222';

-- Suresh Patel - Bangalore, normal tier (referred by Rajesh)
UPDATE profiles SET
  phone_number     = '919876543212',
  language         = 'en',
  aadhaar_verified = true,
  aadhaar_hash     = md5('AADHAAR-SURESH'),
  dl_number        = 'KA0120190034567',
  dl_verified      = true,
  rc_number        = 'KA01EF9012',
  rc_verified      = true,
  vehicle_hash     = md5('VIN-3'),
  upi_id           = 'suresh@upi',
  upi_verified     = true,
  city             = 'bangalore',
  zone_latitude    = 12.970000,
  zone_longitude   = 77.750000,
  onboarding_status = 'complete',
  role             = 'driver',
  trust_score      = 0.50,
  referral_code    = 'SURESH03',
  referred_by      = 'aaaaaaaa-1111-1111-1111-111111111111',
  auto_renew_enabled = false
WHERE id = 'aaaaaaaa-3333-3333-3333-333333333333';

-- Meera Iyer - Chennai, high tier
UPDATE profiles SET
  phone_number     = '919876543213',
  language         = 'ta',
  aadhaar_verified = true,
  aadhaar_hash     = md5('AADHAAR-MEERA'),
  dl_number        = 'TN0920200045678',
  dl_verified      = true,
  rc_number        = 'TN09GH3456',
  rc_verified      = true,
  vehicle_hash     = md5('VIN-4'),
  upi_id           = 'meera@upi',
  upi_verified     = true,
  city             = 'chennai',
  zone_latitude    = 12.978000,
  zone_longitude   = 80.218000,
  onboarding_status = 'complete',
  role             = 'driver',
  trust_score      = 0.85,
  referral_code    = 'MEERA004',
  auto_renew_enabled = true
WHERE id = 'aaaaaaaa-4444-4444-4444-444444444444';

-- Amit Deshmukh - Pune, medium tier (referred by Rajesh)
UPDATE profiles SET
  phone_number     = '919876543214',
  language         = 'mr',
  aadhaar_verified = true,
  aadhaar_hash     = md5('AADHAAR-AMIT'),
  dl_number        = 'MH1220210056789',
  dl_verified      = true,
  rc_number        = 'MH12IJ7890',
  rc_verified      = true,
  vehicle_hash     = md5('VIN-5'),
  upi_id           = 'amit@upi',
  upi_verified     = true,
  city             = 'pune',
  zone_latitude    = 18.458000,
  zone_longitude   = 73.868000,
  onboarding_status = 'complete',
  role             = 'driver',
  trust_score      = 0.65,
  referral_code    = 'AMIT0005',
  referred_by      = 'aaaaaaaa-1111-1111-1111-111111111111',
  auto_renew_enabled = false
WHERE id = 'aaaaaaaa-5555-5555-5555-555555555555';

-- Lakshmi Reddy - Hyderabad, normal tier
UPDATE profiles SET
  phone_number     = '919876543215',
  language         = 'te',
  aadhaar_verified = true,
  aadhaar_hash     = md5('AADHAAR-LAKSHMI'),
  dl_number        = 'TS0720200067890',
  dl_verified      = true,
  rc_number        = 'TS07KL1234',
  rc_verified      = true,
  vehicle_hash     = md5('VIN-6'),
  upi_id           = 'lakshmi@upi',
  upi_verified     = true,
  city             = 'hyderabad',
  zone_latitude    = 17.440000,
  zone_longitude   = 78.349000,
  onboarding_status = 'complete',
  role             = 'driver',
  trust_score      = 0.55,
  referral_code    = 'LAKSHM06',
  auto_renew_enabled = false
WHERE id = 'aaaaaaaa-6666-6666-6666-666666666666';

-- Vikram Das - Kolkata, high tier
UPDATE profiles SET
  phone_number     = '919876543216',
  language         = 'hi',
  aadhaar_verified = true,
  aadhaar_hash     = md5('AADHAAR-VIKRAM'),
  dl_number        = 'WB0620200078901',
  dl_verified      = true,
  rc_number        = 'WB06MN5678',
  rc_verified      = true,
  vehicle_hash     = md5('VIN-7'),
  upi_id           = 'vikram@upi',
  upi_verified     = true,
  city             = 'kolkata',
  zone_latitude    = 22.500000,
  zone_longitude   = 88.330000,
  onboarding_status = 'complete',
  role             = 'driver',
  trust_score      = 0.30,
  referral_code    = 'VIKRAM07',
  auto_renew_enabled = false
WHERE id = 'aaaaaaaa-7777-7777-7777-777777777777';

-- SafeShift Admin - Mumbai
UPDATE profiles SET
  phone_number     = '919876543200',
  language         = 'en',
  aadhaar_verified = true,
  aadhaar_hash     = md5('AADHAAR-ADMIN'),
  dl_number        = 'ADMIN000000000',
  dl_verified      = true,
  rc_number        = 'ADMIN00000',
  rc_verified      = true,
  vehicle_hash     = md5('VIN-ADMIN'),
  upi_id           = 'admin@upi',
  upi_verified     = true,
  city             = 'mumbai',
  zone_latitude    = 19.076000,
  zone_longitude   = 72.878000,
  onboarding_status = 'complete',
  role             = 'admin',
  trust_score      = 1.00,
  referral_code    = 'ADMIN008',
  auto_renew_enabled = false
WHERE id = 'aaaaaaaa-8888-8888-8888-888888888888';

-- ============================================================================
-- SECTION 3: Disruption Events (21 events)
-- Week schedule:
--   Week 1:  2026-01-12 to 2026-01-18
--   Week 2:  2026-01-19 to 2026-01-25
--   Week 3:  2026-01-26 to 2026-02-01
--   Week 4:  2026-02-02 to 2026-02-08
--   Week 5:  2026-02-09 to 2026-02-15
--   Week 6:  2026-02-16 to 2026-02-22
--   Week 7:  2026-02-23 to 2026-03-01
--   Week 8:  2026-03-02 to 2026-03-08
--   Week 9:  2026-03-09 to 2026-03-15
--   Week 10: 2026-03-16 to 2026-03-22
--   Week 11: 2026-03-23 to 2026-03-29
--   Week 12: 2026-03-30 to 2026-04-05
-- Event created_at = varied times of day (morning/afternoon/evening IST)
-- ============================================================================

INSERT INTO live_disruption_events (
  id, event_type, severity_score, city,
  zone_latitude, zone_longitude, geofence_radius_km,
  trigger_value, trigger_threshold,
  verified_by_api, verified_by_llm,
  raw_api_data, data_sources, rule_version,
  resolved_at, created_at
) VALUES
-- E1: heavy_rainfall, mumbai, w2, resolved
(
  'cccccccc-0000-0000-0000-000000000001'::uuid,
  'heavy_rainfall', 7.5, 'mumbai',
  19.065000, 72.895000, 15.00,
  85.00, 65.00,
  true, false,
  '{"source": "openweathermap", "demo": true}'::jsonb,
  ARRAY['openweathermap', 'open-meteo'],
  '1.0',
  '2026-01-21 10:30:00+00'::timestamptz,
  '2026-01-21 02:30:00+00'::timestamptz
),
-- E2: heavy_rainfall, mumbai, w4, resolved
(
  'cccccccc-0000-0000-0000-000000000002'::uuid,
  'heavy_rainfall', 8.2, 'mumbai',
  19.065000, 72.895000, 15.00,
  110.00, 65.00,
  true, false,
  '{"source": "openweathermap", "demo": true}'::jsonb,
  ARRAY['openweathermap', 'open-meteo'],
  '1.0',
  '2026-02-04 17:00:00+00'::timestamptz,
  '2026-02-04 09:00:00+00'::timestamptz
),
-- E3: heavy_rainfall, mumbai, w7, resolved
(
  'cccccccc-0000-0000-0000-000000000003'::uuid,
  'heavy_rainfall', 6.5, 'mumbai',
  19.065000, 72.895000, 15.00,
  72.00, 65.00,
  true, false,
  '{"source": "openweathermap", "demo": true}'::jsonb,
  ARRAY['openweathermap', 'open-meteo'],
  '1.0',
  '2026-02-25 21:00:00+00'::timestamptz,
  '2026-02-25 13:00:00+00'::timestamptz
),
-- E4: heavy_rainfall, mumbai, w11, resolved
(
  'cccccccc-0000-0000-0000-000000000004'::uuid,
  'heavy_rainfall', 7.8, 'mumbai',
  19.065000, 72.895000, 15.00,
  95.00, 65.00,
  true, false,
  '{"source": "openweathermap", "demo": true}'::jsonb,
  ARRAY['openweathermap', 'open-meteo'],
  '1.0',
  '2026-03-25 09:30:00+00'::timestamptz,
  '2026-03-25 01:30:00+00'::timestamptz
),
-- E5: aqi_grap_iv, delhi, w3, resolved
(
  'cccccccc-0000-0000-0000-000000000005'::uuid,
  'aqi_grap_iv', 8.0, 'delhi',
  28.647000, 77.316000, 20.00,
  475.00, 450.00,
  true, true,
  '{"source": "waqi", "demo": true}'::jsonb,
  ARRAY['waqi', 'openrouter-llm'],
  '1.0',
  '2026-01-28 17:30:00+00'::timestamptz,
  '2026-01-28 09:30:00+00'::timestamptz
),
-- E6: aqi_grap_iv, delhi, w6, resolved
(
  'cccccccc-0000-0000-0000-000000000006'::uuid,
  'aqi_grap_iv', 8.5, 'delhi',
  28.647000, 77.316000, 20.00,
  490.00, 450.00,
  true, true,
  '{"source": "waqi", "demo": true}'::jsonb,
  ARRAY['waqi', 'openrouter-llm'],
  '1.0',
  '2026-02-18 11:00:00+00'::timestamptz,
  '2026-02-18 03:00:00+00'::timestamptz
),
-- E7: aqi_grap_iv, delhi, w9, resolved
(
  'cccccccc-0000-0000-0000-000000000007'::uuid,
  'aqi_grap_iv', 7.8, 'delhi',
  28.647000, 77.316000, 20.00,
  460.00, 450.00,
  true, true,
  '{"source": "waqi", "demo": true}'::jsonb,
  ARRAY['waqi', 'openrouter-llm'],
  '1.0',
  '2026-03-11 21:30:00+00'::timestamptz,
  '2026-03-11 13:30:00+00'::timestamptz
),
-- E8: curfew_bandh, delhi, w10, resolved
(
  'cccccccc-0000-0000-0000-000000000008'::uuid,
  'curfew_bandh', 7.0, 'delhi',
  28.647000, 77.316000, 20.00,
  6.00, 4.00,
  true, true,
  '{"source": "newsdata", "demo": true}'::jsonb,
  ARRAY['newsdata', 'openrouter-llm'],
  '1.0',
  '2026-03-18 10:00:00+00'::timestamptz,
  '2026-03-18 02:00:00+00'::timestamptz
),
-- E9: cyclone, chennai, w5, resolved
(
  'cccccccc-0000-0000-0000-000000000009'::uuid,
  'cyclone', 9.2, 'chennai',
  12.978000, 80.218000, 25.00,
  120.00, 70.00,
  true, false,
  '{"source": "open-meteo", "demo": true}'::jsonb,
  ARRAY['open-meteo', 'openweathermap'],
  '1.0',
  '2026-02-11 18:00:00+00'::timestamptz,
  '2026-02-11 10:00:00+00'::timestamptz
),
-- E10: cyclone, chennai, w8, resolved
(
  'cccccccc-0000-0000-0000-000000000010'::uuid,
  'cyclone', 8.5, 'chennai',
  12.978000, 80.218000, 25.00,
  95.00, 70.00,
  true, false,
  '{"source": "open-meteo", "demo": true}'::jsonb,
  ARRAY['open-meteo', 'openweathermap'],
  '1.0',
  '2026-03-04 10:30:00+00'::timestamptz,
  '2026-03-04 02:30:00+00'::timestamptz
),
-- E11: heavy_rainfall, bangalore, w6, resolved
(
  'cccccccc-0000-0000-0000-000000000011'::uuid,
  'heavy_rainfall', 6.0, 'bangalore',
  12.970000, 77.750000, 15.00,
  70.00, 65.00,
  true, false,
  '{"source": "openweathermap", "demo": true}'::jsonb,
  ARRAY['openweathermap', 'open-meteo'],
  '1.0',
  '2026-02-18 22:00:00+00'::timestamptz,
  '2026-02-18 14:00:00+00'::timestamptz
),
-- E12: heavy_rainfall, bangalore, w11, resolved
(
  'cccccccc-0000-0000-0000-000000000012'::uuid,
  'heavy_rainfall', 6.8, 'bangalore',
  12.970000, 77.750000, 15.00,
  78.00, 65.00,
  true, false,
  '{"source": "openweathermap", "demo": true}'::jsonb,
  ARRAY['openweathermap', 'open-meteo'],
  '1.0',
  '2026-03-25 17:30:00+00'::timestamptz,
  '2026-03-25 09:30:00+00'::timestamptz
),
-- E13: heavy_rainfall, pune, w9, resolved
(
  'cccccccc-0000-0000-0000-000000000013'::uuid,
  'heavy_rainfall', 7.0, 'pune',
  18.458000, 73.868000, 15.00,
  80.00, 65.00,
  true, false,
  '{"source": "openweathermap", "demo": true}'::jsonb,
  ARRAY['openweathermap', 'open-meteo'],
  '1.0',
  '2026-03-11 11:00:00+00'::timestamptz,
  '2026-03-11 03:00:00+00'::timestamptz
),
-- E14: cyclone, kolkata, w7, resolved
(
  'cccccccc-0000-0000-0000-000000000014'::uuid,
  'cyclone', 8.0, 'kolkata',
  22.500000, 88.330000, 25.00,
  85.00, 70.00,
  true, false,
  '{"source": "open-meteo", "demo": true}'::jsonb,
  ARRAY['open-meteo', 'openweathermap'],
  '1.0',
  '2026-02-25 18:30:00+00'::timestamptz,
  '2026-02-25 10:30:00+00'::timestamptz
),
-- E15: heavy_rainfall, kolkata, w10, resolved
(
  'cccccccc-0000-0000-0000-000000000015'::uuid,
  'heavy_rainfall', 7.2, 'kolkata',
  22.500000, 88.330000, 15.00,
  82.00, 65.00,
  true, false,
  '{"source": "openweathermap", "demo": true}'::jsonb,
  ARRAY['openweathermap', 'open-meteo'],
  '1.0',
  '2026-03-18 21:00:00+00'::timestamptz,
  '2026-03-18 13:00:00+00'::timestamptz
),
-- E16: platform_outage, mumbai, w11, resolved
(
  'cccccccc-0000-0000-0000-000000000016'::uuid,
  'platform_outage', 6.0, 'mumbai',
  19.065000, 72.895000, 0.00,
  4.00, 3.00,
  true, false,
  '{"source": "statusgator-mock", "demo": true}'::jsonb,
  ARRAY['statusgator-mock'],
  '1.0',
  '2026-03-25 12:30:00+00'::timestamptz,
  '2026-03-25 04:30:00+00'::timestamptz
),
-- E17: heavy_rainfall, mumbai, w12, NOT resolved (active)
(
  'cccccccc-0000-0000-0000-000000000017'::uuid,
  'heavy_rainfall', 7.0, 'mumbai',
  19.065000, 72.895000, 15.00,
  75.00, 65.00,
  true, false,
  '{"source": "openweathermap", "demo": true}'::jsonb,
  ARRAY['openweathermap', 'open-meteo'],
  '1.0',
  NULL,
  '2026-04-02 10:12:00+00'::timestamptz
),
-- E18: aqi_grap_iv, delhi, w12, NOT resolved (active)
(
  'cccccccc-0000-0000-0000-000000000018'::uuid,
  'aqi_grap_iv', 8.3, 'delhi',
  28.647000, 77.316000, 20.00,
  480.00, 450.00,
  true, true,
  '{"source": "waqi", "demo": true}'::jsonb,
  ARRAY['waqi', 'openrouter-llm'],
  '1.0',
  NULL,
  '2026-04-02 09:50:00+00'::timestamptz
),
-- E19: heavy_rainfall, chennai, w10, resolved
(
  'cccccccc-0000-0000-0000-000000000019'::uuid,
  'heavy_rainfall', 7.0, 'chennai',
  12.978000, 80.218000, 15.00,
  80.00, 65.00,
  true, false,
  '{"source": "openweathermap", "demo": true}'::jsonb,
  ARRAY['openweathermap', 'open-meteo'],
  '1.0',
  '2026-03-18 17:30:00+00'::timestamptz,
  '2026-03-18 09:30:00+00'::timestamptz
),
-- E20: heavy_rainfall, pune, w11, resolved
(
  'cccccccc-0000-0000-0000-000000000020'::uuid,
  'heavy_rainfall', 6.5, 'pune',
  18.458000, 73.868000, 15.00,
  73.00, 65.00,
  true, false,
  '{"source": "openweathermap", "demo": true}'::jsonb,
  ARRAY['openweathermap', 'open-meteo'],
  '1.0',
  '2026-03-25 20:30:00+00'::timestamptz,
  '2026-03-25 12:30:00+00'::timestamptz
),
-- E21: cyclone, kolkata, w9, resolved
(
  'cccccccc-0000-0000-0000-000000000021'::uuid,
  'cyclone', 7.5, 'kolkata',
  22.500000, 88.330000, 25.00,
  80.00, 70.00,
  true, false,
  '{"source": "open-meteo", "demo": true}'::jsonb,
  ARRAY['open-meteo', 'openweathermap'],
  '1.0',
  '2026-03-11 17:00:00+00'::timestamptz,
  '2026-03-11 09:00:00+00'::timestamptz
);

-- ============================================================================
-- SECTION 4: Weekly Policies (40 policies)
-- UUID format: bbbbbbbb-0000-0000-00XX-0000000000YY
--   XX = user number (01-07), YY = week number (01-12)
-- Tiers: Rajesh=high(160), Priya=medium(120), Suresh=normal(80),
--        Meera=high(160), Amit=medium(120), Lakshmi=normal(80), Vikram=high(160)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Rajesh (user 01, high tier, weeks 1-12)
-- ---------------------------------------------------------------------------
INSERT INTO weekly_policies (
  id, profile_id, plan_id, week_start_date, week_end_date,
  base_premium_inr, weather_risk_addon, ubi_addon, final_premium_inr,
  is_active, payment_status, created_at
) VALUES
(
  'bbbbbbbb-0000-0000-0001-000000000001'::uuid,
  'aaaaaaaa-1111-1111-1111-111111111111',
  (SELECT id FROM plan_packages WHERE slug = 'high'),
  '2026-01-12', '2026-01-18',
  160.00, 10.00, 8.00, 178.00,
  false, 'paid', '2026-01-12 06:00:00+00'
),
(
  'bbbbbbbb-0000-0000-0001-000000000002'::uuid,
  'aaaaaaaa-1111-1111-1111-111111111111',
  (SELECT id FROM plan_packages WHERE slug = 'high'),
  '2026-01-19', '2026-01-25',
  160.00, 10.00, 8.00, 178.00,
  false, 'paid', '2026-01-19 06:00:00+00'
),
(
  'bbbbbbbb-0000-0000-0001-000000000003'::uuid,
  'aaaaaaaa-1111-1111-1111-111111111111',
  (SELECT id FROM plan_packages WHERE slug = 'high'),
  '2026-01-26', '2026-02-01',
  160.00, 11.00, 8.00, 179.00,
  false, 'paid', '2026-01-26 06:00:00+00'
),
(
  'bbbbbbbb-0000-0000-0001-000000000004'::uuid,
  'aaaaaaaa-1111-1111-1111-111111111111',
  (SELECT id FROM plan_packages WHERE slug = 'high'),
  '2026-02-02', '2026-02-08',
  160.00, 11.00, 9.00, 180.00,
  false, 'paid', '2026-02-02 06:00:00+00'
),
(
  'bbbbbbbb-0000-0000-0001-000000000005'::uuid,
  'aaaaaaaa-1111-1111-1111-111111111111',
  (SELECT id FROM plan_packages WHERE slug = 'high'),
  '2026-02-09', '2026-02-15',
  160.00, 12.00, 9.00, 181.00,
  false, 'paid', '2026-02-09 06:00:00+00'
),
(
  'bbbbbbbb-0000-0000-0001-000000000006'::uuid,
  'aaaaaaaa-1111-1111-1111-111111111111',
  (SELECT id FROM plan_packages WHERE slug = 'high'),
  '2026-02-16', '2026-02-22',
  160.00, 13.00, 9.00, 182.00,
  false, 'paid', '2026-02-16 06:00:00+00'
),
(
  'bbbbbbbb-0000-0000-0001-000000000007'::uuid,
  'aaaaaaaa-1111-1111-1111-111111111111',
  (SELECT id FROM plan_packages WHERE slug = 'high'),
  '2026-02-23', '2026-03-01',
  160.00, 14.00, 10.00, 184.00,
  false, 'paid', '2026-02-23 06:00:00+00'
),
(
  'bbbbbbbb-0000-0000-0001-000000000008'::uuid,
  'aaaaaaaa-1111-1111-1111-111111111111',
  (SELECT id FROM plan_packages WHERE slug = 'high'),
  '2026-03-02', '2026-03-08',
  160.00, 14.00, 10.00, 184.00,
  false, 'paid', '2026-03-02 06:00:00+00'
),
(
  'bbbbbbbb-0000-0000-0001-000000000009'::uuid,
  'aaaaaaaa-1111-1111-1111-111111111111',
  (SELECT id FROM plan_packages WHERE slug = 'high'),
  '2026-03-09', '2026-03-15',
  160.00, 15.00, 10.00, 185.00,
  false, 'paid', '2026-03-09 06:00:00+00'
),
(
  'bbbbbbbb-0000-0000-0001-000000000010'::uuid,
  'aaaaaaaa-1111-1111-1111-111111111111',
  (SELECT id FROM plan_packages WHERE slug = 'high'),
  '2026-03-16', '2026-03-22',
  160.00, 16.00, 11.00, 187.00,
  false, 'paid', '2026-03-16 06:00:00+00'
),
(
  'bbbbbbbb-0000-0000-0001-000000000011'::uuid,
  'aaaaaaaa-1111-1111-1111-111111111111',
  (SELECT id FROM plan_packages WHERE slug = 'high'),
  '2026-03-23', '2026-03-29',
  160.00, 17.00, 11.00, 188.00,
  false, 'paid', '2026-03-23 06:00:00+00'
),
(
  'bbbbbbbb-0000-0000-0001-000000000012'::uuid,
  'aaaaaaaa-1111-1111-1111-111111111111',
  (SELECT id FROM plan_packages WHERE slug = 'high'),
  '2026-03-30', '2026-04-05',
  160.00, 18.00, 12.00, 190.00,
  true, 'paid', '2026-03-30 06:00:00+00'
),

-- ---------------------------------------------------------------------------
-- Priya (user 02, medium tier, weeks 7-12)
-- ---------------------------------------------------------------------------
(
  'bbbbbbbb-0000-0000-0002-000000000007'::uuid,
  'aaaaaaaa-2222-2222-2222-222222222222',
  (SELECT id FROM plan_packages WHERE slug = 'medium'),
  '2026-02-23', '2026-03-01',
  120.00, 14.00, 0.00, 134.00,
  false, 'paid', '2026-02-23 06:00:00+00'
),
(
  'bbbbbbbb-0000-0000-0002-000000000008'::uuid,
  'aaaaaaaa-2222-2222-2222-222222222222',
  (SELECT id FROM plan_packages WHERE slug = 'medium'),
  '2026-03-02', '2026-03-08',
  120.00, 14.00, 0.00, 134.00,
  false, 'paid', '2026-03-02 06:00:00+00'
),
(
  'bbbbbbbb-0000-0000-0002-000000000009'::uuid,
  'aaaaaaaa-2222-2222-2222-222222222222',
  (SELECT id FROM plan_packages WHERE slug = 'medium'),
  '2026-03-09', '2026-03-15',
  120.00, 15.00, 2.00, 137.00,
  false, 'paid', '2026-03-09 06:00:00+00'
),
(
  'bbbbbbbb-0000-0000-0002-000000000010'::uuid,
  'aaaaaaaa-2222-2222-2222-222222222222',
  (SELECT id FROM plan_packages WHERE slug = 'medium'),
  '2026-03-16', '2026-03-22',
  120.00, 16.00, 3.00, 139.00,
  false, 'paid', '2026-03-16 06:00:00+00'
),
(
  'bbbbbbbb-0000-0000-0002-000000000011'::uuid,
  'aaaaaaaa-2222-2222-2222-222222222222',
  (SELECT id FROM plan_packages WHERE slug = 'medium'),
  '2026-03-23', '2026-03-29',
  120.00, 17.00, 4.00, 141.00,
  false, 'paid', '2026-03-23 06:00:00+00'
),
(
  'bbbbbbbb-0000-0000-0002-000000000012'::uuid,
  'aaaaaaaa-2222-2222-2222-222222222222',
  (SELECT id FROM plan_packages WHERE slug = 'medium'),
  '2026-03-30', '2026-04-05',
  120.00, 18.00, 5.00, 143.00,
  true, 'paid', '2026-03-30 06:00:00+00'
),

-- ---------------------------------------------------------------------------
-- Suresh (user 03, normal tier, weeks 11-12)
-- ---------------------------------------------------------------------------
(
  'bbbbbbbb-0000-0000-0003-000000000011'::uuid,
  'aaaaaaaa-3333-3333-3333-333333333333',
  (SELECT id FROM plan_packages WHERE slug = 'normal'),
  '2026-03-23', '2026-03-29',
  80.00, 17.00, 0.00, 97.00,
  false, 'paid', '2026-03-23 09:30:00+00'
),
(
  'bbbbbbbb-0000-0000-0003-000000000012'::uuid,
  'aaaaaaaa-3333-3333-3333-333333333333',
  (SELECT id FROM plan_packages WHERE slug = 'normal'),
  '2026-03-30', '2026-04-05',
  80.00, 18.00, 0.00, 98.00,
  true, 'paid', '2026-03-30 08:00:00+00'
),

-- ---------------------------------------------------------------------------
-- Meera (user 04, high tier, weeks 5-12)
-- ---------------------------------------------------------------------------
(
  'bbbbbbbb-0000-0000-0004-000000000005'::uuid,
  'aaaaaaaa-4444-4444-4444-444444444444',
  (SELECT id FROM plan_packages WHERE slug = 'high'),
  '2026-02-09', '2026-02-15',
  160.00, 12.00, 0.00, 172.00,
  false, 'paid', '2026-02-09 06:00:00+00'
),
(
  'bbbbbbbb-0000-0000-0004-000000000006'::uuid,
  'aaaaaaaa-4444-4444-4444-444444444444',
  (SELECT id FROM plan_packages WHERE slug = 'high'),
  '2026-02-16', '2026-02-22',
  160.00, 13.00, 0.00, 173.00,
  false, 'paid', '2026-02-16 06:00:00+00'
),
(
  'bbbbbbbb-0000-0000-0004-000000000007'::uuid,
  'aaaaaaaa-4444-4444-4444-444444444444',
  (SELECT id FROM plan_packages WHERE slug = 'high'),
  '2026-02-23', '2026-03-01',
  160.00, 14.00, 2.00, 176.00,
  false, 'paid', '2026-02-23 06:00:00+00'
),
(
  'bbbbbbbb-0000-0000-0004-000000000008'::uuid,
  'aaaaaaaa-4444-4444-4444-444444444444',
  (SELECT id FROM plan_packages WHERE slug = 'high'),
  '2026-03-02', '2026-03-08',
  160.00, 14.00, 3.00, 177.00,
  false, 'paid', '2026-03-02 06:00:00+00'
),
(
  'bbbbbbbb-0000-0000-0004-000000000009'::uuid,
  'aaaaaaaa-4444-4444-4444-444444444444',
  (SELECT id FROM plan_packages WHERE slug = 'high'),
  '2026-03-09', '2026-03-15',
  160.00, 15.00, 4.00, 179.00,
  false, 'paid', '2026-03-09 06:00:00+00'
),
(
  'bbbbbbbb-0000-0000-0004-000000000010'::uuid,
  'aaaaaaaa-4444-4444-4444-444444444444',
  (SELECT id FROM plan_packages WHERE slug = 'high'),
  '2026-03-16', '2026-03-22',
  160.00, 16.00, 5.00, 181.00,
  false, 'paid', '2026-03-16 06:00:00+00'
),
(
  'bbbbbbbb-0000-0000-0004-000000000011'::uuid,
  'aaaaaaaa-4444-4444-4444-444444444444',
  (SELECT id FROM plan_packages WHERE slug = 'high'),
  '2026-03-23', '2026-03-29',
  160.00, 17.00, 6.00, 183.00,
  false, 'paid', '2026-03-23 06:00:00+00'
),
(
  'bbbbbbbb-0000-0000-0004-000000000012'::uuid,
  'aaaaaaaa-4444-4444-4444-444444444444',
  (SELECT id FROM plan_packages WHERE slug = 'high'),
  '2026-03-30', '2026-04-05',
  160.00, 18.00, 7.00, 185.00,
  true, 'paid', '2026-03-30 06:00:00+00'
),

-- ---------------------------------------------------------------------------
-- Amit (user 05, medium tier, weeks 9-12)
-- ---------------------------------------------------------------------------
(
  'bbbbbbbb-0000-0000-0005-000000000009'::uuid,
  'aaaaaaaa-5555-5555-5555-555555555555',
  (SELECT id FROM plan_packages WHERE slug = 'medium'),
  '2026-03-09', '2026-03-15',
  120.00, 15.00, 0.00, 135.00,
  false, 'paid', '2026-03-09 08:00:00+00'
),
(
  'bbbbbbbb-0000-0000-0005-000000000010'::uuid,
  'aaaaaaaa-5555-5555-5555-555555555555',
  (SELECT id FROM plan_packages WHERE slug = 'medium'),
  '2026-03-16', '2026-03-22',
  120.00, 16.00, 0.00, 136.00,
  false, 'paid', '2026-03-16 11:00:00+00'
),
(
  'bbbbbbbb-0000-0000-0005-000000000011'::uuid,
  'aaaaaaaa-5555-5555-5555-555555555555',
  (SELECT id FROM plan_packages WHERE slug = 'medium'),
  '2026-03-23', '2026-03-29',
  120.00, 17.00, 2.00, 139.00,
  false, 'paid', '2026-03-23 08:00:00+00'
),
(
  'bbbbbbbb-0000-0000-0005-000000000012'::uuid,
  'aaaaaaaa-5555-5555-5555-555555555555',
  (SELECT id FROM plan_packages WHERE slug = 'medium'),
  '2026-03-30', '2026-04-05',
  120.00, 18.00, 3.00, 141.00,
  true, 'paid', '2026-03-30 09:30:00+00'
),

-- ---------------------------------------------------------------------------
-- Lakshmi (user 06, normal tier, weeks 10-12)
-- ---------------------------------------------------------------------------
(
  'bbbbbbbb-0000-0000-0006-000000000010'::uuid,
  'aaaaaaaa-6666-6666-6666-666666666666',
  (SELECT id FROM plan_packages WHERE slug = 'normal'),
  '2026-03-16', '2026-03-22',
  80.00, 16.00, 0.00, 96.00,
  false, 'paid', '2026-03-16 09:30:00+00'
),
(
  'bbbbbbbb-0000-0000-0006-000000000011'::uuid,
  'aaaaaaaa-6666-6666-6666-666666666666',
  (SELECT id FROM plan_packages WHERE slug = 'normal'),
  '2026-03-23', '2026-03-29',
  80.00, 17.00, 0.00, 97.00,
  false, 'paid', '2026-03-23 11:00:00+00'
),
(
  'bbbbbbbb-0000-0000-0006-000000000012'::uuid,
  'aaaaaaaa-6666-6666-6666-666666666666',
  (SELECT id FROM plan_packages WHERE slug = 'normal'),
  '2026-03-30', '2026-04-05',
  80.00, 18.00, 0.00, 98.00,
  true, 'paid', '2026-03-30 08:00:00+00'
),

-- ---------------------------------------------------------------------------
-- Vikram (user 07, high tier, weeks 8-12)
-- ---------------------------------------------------------------------------
(
  'bbbbbbbb-0000-0000-0007-000000000008'::uuid,
  'aaaaaaaa-7777-7777-7777-777777777777',
  (SELECT id FROM plan_packages WHERE slug = 'high'),
  '2026-03-02', '2026-03-08',
  160.00, 14.00, 0.00, 174.00,
  false, 'paid', '2026-03-02 11:00:00+00'
),
(
  'bbbbbbbb-0000-0000-0007-000000000009'::uuid,
  'aaaaaaaa-7777-7777-7777-777777777777',
  (SELECT id FROM plan_packages WHERE slug = 'high'),
  '2026-03-09', '2026-03-15',
  160.00, 15.00, 0.00, 175.00,
  false, 'paid', '2026-03-09 09:30:00+00'
),
(
  'bbbbbbbb-0000-0000-0007-000000000010'::uuid,
  'aaaaaaaa-7777-7777-7777-777777777777',
  (SELECT id FROM plan_packages WHERE slug = 'high'),
  '2026-03-16', '2026-03-22',
  160.00, 16.00, 2.00, 178.00,
  false, 'paid', '2026-03-16 08:00:00+00'
),
(
  'bbbbbbbb-0000-0000-0007-000000000011'::uuid,
  'aaaaaaaa-7777-7777-7777-777777777777',
  (SELECT id FROM plan_packages WHERE slug = 'high'),
  '2026-03-23', '2026-03-29',
  160.00, 17.00, 3.00, 180.00,
  false, 'paid', '2026-03-23 09:30:00+00'
),
(
  'bbbbbbbb-0000-0000-0007-000000000012'::uuid,
  'aaaaaaaa-7777-7777-7777-777777777777',
  (SELECT id FROM plan_packages WHERE slug = 'high'),
  '2026-03-30', '2026-04-05',
  160.00, 18.00, 4.00, 182.00,
  true, 'paid', '2026-03-30 11:00:00+00'
);

-- ============================================================================
-- SECTION 5: Parametric Claims (17 claims)
-- UUID format: dddddddd-0000-0000-0000-0000000000XX
-- ============================================================================

INSERT INTO parametric_claims (
  id, policy_id, profile_id, disruption_event_id,
  payout_amount_inr, status,
  gate1_passed, gate1_checked_at,
  gate2_passed, gate2_checked_at,
  activity_minutes, gps_within_zone,
  is_flagged, flag_reason, fraud_score, fraud_signals,
  device_fingerprint,
  admin_review_status, reviewed_by, reviewed_at,
  gateway_transaction_id, payout_initiated_at, payout_completed_at,
  appeal_submitted_at, appeal_evidence_url, appeal_resolved_at,
  created_at
) VALUES
-- Claim 1: Rajesh, E1 (heavy_rainfall mumbai w2), paid
(
  'dddddddd-0000-0000-0000-000000000001'::uuid,
  'bbbbbbbb-0000-0000-0001-000000000002'::uuid,
  'aaaaaaaa-1111-1111-1111-111111111111',
  'cccccccc-0000-0000-0000-000000000001'::uuid,
  2000.00, 'paid',
  true, '2026-01-21 02:35:00+00',
  true, '2026-01-21 02:37:00+00',
  120, true,
  false, NULL, 0.05, '{}'::jsonb,
  'fp-rajesh-device-01',
  'approved', 'system', '2026-01-21 02:37:00+00',
  'SAFESHIFT_UPI_001', '2026-01-21 02:38:00+00', '2026-01-21 02:40:00+00',
  NULL, NULL, NULL,
  '2026-01-21 02:32:00+00'
),
-- Claim 2: Rajesh, E2 (heavy_rainfall mumbai w4), paid
(
  'dddddddd-0000-0000-0000-000000000002'::uuid,
  'bbbbbbbb-0000-0000-0001-000000000004'::uuid,
  'aaaaaaaa-1111-1111-1111-111111111111',
  'cccccccc-0000-0000-0000-000000000002'::uuid,
  2000.00, 'paid',
  true, '2026-02-04 09:05:00+00',
  true, '2026-02-04 09:07:00+00',
  95, true,
  false, NULL, 0.05, '{}'::jsonb,
  'fp-rajesh-device-01',
  'approved', 'system', '2026-02-04 09:07:00+00',
  'SAFESHIFT_UPI_002', '2026-02-04 09:08:00+00', '2026-02-04 09:10:00+00',
  NULL, NULL, NULL,
  '2026-02-04 09:02:00+00'
),
-- Claim 3: Rajesh, E3 (heavy_rainfall mumbai w7), paid
(
  'dddddddd-0000-0000-0000-000000000003'::uuid,
  'bbbbbbbb-0000-0000-0001-000000000007'::uuid,
  'aaaaaaaa-1111-1111-1111-111111111111',
  'cccccccc-0000-0000-0000-000000000003'::uuid,
  2000.00, 'paid',
  true, '2026-02-25 13:05:00+00',
  true, '2026-02-25 13:07:00+00',
  80, true,
  false, NULL, 0.05, '{}'::jsonb,
  'fp-rajesh-device-01',
  'approved', 'system', '2026-02-25 13:07:00+00',
  'SAFESHIFT_UPI_003', '2026-02-25 13:08:00+00', '2026-02-25 13:10:00+00',
  NULL, NULL, NULL,
  '2026-02-25 13:02:00+00'
),
-- Claim 4: Rajesh, E4 (heavy_rainfall mumbai w11), paid
(
  'dddddddd-0000-0000-0000-000000000004'::uuid,
  'bbbbbbbb-0000-0000-0001-000000000011'::uuid,
  'aaaaaaaa-1111-1111-1111-111111111111',
  'cccccccc-0000-0000-0000-000000000004'::uuid,
  2000.00, 'paid',
  true, '2026-03-25 01:35:00+00',
  true, '2026-03-25 01:37:00+00',
  110, true,
  false, NULL, 0.05, '{}'::jsonb,
  'fp-rajesh-device-01',
  'approved', 'system', '2026-03-25 01:37:00+00',
  'SAFESHIFT_UPI_004', '2026-03-25 01:38:00+00', '2026-03-25 01:40:00+00',
  NULL, NULL, NULL,
  '2026-03-25 01:32:00+00'
),
-- Claim 5: Rajesh, E16 (platform_outage mumbai w11), paid
(
  'dddddddd-0000-0000-0000-000000000005'::uuid,
  'bbbbbbbb-0000-0000-0001-000000000011'::uuid,
  'aaaaaaaa-1111-1111-1111-111111111111',
  'cccccccc-0000-0000-0000-000000000016'::uuid,
  1000.00, 'paid',
  true, '2026-03-25 04:35:00+00',
  true, '2026-03-25 04:37:00+00',
  60, true,
  false, NULL, 0.10, '{}'::jsonb,
  'fp-rajesh-device-01',
  'approved', 'system', '2026-03-25 04:37:00+00',
  'SAFESHIFT_UPI_005', '2026-03-25 04:38:00+00', '2026-03-25 04:40:00+00',
  NULL, NULL, NULL,
  '2026-03-25 04:32:00+00'
),
-- Claim 6: Rajesh, E17 (heavy_rainfall mumbai w12), gate1_passed (active)
(
  'dddddddd-0000-0000-0000-000000000006'::uuid,
  'bbbbbbbb-0000-0000-0001-000000000012'::uuid,
  'aaaaaaaa-1111-1111-1111-111111111111',
  'cccccccc-0000-0000-0000-000000000017'::uuid,
  2000.00, 'gate1_passed',
  true, '2026-04-02 10:18:00+00',
  NULL, NULL,
  NULL, NULL,
  false, NULL, 0.00, '{}'::jsonb,
  'fp-rajesh-device-01',
  NULL, NULL, NULL,
  NULL, NULL, NULL,
  NULL, NULL, NULL,
  '2026-04-02 10:15:00+00'
),
-- Claim 7: Priya, E7 (aqi_grap_iv delhi w9), paid
(
  'dddddddd-0000-0000-0000-000000000007'::uuid,
  'bbbbbbbb-0000-0000-0002-000000000009'::uuid,
  'aaaaaaaa-2222-2222-2222-222222222222',
  'cccccccc-0000-0000-0000-000000000007'::uuid,
  1500.00, 'paid',
  true, '2026-03-11 13:35:00+00',
  true, '2026-03-11 13:37:00+00',
  75, true,
  false, NULL, 0.08, '{}'::jsonb,
  'fp-priya-device-01',
  'approved', 'system', '2026-03-11 13:37:00+00',
  'SAFESHIFT_UPI_007', '2026-03-11 13:38:00+00', '2026-03-11 13:40:00+00',
  NULL, NULL, NULL,
  '2026-03-11 13:32:00+00'
),
-- Claim 8: Priya, E8 (curfew_bandh delhi w10), paid
(
  'dddddddd-0000-0000-0000-000000000008'::uuid,
  'bbbbbbbb-0000-0000-0002-000000000010'::uuid,
  'aaaaaaaa-2222-2222-2222-222222222222',
  'cccccccc-0000-0000-0000-000000000008'::uuid,
  1350.00, 'paid',
  true, '2026-03-18 02:05:00+00',
  true, '2026-03-18 02:07:00+00',
  90, true,
  false, NULL, 0.05, '{}'::jsonb,
  'fp-priya-device-01',
  'approved', 'system', '2026-03-18 02:07:00+00',
  'SAFESHIFT_UPI_008', '2026-03-18 02:08:00+00', '2026-03-18 02:10:00+00',
  NULL, NULL, NULL,
  '2026-03-18 02:02:00+00'
),
-- Claim 9: Priya, E18 (aqi_grap_iv delhi w12), gate1_passed (active)
(
  'dddddddd-0000-0000-0000-000000000009'::uuid,
  'bbbbbbbb-0000-0000-0002-000000000012'::uuid,
  'aaaaaaaa-2222-2222-2222-222222222222',
  'cccccccc-0000-0000-0000-000000000018'::uuid,
  1500.00, 'gate1_passed',
  true, '2026-04-02 09:56:00+00',
  NULL, NULL,
  NULL, NULL,
  false, NULL, 0.00, '{}'::jsonb,
  'fp-priya-device-01',
  NULL, NULL, NULL,
  NULL, NULL, NULL,
  NULL, NULL, NULL,
  '2026-04-02 09:53:00+00'
),
-- Claim 10: Suresh, E12 (heavy_rainfall bangalore w11), paid
(
  'dddddddd-0000-0000-0000-000000000010'::uuid,
  'bbbbbbbb-0000-0000-0003-000000000011'::uuid,
  'aaaaaaaa-3333-3333-3333-333333333333',
  'cccccccc-0000-0000-0000-000000000012'::uuid,
  1000.00, 'paid',
  true, '2026-03-25 09:35:00+00',
  true, '2026-03-25 09:37:00+00',
  50, true,
  false, NULL, 0.10, '{}'::jsonb,
  'fp-suresh-device-01',
  'approved', 'system', '2026-03-25 09:37:00+00',
  'SAFESHIFT_UPI_010', '2026-03-25 09:38:00+00', '2026-03-25 09:40:00+00',
  NULL, NULL, NULL,
  '2026-03-25 09:32:00+00'
),
-- Claim 11: Meera, E9 (cyclone chennai w5), paid
(
  'dddddddd-0000-0000-0000-000000000011'::uuid,
  'bbbbbbbb-0000-0000-0004-000000000005'::uuid,
  'aaaaaaaa-4444-4444-4444-444444444444',
  'cccccccc-0000-0000-0000-000000000009'::uuid,
  2400.00, 'paid',
  true, '2026-02-11 10:05:00+00',
  true, '2026-02-11 10:07:00+00',
  130, true,
  false, NULL, 0.05, '{}'::jsonb,
  'fp-meera-device-01',
  'approved', 'system', '2026-02-11 10:07:00+00',
  'SAFESHIFT_UPI_011', '2026-02-11 10:08:00+00', '2026-02-11 10:10:00+00',
  NULL, NULL, NULL,
  '2026-02-11 10:02:00+00'
),
-- Claim 12: Meera, E10 (cyclone chennai w8), paid
(
  'dddddddd-0000-0000-0000-000000000012'::uuid,
  'bbbbbbbb-0000-0000-0004-000000000008'::uuid,
  'aaaaaaaa-4444-4444-4444-444444444444',
  'cccccccc-0000-0000-0000-000000000010'::uuid,
  2400.00, 'paid',
  true, '2026-03-04 02:35:00+00',
  true, '2026-03-04 02:37:00+00',
  100, true,
  false, NULL, 0.05, '{}'::jsonb,
  'fp-meera-device-01',
  'approved', 'system', '2026-03-04 02:37:00+00',
  'SAFESHIFT_UPI_012', '2026-03-04 02:38:00+00', '2026-03-04 02:40:00+00',
  NULL, NULL, NULL,
  '2026-03-04 02:32:00+00'
),
-- Claim 13: Meera, E19 (heavy_rainfall chennai w10), paid
(
  'dddddddd-0000-0000-0000-000000000013'::uuid,
  'bbbbbbbb-0000-0000-0004-000000000010'::uuid,
  'aaaaaaaa-4444-4444-4444-444444444444',
  'cccccccc-0000-0000-0000-000000000019'::uuid,
  2000.00, 'paid',
  true, '2026-03-18 09:35:00+00',
  true, '2026-03-18 09:37:00+00',
  85, true,
  false, NULL, 0.08, '{}'::jsonb,
  'fp-meera-device-01',
  'approved', 'system', '2026-03-18 09:37:00+00',
  'SAFESHIFT_UPI_013', '2026-03-18 09:38:00+00', '2026-03-18 09:40:00+00',
  NULL, NULL, NULL,
  '2026-03-18 09:32:00+00'
),
-- Claim 14: Amit, E13 (heavy_rainfall pune w9), paid
(
  'dddddddd-0000-0000-0000-000000000014'::uuid,
  'bbbbbbbb-0000-0000-0005-000000000009'::uuid,
  'aaaaaaaa-5555-5555-5555-555555555555',
  'cccccccc-0000-0000-0000-000000000013'::uuid,
  1500.00, 'paid',
  true, '2026-03-11 03:05:00+00',
  true, '2026-03-11 03:07:00+00',
  70, true,
  false, NULL, 0.10, '{}'::jsonb,
  'fp-amit-device-01',
  'approved', 'system', '2026-03-11 03:07:00+00',
  'SAFESHIFT_UPI_014', '2026-03-11 03:08:00+00', '2026-03-11 03:10:00+00',
  NULL, NULL, NULL,
  '2026-03-11 03:02:00+00'
),
-- Claim 15: Amit, E20 (heavy_rainfall pune w11), paid
(
  'dddddddd-0000-0000-0000-000000000015'::uuid,
  'bbbbbbbb-0000-0000-0005-000000000011'::uuid,
  'aaaaaaaa-5555-5555-5555-555555555555',
  'cccccccc-0000-0000-0000-000000000020'::uuid,
  1500.00, 'paid',
  true, '2026-03-25 12:35:00+00',
  true, '2026-03-25 12:37:00+00',
  65, true,
  false, NULL, 0.10, '{}'::jsonb,
  'fp-amit-device-01',
  'approved', 'system', '2026-03-25 12:37:00+00',
  'SAFESHIFT_UPI_015', '2026-03-25 12:38:00+00', '2026-03-25 12:40:00+00',
  NULL, NULL, NULL,
  '2026-03-25 12:32:00+00'
),
-- Claim 16: Vikram, E15 (heavy_rainfall kolkata w10), REJECTED
(
  'dddddddd-0000-0000-0000-000000000016'::uuid,
  'bbbbbbbb-0000-0000-0007-000000000010'::uuid,
  'aaaaaaaa-7777-7777-7777-777777777777',
  'cccccccc-0000-0000-0000-000000000015'::uuid,
  2000.00, 'rejected',
  true, '2026-03-18 13:05:00+00',
  false, '2026-03-18 13:07:00+00',
  20, false,
  true, 'GPS location outside zone during disruption event',
  0.75,
  '{"gps_distance_km": 45.2, "expected_zone": "kolkata", "actual_location": "outside_geofence", "ip_mismatch": true}'::jsonb,
  'fp-vikram-device-01',
  'rejected', 'admin@safeshift.app', '2026-03-18 14:00:00+00',
  NULL, NULL, NULL,
  NULL, NULL, NULL,
  '2026-03-18 13:02:00+00'
),
-- Claim 17: Vikram, E21 (cyclone kolkata w9), APPEALED
(
  'dddddddd-0000-0000-0000-000000000017'::uuid,
  'bbbbbbbb-0000-0000-0007-000000000009'::uuid,
  'aaaaaaaa-7777-7777-7777-777777777777',
  'cccccccc-0000-0000-0000-000000000021'::uuid,
  2400.00, 'appealed',
  true, '2026-03-11 09:05:00+00',
  true, '2026-03-11 09:07:00+00',
  55, true,
  false, NULL, 0.15, '{}'::jsonb,
  'fp-vikram-device-01',
  'pending', NULL, NULL,
  NULL, NULL, NULL,
  '2026-03-12 09:00:00+00', 'https://storage.safeshift.app/appeals/vikram-cyclone-evidence.pdf', NULL,
  '2026-03-11 09:02:00+00'
);

-- ============================================================================
-- SECTION 6: Payout Ledger (13 entries for paid claims)
-- One per paid claim: claims 1-5, 7-8, 10-15
-- ============================================================================

INSERT INTO payout_ledger (
  claim_id, profile_id, amount_inr,
  payout_method, status, mock_upi_ref, completed_at, created_at
) VALUES
-- Claim 1: Rajesh, 2000
(
  'dddddddd-0000-0000-0000-000000000001'::uuid,
  'aaaaaaaa-1111-1111-1111-111111111111',
  2000.00, 'upi_instant', 'completed',
  'SAFESHIFT_UPI_20260121_000001',
  '2026-01-21 02:40:00+00',
  '2026-01-21 02:38:00+00'
),
-- Claim 2: Rajesh, 2000
(
  'dddddddd-0000-0000-0000-000000000002'::uuid,
  'aaaaaaaa-1111-1111-1111-111111111111',
  2000.00, 'upi_instant', 'completed',
  'SAFESHIFT_UPI_20260204_000002',
  '2026-02-04 09:10:00+00',
  '2026-02-04 09:08:00+00'
),
-- Claim 3: Rajesh, 2000
(
  'dddddddd-0000-0000-0000-000000000003'::uuid,
  'aaaaaaaa-1111-1111-1111-111111111111',
  2000.00, 'upi_instant', 'completed',
  'SAFESHIFT_UPI_20260225_000003',
  '2026-02-25 13:10:00+00',
  '2026-02-25 13:08:00+00'
),
-- Claim 4: Rajesh, 2000
(
  'dddddddd-0000-0000-0000-000000000004'::uuid,
  'aaaaaaaa-1111-1111-1111-111111111111',
  2000.00, 'upi_instant', 'completed',
  'SAFESHIFT_UPI_20260325_000004',
  '2026-03-25 01:40:00+00',
  '2026-03-25 01:38:00+00'
),
-- Claim 5: Rajesh, 1000
(
  'dddddddd-0000-0000-0000-000000000005'::uuid,
  'aaaaaaaa-1111-1111-1111-111111111111',
  1000.00, 'upi_instant', 'completed',
  'SAFESHIFT_UPI_20260325_000005',
  '2026-03-25 04:40:00+00',
  '2026-03-25 04:38:00+00'
),
-- Claim 7: Priya, 1500
(
  'dddddddd-0000-0000-0000-000000000007'::uuid,
  'aaaaaaaa-2222-2222-2222-222222222222',
  1500.00, 'upi_instant', 'completed',
  'SAFESHIFT_UPI_20260311_000007',
  '2026-03-11 13:40:00+00',
  '2026-03-11 13:38:00+00'
),
-- Claim 8: Priya, 1350
(
  'dddddddd-0000-0000-0000-000000000008'::uuid,
  'aaaaaaaa-2222-2222-2222-222222222222',
  1350.00, 'upi_instant', 'completed',
  'SAFESHIFT_UPI_20260318_000008',
  '2026-03-18 02:10:00+00',
  '2026-03-18 02:08:00+00'
),
-- Claim 10: Suresh, 1000
(
  'dddddddd-0000-0000-0000-000000000010'::uuid,
  'aaaaaaaa-3333-3333-3333-333333333333',
  1000.00, 'upi_instant', 'completed',
  'SAFESHIFT_UPI_20260325_000010',
  '2026-03-25 09:40:00+00',
  '2026-03-25 09:38:00+00'
),
-- Claim 11: Meera, 2400
(
  'dddddddd-0000-0000-0000-000000000011'::uuid,
  'aaaaaaaa-4444-4444-4444-444444444444',
  2400.00, 'upi_instant', 'completed',
  'SAFESHIFT_UPI_20260211_000011',
  '2026-02-11 10:10:00+00',
  '2026-02-11 10:08:00+00'
),
-- Claim 12: Meera, 2400
(
  'dddddddd-0000-0000-0000-000000000012'::uuid,
  'aaaaaaaa-4444-4444-4444-444444444444',
  2400.00, 'upi_instant', 'completed',
  'SAFESHIFT_UPI_20260304_000012',
  '2026-03-04 02:40:00+00',
  '2026-03-04 02:38:00+00'
),
-- Claim 13: Meera, 2000
(
  'dddddddd-0000-0000-0000-000000000013'::uuid,
  'aaaaaaaa-4444-4444-4444-444444444444',
  2000.00, 'upi_instant', 'completed',
  'SAFESHIFT_UPI_20260318_000013',
  '2026-03-18 09:40:00+00',
  '2026-03-18 09:38:00+00'
),
-- Claim 14: Amit, 1500
(
  'dddddddd-0000-0000-0000-000000000014'::uuid,
  'aaaaaaaa-5555-5555-5555-555555555555',
  1500.00, 'upi_instant', 'completed',
  'SAFESHIFT_UPI_20260311_000014',
  '2026-03-11 03:10:00+00',
  '2026-03-11 03:08:00+00'
),
-- Claim 15: Amit, 1500
(
  'dddddddd-0000-0000-0000-000000000015'::uuid,
  'aaaaaaaa-5555-5555-5555-555555555555',
  1500.00, 'upi_instant', 'completed',
  'SAFESHIFT_UPI_20260325_000015',
  '2026-03-25 12:40:00+00',
  '2026-03-25 12:38:00+00'
);

-- ============================================================================
-- SECTION 7: Coins Ledger
-- Target balances:
--   Rajesh=450, Priya=200, Suresh=30, Meera=380, Amit=150, Lakshmi=40, Vikram=100
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Rajesh: target 450 coins
-- ---------------------------------------------------------------------------
INSERT INTO coins_ledger (profile_id, activity, coins, description, created_at) VALUES
-- Complete profile bonus
('aaaaaaaa-1111-1111-1111-111111111111', 'complete_profile', 50, 'Profile completion bonus', '2025-12-20 12:00:00+00'),
-- Weekly logins (12 weeks)
('aaaaaaaa-1111-1111-1111-111111111111', 'weekly_login', 10, 'Weekly login bonus - Week 1', '2026-01-12 08:00:00+00'),
('aaaaaaaa-1111-1111-1111-111111111111', 'weekly_login', 10, 'Weekly login bonus - Week 2', '2026-01-19 08:00:00+00'),
('aaaaaaaa-1111-1111-1111-111111111111', 'weekly_login', 10, 'Weekly login bonus - Week 3', '2026-01-26 08:00:00+00'),
('aaaaaaaa-1111-1111-1111-111111111111', 'weekly_login', 10, 'Weekly login bonus - Week 4', '2026-02-02 08:00:00+00'),
('aaaaaaaa-1111-1111-1111-111111111111', 'weekly_login', 10, 'Weekly login bonus - Week 5', '2026-02-09 08:00:00+00'),
('aaaaaaaa-1111-1111-1111-111111111111', 'weekly_login', 10, 'Weekly login bonus - Week 6', '2026-02-16 08:00:00+00'),
('aaaaaaaa-1111-1111-1111-111111111111', 'weekly_login', 10, 'Weekly login bonus - Week 7', '2026-02-23 08:00:00+00'),
('aaaaaaaa-1111-1111-1111-111111111111', 'weekly_login', 10, 'Weekly login bonus - Week 8', '2026-03-02 08:00:00+00'),
('aaaaaaaa-1111-1111-1111-111111111111', 'weekly_login', 10, 'Weekly login bonus - Week 9', '2026-03-09 08:00:00+00'),
('aaaaaaaa-1111-1111-1111-111111111111', 'weekly_login', 10, 'Weekly login bonus - Week 10', '2026-03-16 08:00:00+00'),
('aaaaaaaa-1111-1111-1111-111111111111', 'weekly_login', 10, 'Weekly login bonus - Week 11', '2026-03-23 08:00:00+00'),
('aaaaaaaa-1111-1111-1111-111111111111', 'weekly_login', 10, 'Weekly login bonus - Week 12', '2026-03-30 08:00:00+00'),
-- Consecutive weeks bonuses (every 4 weeks)
('aaaaaaaa-1111-1111-1111-111111111111', 'consecutive_weeks', 25, '4-week streak bonus', '2026-02-02 09:00:00+00'),
('aaaaaaaa-1111-1111-1111-111111111111', 'consecutive_weeks', 25, '8-week streak bonus', '2026-03-02 09:00:00+00'),
('aaaaaaaa-1111-1111-1111-111111111111', 'consecutive_weeks', 25, '12-week streak bonus', '2026-03-30 09:00:00+00'),
-- Disruption active bonuses (4 disruption events)
('aaaaaaaa-1111-1111-1111-111111111111', 'disruption_active', 20, 'Active during heavy rainfall - mumbai', '2026-01-21 12:00:00+00'),
('aaaaaaaa-1111-1111-1111-111111111111', 'disruption_active', 20, 'Active during heavy rainfall - mumbai', '2026-02-04 12:00:00+00'),
('aaaaaaaa-1111-1111-1111-111111111111', 'disruption_active', 20, 'Active during heavy rainfall - mumbai', '2026-02-25 12:00:00+00'),
('aaaaaaaa-1111-1111-1111-111111111111', 'disruption_active', 20, 'Active during heavy rainfall - mumbai', '2026-03-25 12:00:00+00'),
-- Referral bonuses (referred Suresh and Amit)
('aaaaaaaa-1111-1111-1111-111111111111', 'referral', 30, 'Referral bonus - Suresh Patel joined', '2026-03-20 12:00:00+00'),
('aaaaaaaa-1111-1111-1111-111111111111', 'referral', 30, 'Referral bonus - Amit Deshmukh joined', '2026-03-01 12:00:00+00'),
-- Clean claims bonus
('aaaaaaaa-1111-1111-1111-111111111111', 'clean_claims', 15, 'Clean claims record bonus', '2026-03-30 10:00:00+00'),
-- Redeemed discount
('aaaaaaaa-1111-1111-1111-111111111111', 'redeemed_discount', -30, 'Redeemed 30 coins for premium discount', '2026-03-30 10:30:00+00');
-- Total: 50 + 120 + 75 + 80 + 60 + 15 - 30 = 370... need more
-- Adding additional clean claims and disruption bonus to reach 450
INSERT INTO coins_ledger (profile_id, activity, coins, description, created_at) VALUES
('aaaaaaaa-1111-1111-1111-111111111111', 'clean_claims', 40, 'Monthly clean claims streak', '2026-02-28 10:00:00+00'),
('aaaaaaaa-1111-1111-1111-111111111111', 'disruption_active', 20, 'Active during platform outage', '2026-03-25 13:00:00+00'),
('aaaaaaaa-1111-1111-1111-111111111111', 'clean_claims', 20, 'Perfect claims record Q1', '2026-03-31 10:00:00+00');
-- Total: 370 + 40 + 20 + 20 = 450

-- ---------------------------------------------------------------------------
-- Priya: target 200 coins
-- ---------------------------------------------------------------------------
INSERT INTO coins_ledger (profile_id, activity, coins, description, created_at) VALUES
-- Complete profile bonus
('aaaaaaaa-2222-2222-2222-222222222222', 'complete_profile', 50, 'Profile completion bonus', '2026-02-15 12:00:00+00'),
-- Weekly logins (6 weeks: w7-w12)
('aaaaaaaa-2222-2222-2222-222222222222', 'weekly_login', 10, 'Weekly login bonus - Week 7', '2026-02-23 08:00:00+00'),
('aaaaaaaa-2222-2222-2222-222222222222', 'weekly_login', 10, 'Weekly login bonus - Week 8', '2026-03-02 08:00:00+00'),
('aaaaaaaa-2222-2222-2222-222222222222', 'weekly_login', 10, 'Weekly login bonus - Week 9', '2026-03-09 08:00:00+00'),
('aaaaaaaa-2222-2222-2222-222222222222', 'weekly_login', 10, 'Weekly login bonus - Week 10', '2026-03-16 08:00:00+00'),
('aaaaaaaa-2222-2222-2222-222222222222', 'weekly_login', 10, 'Weekly login bonus - Week 11', '2026-03-23 08:00:00+00'),
('aaaaaaaa-2222-2222-2222-222222222222', 'weekly_login', 10, 'Weekly login bonus - Week 12', '2026-03-30 08:00:00+00'),
-- Disruption active bonuses (2 claims)
('aaaaaaaa-2222-2222-2222-222222222222', 'disruption_active', 20, 'Active during AQI GRAP-IV - delhi', '2026-03-11 12:00:00+00'),
('aaaaaaaa-2222-2222-2222-222222222222', 'disruption_active', 20, 'Active during curfew/bandh - delhi', '2026-03-18 12:00:00+00'),
-- Consecutive weeks bonus
('aaaaaaaa-2222-2222-2222-222222222222', 'consecutive_weeks', 25, '4-week streak bonus', '2026-03-16 09:00:00+00'),
-- Clean claims bonus
('aaaaaaaa-2222-2222-2222-222222222222', 'clean_claims', 25, 'Clean claims record bonus', '2026-03-30 10:00:00+00');
-- Total: 50 + 60 + 40 + 25 + 25 = 200

-- ---------------------------------------------------------------------------
-- Suresh: target 30 coins
-- ---------------------------------------------------------------------------
INSERT INTO coins_ledger (profile_id, activity, coins, description, created_at) VALUES
-- Weekly logins (2 weeks: w11-w12)
('aaaaaaaa-3333-3333-3333-333333333333', 'weekly_login', 10, 'Weekly login bonus - Week 11', '2026-03-23 08:00:00+00'),
('aaaaaaaa-3333-3333-3333-333333333333', 'weekly_login', 10, 'Weekly login bonus - Week 12', '2026-03-30 08:00:00+00'),
-- Disruption active bonus (1 claim)
('aaaaaaaa-3333-3333-3333-333333333333', 'disruption_active', 10, 'Active during heavy rainfall - bangalore', '2026-03-25 12:00:00+00');
-- Total: 10 + 10 + 10 = 30

-- ---------------------------------------------------------------------------
-- Meera: target 380 coins
-- ---------------------------------------------------------------------------
INSERT INTO coins_ledger (profile_id, activity, coins, description, created_at) VALUES
-- Complete profile bonus
('aaaaaaaa-4444-4444-4444-444444444444', 'complete_profile', 50, 'Profile completion bonus', '2026-01-25 12:00:00+00'),
-- Weekly logins (8 weeks: w5-w12)
('aaaaaaaa-4444-4444-4444-444444444444', 'weekly_login', 10, 'Weekly login bonus - Week 5', '2026-02-09 08:00:00+00'),
('aaaaaaaa-4444-4444-4444-444444444444', 'weekly_login', 10, 'Weekly login bonus - Week 6', '2026-02-16 08:00:00+00'),
('aaaaaaaa-4444-4444-4444-444444444444', 'weekly_login', 10, 'Weekly login bonus - Week 7', '2026-02-23 08:00:00+00'),
('aaaaaaaa-4444-4444-4444-444444444444', 'weekly_login', 10, 'Weekly login bonus - Week 8', '2026-03-02 08:00:00+00'),
('aaaaaaaa-4444-4444-4444-444444444444', 'weekly_login', 10, 'Weekly login bonus - Week 9', '2026-03-09 08:00:00+00'),
('aaaaaaaa-4444-4444-4444-444444444444', 'weekly_login', 10, 'Weekly login bonus - Week 10', '2026-03-16 08:00:00+00'),
('aaaaaaaa-4444-4444-4444-444444444444', 'weekly_login', 10, 'Weekly login bonus - Week 11', '2026-03-23 08:00:00+00'),
('aaaaaaaa-4444-4444-4444-444444444444', 'weekly_login', 10, 'Weekly login bonus - Week 12', '2026-03-30 08:00:00+00'),
-- Consecutive weeks bonuses (every 4 weeks)
('aaaaaaaa-4444-4444-4444-444444444444', 'consecutive_weeks', 25, '4-week streak bonus', '2026-03-02 09:00:00+00'),
('aaaaaaaa-4444-4444-4444-444444444444', 'consecutive_weeks', 25, '8-week streak bonus', '2026-03-30 09:00:00+00'),
-- Disruption active bonuses (3 claims)
('aaaaaaaa-4444-4444-4444-444444444444', 'disruption_active', 20, 'Active during cyclone - chennai', '2026-02-11 12:00:00+00'),
('aaaaaaaa-4444-4444-4444-444444444444', 'disruption_active', 20, 'Active during cyclone - chennai', '2026-03-04 12:00:00+00'),
('aaaaaaaa-4444-4444-4444-444444444444', 'disruption_active', 20, 'Active during heavy rainfall - chennai', '2026-03-18 12:00:00+00'),
-- Clean claims bonus
('aaaaaaaa-4444-4444-4444-444444444444', 'clean_claims', 40, 'Clean claims record bonus', '2026-03-30 10:00:00+00'),
('aaaaaaaa-4444-4444-4444-444444444444', 'clean_claims', 30, 'Monthly perfect claims streak', '2026-02-28 10:00:00+00'),
-- Redeemed discount
('aaaaaaaa-4444-4444-4444-444444444444', 'redeemed_discount', -10, 'Redeemed 10 coins for premium discount', '2026-03-30 10:30:00+00');
-- Total: 50 + 80 + 50 + 60 + 70 + 30 - 10 = 330... need 50 more
INSERT INTO coins_ledger (profile_id, activity, coins, description, created_at) VALUES
('aaaaaaaa-4444-4444-4444-444444444444', 'clean_claims', 30, 'Perfect Q1 claims record', '2026-03-31 10:00:00+00'),
('aaaaaaaa-4444-4444-4444-444444444444', 'disruption_active', 20, 'Extra disruption resilience bonus', '2026-03-25 12:00:00+00');
-- Total: 330 + 30 + 20 = 380

-- ---------------------------------------------------------------------------
-- Amit: target 150 coins
-- ---------------------------------------------------------------------------
INSERT INTO coins_ledger (profile_id, activity, coins, description, created_at) VALUES
-- Complete profile bonus
('aaaaaaaa-5555-5555-5555-555555555555', 'complete_profile', 50, 'Profile completion bonus', '2026-03-01 12:00:00+00'),
-- Weekly logins (4 weeks: w9-w12)
('aaaaaaaa-5555-5555-5555-555555555555', 'weekly_login', 10, 'Weekly login bonus - Week 9', '2026-03-09 08:00:00+00'),
('aaaaaaaa-5555-5555-5555-555555555555', 'weekly_login', 10, 'Weekly login bonus - Week 10', '2026-03-16 08:00:00+00'),
('aaaaaaaa-5555-5555-5555-555555555555', 'weekly_login', 10, 'Weekly login bonus - Week 11', '2026-03-23 08:00:00+00'),
('aaaaaaaa-5555-5555-5555-555555555555', 'weekly_login', 10, 'Weekly login bonus - Week 12', '2026-03-30 08:00:00+00'),
-- Disruption active bonuses (2 claims)
('aaaaaaaa-5555-5555-5555-555555555555', 'disruption_active', 20, 'Active during heavy rainfall - pune', '2026-03-11 12:00:00+00'),
('aaaaaaaa-5555-5555-5555-555555555555', 'disruption_active', 20, 'Active during heavy rainfall - pune', '2026-03-25 12:00:00+00'),
-- Clean claims bonus
('aaaaaaaa-5555-5555-5555-555555555555', 'clean_claims', 20, 'Clean claims record bonus', '2026-03-30 10:00:00+00');
-- Total: 50 + 40 + 40 + 20 = 150

-- ---------------------------------------------------------------------------
-- Lakshmi: target 40 coins
-- ---------------------------------------------------------------------------
INSERT INTO coins_ledger (profile_id, activity, coins, description, created_at) VALUES
-- Weekly logins (3 weeks: w10-w12)
('aaaaaaaa-6666-6666-6666-666666666666', 'weekly_login', 10, 'Weekly login bonus - Week 10', '2026-03-16 08:00:00+00'),
('aaaaaaaa-6666-6666-6666-666666666666', 'weekly_login', 10, 'Weekly login bonus - Week 11', '2026-03-23 08:00:00+00'),
('aaaaaaaa-6666-6666-6666-666666666666', 'weekly_login', 10, 'Weekly login bonus - Week 12', '2026-03-30 08:00:00+00'),
-- Small bonus
('aaaaaaaa-6666-6666-6666-666666666666', 'complete_profile', 10, 'Profile verification bonus', '2026-03-10 12:00:00+00');
-- Total: 30 + 10 = 40

-- ---------------------------------------------------------------------------
-- Vikram: target 100 coins
-- ---------------------------------------------------------------------------
INSERT INTO coins_ledger (profile_id, activity, coins, description, created_at) VALUES
-- Complete profile bonus
('aaaaaaaa-7777-7777-7777-777777777777', 'complete_profile', 50, 'Profile completion bonus', '2026-02-20 12:00:00+00'),
-- Weekly logins (5 weeks: w8-w12)
('aaaaaaaa-7777-7777-7777-777777777777', 'weekly_login', 10, 'Weekly login bonus - Week 8', '2026-03-02 08:00:00+00'),
('aaaaaaaa-7777-7777-7777-777777777777', 'weekly_login', 10, 'Weekly login bonus - Week 9', '2026-03-09 08:00:00+00'),
('aaaaaaaa-7777-7777-7777-777777777777', 'weekly_login', 10, 'Weekly login bonus - Week 10', '2026-03-16 08:00:00+00'),
('aaaaaaaa-7777-7777-7777-777777777777', 'weekly_login', 10, 'Weekly login bonus - Week 11', '2026-03-23 08:00:00+00'),
('aaaaaaaa-7777-7777-7777-777777777777', 'weekly_login', 10, 'Weekly login bonus - Week 12', '2026-03-30 08:00:00+00');
-- Total: 50 + 50 = 100

-- ============================================================================
-- SECTION 8: System Logs (15 entries)
-- Various adjudicator_run, payout, fraud_alert entries spanning 12 weeks
-- ============================================================================

INSERT INTO system_logs (event_type, severity, metadata, created_at) VALUES
-- Week 2: Adjudicator run for Mumbai rainfall
(
  'adjudicator_run', 'info',
  '{"run_id": "run-w02-001", "zones_checked": 7, "triggers_detected": 1, "events_created": 1, "claims_created": 1, "duration_ms": 3200}'::jsonb,
  '2026-01-21 10:31:00+00'
),
-- Week 3: Adjudicator run for Delhi AQI
(
  'adjudicator_run', 'info',
  '{"run_id": "run-w03-001", "zones_checked": 7, "triggers_detected": 1, "events_created": 1, "claims_created": 0, "duration_ms": 2800}'::jsonb,
  '2026-01-28 10:31:00+00'
),
-- Week 4: Adjudicator run for Mumbai rainfall
(
  'adjudicator_run', 'info',
  '{"run_id": "run-w04-001", "zones_checked": 7, "triggers_detected": 1, "events_created": 1, "claims_created": 1, "duration_ms": 3100}'::jsonb,
  '2026-02-04 10:31:00+00'
),
-- Week 4: Payout for Rajesh claim 2
(
  'payout', 'info',
  '{"claim_id": "dddddddd-0000-0000-0000-000000000002", "amount_inr": 2000, "method": "upi_instant", "status": "completed", "driver": "Rajesh Kumar"}'::jsonb,
  '2026-02-04 11:16:00+00'
),
-- Week 5: Adjudicator run for Chennai cyclone
(
  'adjudicator_run', 'info',
  '{"run_id": "run-w05-001", "zones_checked": 7, "triggers_detected": 1, "events_created": 1, "claims_created": 1, "duration_ms": 2500}'::jsonb,
  '2026-02-11 10:31:00+00'
),
-- Week 7: Multi-event adjudicator run
(
  'adjudicator_run', 'info',
  '{"run_id": "run-w07-001", "zones_checked": 7, "triggers_detected": 2, "events_created": 2, "claims_created": 1, "duration_ms": 4100}'::jsonb,
  '2026-02-25 10:31:00+00'
),
-- Week 9: Multi-event adjudicator run
(
  'adjudicator_run', 'info',
  '{"run_id": "run-w09-001", "zones_checked": 7, "triggers_detected": 3, "events_created": 3, "claims_created": 4, "duration_ms": 5200}'::jsonb,
  '2026-03-11 10:31:00+00'
),
-- Week 9: Payout batch
(
  'payout', 'info',
  '{"batch_id": "batch-w09-001", "total_payouts": 4, "total_amount_inr": 7400, "method": "upi_instant", "status": "completed"}'::jsonb,
  '2026-03-11 11:16:00+00'
),
-- Week 10: Adjudicator run
(
  'adjudicator_run', 'info',
  '{"run_id": "run-w10-001", "zones_checked": 7, "triggers_detected": 3, "events_created": 3, "claims_created": 3, "duration_ms": 4800}'::jsonb,
  '2026-03-18 10:31:00+00'
),
-- Week 10: Fraud alert for Vikram
(
  'fraud_alert', 'warning',
  '{"type": "gps_anomaly", "driver_id": "aaaaaaaa-7777-7777-7777-777777777777", "driver_name": "Vikram Das", "claim_id": "dddddddd-0000-0000-0000-000000000016", "message": "GPS location 45.2km outside declared zone during kolkata rainfall event", "fraud_score": 0.75}'::jsonb,
  '2026-03-18 10:45:00+00'
),
-- Week 11: Large adjudicator run
(
  'adjudicator_run', 'info',
  '{"run_id": "run-w11-001", "zones_checked": 7, "triggers_detected": 4, "events_created": 4, "claims_created": 5, "duration_ms": 6100}'::jsonb,
  '2026-03-25 10:31:00+00'
),
-- Week 11: Payout batch
(
  'payout', 'info',
  '{"batch_id": "batch-w11-001", "total_payouts": 5, "total_amount_inr": 9000, "method": "upi_instant", "status": "completed"}'::jsonb,
  '2026-03-25 11:16:00+00'
),
-- Week 12: Active events adjudicator run
(
  'adjudicator_run', 'info',
  '{"run_id": "run-w12-001", "zones_checked": 7, "triggers_detected": 2, "events_created": 2, "claims_created": 2, "duration_ms": 3500}'::jsonb,
  '2026-04-01 10:31:00+00'
),
-- Week 12: Fraud monitoring sweep - clean
(
  'fraud_alert', 'info',
  '{"type": "routine_sweep", "claims_scanned": 17, "flagged": 1, "message": "Routine fraud sweep completed. 1 previously flagged claim (Vikram Das - rejected)."}'::jsonb,
  '2026-04-01 11:00:00+00'
),
-- Week 12: System health check
(
  'adjudicator_run', 'info',
  '{"run_id": "run-w12-health", "zones_checked": 7, "triggers_detected": 0, "events_created": 0, "claims_created": 0, "duration_ms": 1200, "note": "Scheduled health check - no new triggers"}'::jsonb,
  '2026-04-02 06:00:00+00'
);

-- ============================================================================
-- SECTION 9: Premium Recommendations (7 entries, one per active driver for w12)
-- ============================================================================

INSERT INTO premium_recommendations (
  profile_id, week_start_date,
  base_premium, weather_risk, ubi_adjustment, final_premium,
  reasoning, forecast_data, created_at
) VALUES
-- Rajesh (high tier)
(
  'aaaaaaaa-1111-1111-1111-111111111111',
  '2026-03-30',
  160.00, 18.00, 12.00, 190.00,
  'Rajesh is a veteran driver with 12 consecutive weeks and a trust score of 0.92. Base high-tier premium of Rs 160. Weather risk addon of Rs 18 reflects elevated monsoon pre-season rainfall forecasts for Mumbai (75mm expected). UBI addon of Rs 12 accounts for his high claim frequency (4 rainfall claims plus 1 outage claim across 12 weeks) despite excellent gate-pass rates and zero fraud flags. Net premium is Rs 190.',
  '{"city": "mumbai", "forecast_rainfall_mm": 75, "forecast_aqi": 120, "cyclone_risk": "low"}'::jsonb,
  '2026-03-29 18:00:00+00'
),
-- Priya (medium tier)
(
  'aaaaaaaa-2222-2222-2222-222222222222',
  '2026-03-30',
  120.00, 18.00, 5.00, 143.00,
  'Priya has been active for 6 weeks with a trust score of 0.75. Base medium-tier premium of Rs 120. Weather risk addon of Rs 18 reflects Delhi entering a high AQI period with GRAP-IV likely to be triggered again. UBI addon of Rs 5 reflects moderate claim history (2 paid claims in 6 weeks) with clean gate-pass records. Net premium is Rs 143.',
  '{"city": "delhi", "forecast_rainfall_mm": 10, "forecast_aqi": 470, "cyclone_risk": "none"}'::jsonb,
  '2026-03-29 18:00:00+00'
),
-- Suresh (normal tier)
(
  'aaaaaaaa-3333-3333-3333-333333333333',
  '2026-03-30',
  80.00, 18.00, 0.00, 98.00,
  'Suresh is a new driver with only 2 weeks of history and trust score of 0.50. Base normal-tier premium of Rs 80. Weather risk addon of Rs 18 for Bangalore pre-monsoon rainfall risk. No UBI addon as he is too new for behavioral adjustment. Referred by Rajesh Kumar. Net premium is Rs 98.',
  '{"city": "bangalore", "forecast_rainfall_mm": 60, "forecast_aqi": 80, "cyclone_risk": "none"}'::jsonb,
  '2026-03-29 18:00:00+00'
),
-- Meera (high tier)
(
  'aaaaaaaa-4444-4444-4444-444444444444',
  '2026-03-30',
  160.00, 18.00, 7.00, 185.00,
  'Meera has 8 weeks of coverage with a trust score of 0.85. Base high-tier premium of Rs 160. Weather risk addon of Rs 18 reflects elevated cyclone and rainfall risk in Chennai coastal zone. UBI addon of Rs 7 accounts for 3 paid claims (2 cyclone, 1 rainfall) in 8 weeks with perfect gate verification. Net premium is Rs 185.',
  '{"city": "chennai", "forecast_rainfall_mm": 55, "forecast_aqi": 90, "cyclone_risk": "moderate"}'::jsonb,
  '2026-03-29 18:00:00+00'
),
-- Amit (medium tier)
(
  'aaaaaaaa-5555-5555-5555-555555555555',
  '2026-03-30',
  120.00, 18.00, 3.00, 141.00,
  'Amit has 4 weeks of coverage with a trust score of 0.65. Base medium-tier premium of Rs 120. Weather risk addon of Rs 18 for Pune pre-monsoon season. UBI addon of Rs 3 accounts for 2 paid claims in 4 weeks — moderate claim frequency relative to tenure. Referred by Rajesh Kumar. Net premium is Rs 141.',
  '{"city": "pune", "forecast_rainfall_mm": 50, "forecast_aqi": 100, "cyclone_risk": "none"}'::jsonb,
  '2026-03-29 18:00:00+00'
),
-- Lakshmi (normal tier)
(
  'aaaaaaaa-6666-6666-6666-666666666666',
  '2026-03-30',
  80.00, 18.00, 0.00, 98.00,
  'Lakshmi has 3 weeks of coverage with a trust score of 0.55. Base normal-tier premium of Rs 80. Weather risk addon of Rs 18 for Hyderabad seasonal weather. No UBI addon — zero claims filed, insufficient history for behavioral pricing. Net premium is Rs 98.',
  '{"city": "hyderabad", "forecast_rainfall_mm": 35, "forecast_aqi": 110, "cyclone_risk": "low"}'::jsonb,
  '2026-03-29 18:00:00+00'
),
-- Vikram (high tier)
(
  'aaaaaaaa-7777-7777-7777-777777777777',
  '2026-03-30',
  160.00, 18.00, 4.00, 182.00,
  'Vikram has 5 weeks of coverage with a low trust score of 0.30 due to a rejected fraud claim. Base high-tier premium of Rs 160. Weather risk addon of Rs 18 for Kolkata cyclone season risk. UBI addon of Rs 4 reflects 1 rejected claim (GPS fraud flagged) and 1 appealed claim. Trust score significantly penalized — future premiums may increase if appeal is denied. Net premium is Rs 182.',
  '{"city": "kolkata", "forecast_rainfall_mm": 45, "forecast_aqi": 95, "cyclone_risk": "moderate"}'::jsonb,
  '2026-03-29 18:00:00+00'
);

-- ============================================================================
-- SECTION 10: Update total_payout_this_week on all policies
-- ============================================================================

UPDATE weekly_policies wp SET total_payout_this_week = COALESCE(
  (SELECT SUM(payout_amount_inr) FROM parametric_claims pc WHERE pc.policy_id = wp.id AND pc.status = 'paid'), 0
);

-- ============================================================================
-- Done. Verify with:
--   SELECT COUNT(*) FROM auth.users;                  -- 8
--   SELECT COUNT(*) FROM profiles;                    -- 8
--   SELECT COUNT(*) FROM live_disruption_events;      -- 21
--   SELECT COUNT(*) FROM weekly_policies;             -- 40
--   SELECT COUNT(*) FROM parametric_claims;           -- 17
--   SELECT COUNT(*) FROM payout_ledger;               -- 13
--   SELECT COUNT(*) FROM premium_recommendations;     -- 7
--   SELECT COUNT(*) FROM system_logs;                 -- 15
--   SELECT SUM(coins) FROM coins_ledger WHERE profile_id = 'aaaaaaaa-1111-1111-1111-111111111111'; -- 450
--   SELECT SUM(coins) FROM coins_ledger WHERE profile_id = 'aaaaaaaa-2222-2222-2222-222222222222'; -- 200
--   SELECT SUM(coins) FROM coins_ledger WHERE profile_id = 'aaaaaaaa-3333-3333-3333-333333333333'; -- 30
--   SELECT SUM(coins) FROM coins_ledger WHERE profile_id = 'aaaaaaaa-4444-4444-4444-444444444444'; -- 380
--   SELECT SUM(coins) FROM coins_ledger WHERE profile_id = 'aaaaaaaa-5555-5555-5555-555555555555'; -- 150
--   SELECT SUM(coins) FROM coins_ledger WHERE profile_id = 'aaaaaaaa-6666-6666-6666-666666666666'; -- 40
--   SELECT SUM(coins) FROM coins_ledger WHERE profile_id = 'aaaaaaaa-7777-7777-7777-777777777777'; -- 100
-- ============================================================================
