-- ============================================================================
-- Add ~25 "quiet" drivers to balance BCR
-- Run AFTER comprehensive-seed.sql
--
-- These users pay weekly premiums but rarely or never claim.
-- Current state: ~22,650 INR in paid claims, ~7,413 INR in premiums => BCR > 3.0
-- Target BCR:  0.55-0.70
--
-- Strategy:
--   25 quiet users, 8-12 weeks each, shifted toward Medium/High tiers
--   Total new premiums: ~33,750 INR
--   Plus 4 small claims (4 x 1,000 = 4,000 INR)
--   New BCR = (22,650 + 4,000) / (7,413 + 33,750) = 26,650 / 41,163 = 0.647
-- ============================================================================

-- ============================================================================
-- SECTION 1: auth.users entries (25 quiet users)
-- The handle_new_user trigger will auto-create profiles rows.
-- UUID format: eeeeeeee-00XX-0000-0000-000000000000 where XX = user number
-- ============================================================================

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES
-- Q01: Deepak Rane (Mumbai, Powai)
(
  'eeeeeeee-0001-0000-0000-000000000000'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated',
  'deepak.rane@safeshift.app',
  crypt('quiet_user_01', gen_salt('bf')),
  NOW(), '{"full_name": "Deepak Rane"}'::jsonb,
  '2026-01-10 08:00:00+05:30'::timestamptz, NOW(),
  '', '', '', ''
),
-- Q02: Santosh Naik (Mumbai, BKC)
(
  'eeeeeeee-0002-0000-0000-000000000000'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated',
  'santosh.naik@safeshift.app',
  crypt('quiet_user_02', gen_salt('bf')),
  NOW(), '{"full_name": "Santosh Naik"}'::jsonb,
  '2026-01-11 09:00:00+05:30'::timestamptz, NOW(),
  '', '', '', ''
),
-- Q03: Pramod Sawant (Mumbai, Goregaon)
(
  'eeeeeeee-0003-0000-0000-000000000000'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated',
  'pramod.sawant@safeshift.app',
  crypt('quiet_user_03', gen_salt('bf')),
  NOW(), '{"full_name": "Pramod Sawant"}'::jsonb,
  '2026-01-14 10:00:00+05:30'::timestamptz, NOW(),
  '', '', '', ''
),
-- Q04: Ganesh Patil (Mumbai, Malad)
(
  'eeeeeeee-0004-0000-0000-000000000000'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated',
  'ganesh.patil@safeshift.app',
  crypt('quiet_user_04', gen_salt('bf')),
  NOW(), '{"full_name": "Ganesh Patil"}'::jsonb,
  '2026-01-15 07:30:00+05:30'::timestamptz, NOW(),
  '', '', '', ''
),
-- Q05: Naveen Gupta (Delhi, Dwarka)
(
  'eeeeeeee-0005-0000-0000-000000000000'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated',
  'naveen.gupta@safeshift.app',
  crypt('quiet_user_05', gen_salt('bf')),
  NOW(), '{"full_name": "Naveen Gupta"}'::jsonb,
  '2026-01-12 08:30:00+05:30'::timestamptz, NOW(),
  '', '', '', ''
),
-- Q06: Rohit Verma (Delhi, Saket)
(
  'eeeeeeee-0006-0000-0000-000000000000'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated',
  'rohit.verma@safeshift.app',
  crypt('quiet_user_06', gen_salt('bf')),
  NOW(), '{"full_name": "Rohit Verma"}'::jsonb,
  '2026-01-18 11:00:00+05:30'::timestamptz, NOW(),
  '', '', '', ''
),
-- Q07: Manish Tiwari (Delhi, Nehru Place)
(
  'eeeeeeee-0007-0000-0000-000000000000'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated',
  'manish.tiwari@safeshift.app',
  crypt('quiet_user_07', gen_salt('bf')),
  NOW(), '{"full_name": "Manish Tiwari"}'::jsonb,
  '2026-02-01 09:00:00+05:30'::timestamptz, NOW(),
  '', '', '', ''
),
-- Q08: Kiran Gowda (Bangalore, Electronic City)
(
  'eeeeeeee-0008-0000-0000-000000000000'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated',
  'kiran.gowda@safeshift.app',
  crypt('quiet_user_08', gen_salt('bf')),
  NOW(), '{"full_name": "Kiran Gowda"}'::jsonb,
  '2026-01-13 07:00:00+05:30'::timestamptz, NOW(),
  '', '', '', ''
),
-- Q09: Ramesh Shetty (Bangalore, MG Road)
(
  'eeeeeeee-0009-0000-0000-000000000000'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated',
  'ramesh.shetty@safeshift.app',
  crypt('quiet_user_09', gen_salt('bf')),
  NOW(), '{"full_name": "Ramesh Shetty"}'::jsonb,
  '2026-01-20 10:30:00+05:30'::timestamptz, NOW(),
  '', '', '', ''
),
-- Q10: Venkatesh Murthy (Bangalore, HSR Layout)
(
  'eeeeeeee-0010-0000-0000-000000000000'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated',
  'venkatesh.murthy@safeshift.app',
  crypt('quiet_user_10', gen_salt('bf')),
  NOW(), '{"full_name": "Venkatesh Murthy"}'::jsonb,
  '2026-02-05 08:00:00+05:30'::timestamptz, NOW(),
  '', '', '', ''
),
-- Q11: Murugan S (Chennai, Anna Nagar)
(
  'eeeeeeee-0011-0000-0000-000000000000'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated',
  'murugan.s@safeshift.app',
  crypt('quiet_user_11', gen_salt('bf')),
  NOW(), '{"full_name": "Murugan S"}'::jsonb,
  '2026-01-16 09:30:00+05:30'::timestamptz, NOW(),
  '', '', '', ''
),
-- Q12: Balaji Krishnan (Chennai, T Nagar)
(
  'eeeeeeee-0012-0000-0000-000000000000'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated',
  'balaji.k@safeshift.app',
  crypt('quiet_user_12', gen_salt('bf')),
  NOW(), '{"full_name": "Balaji Krishnan"}'::jsonb,
  '2026-01-22 10:00:00+05:30'::timestamptz, NOW(),
  '', '', '', ''
),
-- Q13: Ajay Kulkarni (Pune, Kothrud)
(
  'eeeeeeee-0013-0000-0000-000000000000'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated',
  'ajay.kulkarni@safeshift.app',
  crypt('quiet_user_13', gen_salt('bf')),
  NOW(), '{"full_name": "Ajay Kulkarni"}'::jsonb,
  '2026-01-14 11:00:00+05:30'::timestamptz, NOW(),
  '', '', '', ''
),
-- Q14: Sachin More (Pune, Hinjewadi)
(
  'eeeeeeee-0014-0000-0000-000000000000'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated',
  'sachin.more@safeshift.app',
  crypt('quiet_user_14', gen_salt('bf')),
  NOW(), '{"full_name": "Sachin More"}'::jsonb,
  '2026-01-19 08:00:00+05:30'::timestamptz, NOW(),
  '', '', '', ''
),
-- Q15: Vishal Jadhav (Pune, Sinhagad Rd)
(
  'eeeeeeee-0015-0000-0000-000000000000'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated',
  'vishal.jadhav@safeshift.app',
  crypt('quiet_user_15', gen_salt('bf')),
  NOW(), '{"full_name": "Vishal Jadhav"}'::jsonb,
  '2026-02-10 09:30:00+05:30'::timestamptz, NOW(),
  '', '', '', ''
),
-- Q16: Srinivas Rao (Hyderabad, HITEC City)
(
  'eeeeeeee-0016-0000-0000-000000000000'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated',
  'srinivas.rao@safeshift.app',
  crypt('quiet_user_16', gen_salt('bf')),
  NOW(), '{"full_name": "Srinivas Rao"}'::jsonb,
  '2026-01-13 10:00:00+05:30'::timestamptz, NOW(),
  '', '', '', ''
),
-- Q17: Mahesh Reddy (Hyderabad, Gachibowli)
(
  'eeeeeeee-0017-0000-0000-000000000000'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated',
  'mahesh.reddy@safeshift.app',
  crypt('quiet_user_17', gen_salt('bf')),
  NOW(), '{"full_name": "Mahesh Reddy"}'::jsonb,
  '2026-01-17 07:30:00+05:30'::timestamptz, NOW(),
  '', '', '', ''
),
-- Q18: Ravi Prasad (Hyderabad, Kukatpally)
(
  'eeeeeeee-0018-0000-0000-000000000000'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated',
  'ravi.prasad@safeshift.app',
  crypt('quiet_user_18', gen_salt('bf')),
  NOW(), '{"full_name": "Ravi Prasad"}'::jsonb,
  '2026-02-03 08:30:00+05:30'::timestamptz, NOW(),
  '', '', '', ''
),
-- Q19: Subhash Ghosh (Kolkata, Salt Lake)
(
  'eeeeeeee-0019-0000-0000-000000000000'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated',
  'subhash.ghosh@safeshift.app',
  crypt('quiet_user_19', gen_salt('bf')),
  NOW(), '{"full_name": "Subhash Ghosh"}'::jsonb,
  '2026-01-15 09:00:00+05:30'::timestamptz, NOW(),
  '', '', '', ''
),
-- Q20: Tapan Mondal (Kolkata, New Town)
(
  'eeeeeeee-0020-0000-0000-000000000000'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated',
  'tapan.mondal@safeshift.app',
  crypt('quiet_user_20', gen_salt('bf')),
  NOW(), '{"full_name": "Tapan Mondal"}'::jsonb,
  '2026-01-21 10:30:00+05:30'::timestamptz, NOW(),
  '', '', '', ''
),
-- Q21: Jitendra Shah (Ahmedabad, SG Highway)
(
  'eeeeeeee-0021-0000-0000-000000000000'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated',
  'jitendra.shah@safeshift.app',
  crypt('quiet_user_21', gen_salt('bf')),
  NOW(), '{"full_name": "Jitendra Shah"}'::jsonb,
  '2026-01-18 08:00:00+05:30'::timestamptz, NOW(),
  '', '', '', ''
),
-- Q22: Hardik Patel (Ahmedabad, Satellite)
(
  'eeeeeeee-0022-0000-0000-000000000000'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated',
  'hardik.patel@safeshift.app',
  crypt('quiet_user_22', gen_salt('bf')),
  NOW(), '{"full_name": "Hardik Patel"}'::jsonb,
  '2026-02-08 09:00:00+05:30'::timestamptz, NOW(),
  '', '', '', ''
),
-- Q23: Om Prakash Sharma (Jaipur, Mansarovar)
(
  'eeeeeeee-0023-0000-0000-000000000000'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated',
  'omprakash.sharma@safeshift.app',
  crypt('quiet_user_23', gen_salt('bf')),
  NOW(), '{"full_name": "Om Prakash Sharma"}'::jsonb,
  '2026-01-12 07:00:00+05:30'::timestamptz, NOW(),
  '', '', '', ''
),
-- Q24: Dinesh Meena (Jaipur, Malviya Nagar)
(
  'eeeeeeee-0024-0000-0000-000000000000'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated',
  'dinesh.meena@safeshift.app',
  crypt('quiet_user_24', gen_salt('bf')),
  NOW(), '{"full_name": "Dinesh Meena"}'::jsonb,
  '2026-01-25 10:00:00+05:30'::timestamptz, NOW(),
  '', '', '', ''
),
-- Q25: Akhilesh Yadav (Lucknow, Indira Nagar)
(
  'eeeeeeee-0025-0000-0000-000000000000'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated',
  'akhilesh.yadav@safeshift.app',
  crypt('quiet_user_25', gen_salt('bf')),
  NOW(), '{"full_name": "Akhilesh Yadav"}'::jsonb,
  '2026-02-12 11:00:00+05:30'::timestamptz, NOW(),
  '', '', '', ''
);

-- ============================================================================
-- SECTION 2: UPDATE profiles (25 users)
-- The handle_new_user trigger auto-created rows. Now update each with details.
--
-- Tier assignments (8 Normal, 9 Medium, 8 High):
--   Normal: Q04, Q07, Q10, Q12, Q15, Q18, Q20, Q24
--   Medium: Q01, Q02, Q05, Q06, Q08, Q13, Q14, Q22, Q25
--   High:   Q03, Q09, Q11, Q16, Q17, Q19, Q21, Q23
-- ============================================================================

-- Q01: Deepak Rane - Mumbai, Powai (Medium tier)
UPDATE profiles SET
  phone_number     = '919800100001',
  language         = 'mr',
  aadhaar_verified = true,
  aadhaar_hash     = md5('AADHAAR-DEEPAK-RANE'),
  dl_number        = 'MH0120220098001',
  dl_verified      = true,
  rc_number        = 'MH01QA0001',
  rc_verified      = true,
  vehicle_hash     = md5('VIN-Q01'),
  upi_id           = 'deepak.rane@upi',
  upi_verified     = true,
  city             = 'mumbai',
  zone_latitude    = 19.118000,
  zone_longitude   = 72.906000,
  onboarding_status = 'complete',
  role             = 'driver',
  trust_score      = 0.72,
  referral_code    = 'DEEPAK01'
WHERE id = 'eeeeeeee-0001-0000-0000-000000000000';

-- Q02: Santosh Naik - Mumbai, BKC (Medium tier)
UPDATE profiles SET
  phone_number     = '919800100002',
  language         = 'mr',
  aadhaar_verified = true,
  aadhaar_hash     = md5('AADHAAR-SANTOSH-NAIK'),
  dl_number        = 'MH0120220098002',
  dl_verified      = true,
  rc_number        = 'MH01QA0002',
  rc_verified      = true,
  vehicle_hash     = md5('VIN-Q02'),
  upi_id           = 'santosh.naik@upi',
  upi_verified     = true,
  city             = 'mumbai',
  zone_latitude    = 19.065000,
  zone_longitude   = 72.870000,
  onboarding_status = 'complete',
  role             = 'driver',
  trust_score      = 0.68,
  referral_code    = 'SNTOSH02'
WHERE id = 'eeeeeeee-0002-0000-0000-000000000000';

-- Q03: Pramod Sawant - Mumbai, Goregaon (High tier)
UPDATE profiles SET
  phone_number     = '919800100003',
  language         = 'hi',
  aadhaar_verified = true,
  aadhaar_hash     = md5('AADHAAR-PRAMOD-SAWANT'),
  dl_number        = 'MH0120210098003',
  dl_verified      = true,
  rc_number        = 'MH01QA0003',
  rc_verified      = true,
  vehicle_hash     = md5('VIN-Q03'),
  upi_id           = 'pramod.sawant@upi',
  upi_verified     = true,
  city             = 'mumbai',
  zone_latitude    = 19.165000,
  zone_longitude   = 72.849000,
  onboarding_status = 'complete',
  role             = 'driver',
  trust_score      = 0.75,
  referral_code    = 'PRAMOD03'
WHERE id = 'eeeeeeee-0003-0000-0000-000000000000';

-- Q04: Ganesh Patil - Mumbai, Malad (Normal tier)
UPDATE profiles SET
  phone_number     = '919800100004',
  language         = 'mr',
  aadhaar_verified = true,
  aadhaar_hash     = md5('AADHAAR-GANESH-PATIL'),
  dl_number        = 'MH0120210098004',
  dl_verified      = true,
  rc_number        = 'MH01QA0004',
  rc_verified      = true,
  vehicle_hash     = md5('VIN-Q04'),
  upi_id           = 'ganesh.patil@upi',
  upi_verified     = true,
  city             = 'mumbai',
  zone_latitude    = 19.187000,
  zone_longitude   = 72.848000,
  onboarding_status = 'complete',
  role             = 'driver',
  trust_score      = 0.60,
  referral_code    = 'GANESH04'
WHERE id = 'eeeeeeee-0004-0000-0000-000000000000';

-- Q05: Naveen Gupta - Delhi, Dwarka (Medium tier)
UPDATE profiles SET
  phone_number     = '919800100005',
  language         = 'hi',
  aadhaar_verified = true,
  aadhaar_hash     = md5('AADHAAR-NAVEEN-GUPTA'),
  dl_number        = 'DL0620220098005',
  dl_verified      = true,
  rc_number        = 'DL06QA0005',
  rc_verified      = true,
  vehicle_hash     = md5('VIN-Q05'),
  upi_id           = 'naveen.gupta@upi',
  upi_verified     = true,
  city             = 'delhi',
  zone_latitude    = 28.592000,
  zone_longitude   = 77.050000,
  onboarding_status = 'complete',
  role             = 'driver',
  trust_score      = 0.70,
  referral_code    = 'NAVEEN05'
WHERE id = 'eeeeeeee-0005-0000-0000-000000000000';

-- Q06: Rohit Verma - Delhi, Saket (Medium tier)
UPDATE profiles SET
  phone_number     = '919800100006',
  language         = 'hi',
  aadhaar_verified = true,
  aadhaar_hash     = md5('AADHAAR-ROHIT-VERMA'),
  dl_number        = 'DL0620210098006',
  dl_verified      = true,
  rc_number        = 'DL06QA0006',
  rc_verified      = true,
  vehicle_hash     = md5('VIN-Q06'),
  upi_id           = 'rohit.verma@upi',
  upi_verified     = true,
  city             = 'delhi',
  zone_latitude    = 28.524000,
  zone_longitude   = 77.210000,
  onboarding_status = 'complete',
  role             = 'driver',
  trust_score      = 0.65,
  referral_code    = 'ROHIT006'
WHERE id = 'eeeeeeee-0006-0000-0000-000000000000';

-- Q07: Manish Tiwari - Delhi, Nehru Place (Normal tier)
UPDATE profiles SET
  phone_number     = '919800100007',
  language         = 'hi',
  aadhaar_verified = true,
  aadhaar_hash     = md5('AADHAAR-MANISH-TIWARI'),
  dl_number        = 'DL0620220098007',
  dl_verified      = true,
  rc_number        = 'DL06QA0007',
  rc_verified      = true,
  vehicle_hash     = md5('VIN-Q07'),
  upi_id           = 'manish.tiwari@upi',
  upi_verified     = true,
  city             = 'delhi',
  zone_latitude    = 28.549000,
  zone_longitude   = 77.253000,
  onboarding_status = 'complete',
  role             = 'driver',
  trust_score      = 0.58,
  referral_code    = 'MANISH07'
WHERE id = 'eeeeeeee-0007-0000-0000-000000000000';

-- Q08: Kiran Gowda - Bangalore, Electronic City (Medium tier)
UPDATE profiles SET
  phone_number     = '919800100008',
  language         = 'en',
  aadhaar_verified = true,
  aadhaar_hash     = md5('AADHAAR-KIRAN-GOWDA'),
  dl_number        = 'KA0120220098008',
  dl_verified      = true,
  rc_number        = 'KA01QA0008',
  rc_verified      = true,
  vehicle_hash     = md5('VIN-Q08'),
  upi_id           = 'kiran.gowda@upi',
  upi_verified     = true,
  city             = 'bangalore',
  zone_latitude    = 12.845000,
  zone_longitude   = 77.660000,
  onboarding_status = 'complete',
  role             = 'driver',
  trust_score      = 0.74,
  referral_code    = 'KIRAN008'
WHERE id = 'eeeeeeee-0008-0000-0000-000000000000';

-- Q09: Ramesh Shetty - Bangalore, MG Road (High tier)
UPDATE profiles SET
  phone_number     = '919800100009',
  language         = 'en',
  aadhaar_verified = true,
  aadhaar_hash     = md5('AADHAAR-RAMESH-SHETTY'),
  dl_number        = 'KA0120210098009',
  dl_verified      = true,
  rc_number        = 'KA01QA0009',
  rc_verified      = true,
  vehicle_hash     = md5('VIN-Q09'),
  upi_id           = 'ramesh.shetty@upi',
  upi_verified     = true,
  city             = 'bangalore',
  zone_latitude    = 12.975000,
  zone_longitude   = 77.607000,
  onboarding_status = 'complete',
  role             = 'driver',
  trust_score      = 0.78,
  referral_code    = 'RAMESH09'
WHERE id = 'eeeeeeee-0009-0000-0000-000000000000';

-- Q10: Venkatesh Murthy - Bangalore, HSR Layout (Normal tier)
UPDATE profiles SET
  phone_number     = '919800100010',
  language         = 'en',
  aadhaar_verified = true,
  aadhaar_hash     = md5('AADHAAR-VENKATESH-M'),
  dl_number        = 'KA0120220098010',
  dl_verified      = true,
  rc_number        = 'KA01QA0010',
  rc_verified      = true,
  vehicle_hash     = md5('VIN-Q10'),
  upi_id           = 'venkatesh.m@upi',
  upi_verified     = true,
  city             = 'bangalore',
  zone_latitude    = 12.912000,
  zone_longitude   = 77.638000,
  onboarding_status = 'complete',
  role             = 'driver',
  trust_score      = 0.62,
  referral_code    = 'VNKTS010'
WHERE id = 'eeeeeeee-0010-0000-0000-000000000000';

-- Q11: Murugan S - Chennai, Anna Nagar (High tier)
UPDATE profiles SET
  phone_number     = '919800100011',
  language         = 'ta',
  aadhaar_verified = true,
  aadhaar_hash     = md5('AADHAAR-MURUGAN-S'),
  dl_number        = 'TN0920220098011',
  dl_verified      = true,
  rc_number        = 'TN09QA0011',
  rc_verified      = true,
  vehicle_hash     = md5('VIN-Q11'),
  upi_id           = 'murugan.s@upi',
  upi_verified     = true,
  city             = 'chennai',
  zone_latitude    = 13.085000,
  zone_longitude   = 80.210000,
  onboarding_status = 'complete',
  role             = 'driver',
  trust_score      = 0.70,
  referral_code    = 'MRUGN011'
WHERE id = 'eeeeeeee-0011-0000-0000-000000000000';

-- Q12: Balaji Krishnan - Chennai, T Nagar (Normal tier)
UPDATE profiles SET
  phone_number     = '919800100012',
  language         = 'ta',
  aadhaar_verified = true,
  aadhaar_hash     = md5('AADHAAR-BALAJI-K'),
  dl_number        = 'TN0920210098012',
  dl_verified      = true,
  rc_number        = 'TN09QA0012',
  rc_verified      = true,
  vehicle_hash     = md5('VIN-Q12'),
  upi_id           = 'balaji.k@upi',
  upi_verified     = true,
  city             = 'chennai',
  zone_latitude    = 13.040000,
  zone_longitude   = 80.234000,
  onboarding_status = 'complete',
  role             = 'driver',
  trust_score      = 0.66,
  referral_code    = 'BALAJ012'
WHERE id = 'eeeeeeee-0012-0000-0000-000000000000';

-- Q13: Ajay Kulkarni - Pune, Kothrud (Medium tier)
UPDATE profiles SET
  phone_number     = '919800100013',
  language         = 'mr',
  aadhaar_verified = true,
  aadhaar_hash     = md5('AADHAAR-AJAY-KULKARNI'),
  dl_number        = 'MH1220220098013',
  dl_verified      = true,
  rc_number        = 'MH12QA0013',
  rc_verified      = true,
  vehicle_hash     = md5('VIN-Q13'),
  upi_id           = 'ajay.kulkarni@upi',
  upi_verified     = true,
  city             = 'pune',
  zone_latitude    = 18.508000,
  zone_longitude   = 73.808000,
  onboarding_status = 'complete',
  role             = 'driver',
  trust_score      = 0.71,
  referral_code    = 'AJAY0013'
WHERE id = 'eeeeeeee-0013-0000-0000-000000000000';

-- Q14: Sachin More - Pune, Hinjewadi (Medium tier)
UPDATE profiles SET
  phone_number     = '919800100014',
  language         = 'mr',
  aadhaar_verified = true,
  aadhaar_hash     = md5('AADHAAR-SACHIN-MORE'),
  dl_number        = 'MH1220210098014',
  dl_verified      = true,
  rc_number        = 'MH12QA0014',
  rc_verified      = true,
  vehicle_hash     = md5('VIN-Q14'),
  upi_id           = 'sachin.more@upi',
  upi_verified     = true,
  city             = 'pune',
  zone_latitude    = 18.591000,
  zone_longitude   = 73.739000,
  onboarding_status = 'complete',
  role             = 'driver',
  trust_score      = 0.76,
  referral_code    = 'SACHN014'
WHERE id = 'eeeeeeee-0014-0000-0000-000000000000';

-- Q15: Vishal Jadhav - Pune, Sinhagad Rd (Normal tier)
UPDATE profiles SET
  phone_number     = '919800100015',
  language         = 'mr',
  aadhaar_verified = true,
  aadhaar_hash     = md5('AADHAAR-VISHAL-JADHAV'),
  dl_number        = 'MH1220220098015',
  dl_verified      = true,
  rc_number        = 'MH12QA0015',
  rc_verified      = true,
  vehicle_hash     = md5('VIN-Q15'),
  upi_id           = 'vishal.jadhav@upi',
  upi_verified     = true,
  city             = 'pune',
  zone_latitude    = 18.458000,
  zone_longitude   = 73.822000,
  onboarding_status = 'complete',
  role             = 'driver',
  trust_score      = 0.55,
  referral_code    = 'VISHL015'
WHERE id = 'eeeeeeee-0015-0000-0000-000000000000';

-- Q16: Srinivas Rao - Hyderabad, HITEC City (High tier)
UPDATE profiles SET
  phone_number     = '919800100016',
  language         = 'te',
  aadhaar_verified = true,
  aadhaar_hash     = md5('AADHAAR-SRINIVAS-RAO'),
  dl_number        = 'TS0720220098016',
  dl_verified      = true,
  rc_number        = 'TS07QA0016',
  rc_verified      = true,
  vehicle_hash     = md5('VIN-Q16'),
  upi_id           = 'srinivas.rao@upi',
  upi_verified     = true,
  city             = 'hyderabad',
  zone_latitude    = 17.445000,
  zone_longitude   = 78.381000,
  onboarding_status = 'complete',
  role             = 'driver',
  trust_score      = 0.80,
  referral_code    = 'SRNVS016'
WHERE id = 'eeeeeeee-0016-0000-0000-000000000000';

-- Q17: Mahesh Reddy - Hyderabad, Gachibowli (High tier)
UPDATE profiles SET
  phone_number     = '919800100017',
  language         = 'te',
  aadhaar_verified = true,
  aadhaar_hash     = md5('AADHAAR-MAHESH-REDDY'),
  dl_number        = 'TS0720210098017',
  dl_verified      = true,
  rc_number        = 'TS07QA0017',
  rc_verified      = true,
  vehicle_hash     = md5('VIN-Q17'),
  upi_id           = 'mahesh.reddy@upi',
  upi_verified     = true,
  city             = 'hyderabad',
  zone_latitude    = 17.440000,
  zone_longitude   = 78.349000,
  onboarding_status = 'complete',
  role             = 'driver',
  trust_score      = 0.63,
  referral_code    = 'MAHSH017'
WHERE id = 'eeeeeeee-0017-0000-0000-000000000000';

-- Q18: Ravi Prasad - Hyderabad, Kukatpally (Normal tier)
UPDATE profiles SET
  phone_number     = '919800100018',
  language         = 'te',
  aadhaar_verified = true,
  aadhaar_hash     = md5('AADHAAR-RAVI-PRASAD'),
  dl_number        = 'TS0720220098018',
  dl_verified      = true,
  rc_number        = 'TS07QA0018',
  rc_verified      = true,
  vehicle_hash     = md5('VIN-Q18'),
  upi_id           = 'ravi.prasad@upi',
  upi_verified     = true,
  city             = 'hyderabad',
  zone_latitude    = 17.495000,
  zone_longitude   = 78.399000,
  onboarding_status = 'complete',
  role             = 'driver',
  trust_score      = 0.57,
  referral_code    = 'RAVI0018'
WHERE id = 'eeeeeeee-0018-0000-0000-000000000000';

-- Q19: Subhash Ghosh - Kolkata, Salt Lake (High tier)
UPDATE profiles SET
  phone_number     = '919800100019',
  language         = 'hi',
  aadhaar_verified = true,
  aadhaar_hash     = md5('AADHAAR-SUBHASH-GHOSH'),
  dl_number        = 'WB0620220098019',
  dl_verified      = true,
  rc_number        = 'WB06QA0019',
  rc_verified      = true,
  vehicle_hash     = md5('VIN-Q19'),
  upi_id           = 'subhash.ghosh@upi',
  upi_verified     = true,
  city             = 'kolkata',
  zone_latitude    = 22.581000,
  zone_longitude   = 88.415000,
  onboarding_status = 'complete',
  role             = 'driver',
  trust_score      = 0.73,
  referral_code    = 'SUBHS019'
WHERE id = 'eeeeeeee-0019-0000-0000-000000000000';

-- Q20: Tapan Mondal - Kolkata, New Town (Normal tier)
UPDATE profiles SET
  phone_number     = '919800100020',
  language         = 'hi',
  aadhaar_verified = true,
  aadhaar_hash     = md5('AADHAAR-TAPAN-MONDAL'),
  dl_number        = 'WB0620210098020',
  dl_verified      = true,
  rc_number        = 'WB06QA0020',
  rc_verified      = true,
  vehicle_hash     = md5('VIN-Q20'),
  upi_id           = 'tapan.mondal@upi',
  upi_verified     = true,
  city             = 'kolkata',
  zone_latitude    = 22.580000,
  zone_longitude   = 88.484000,
  onboarding_status = 'complete',
  role             = 'driver',
  trust_score      = 0.60,
  referral_code    = 'TAPAN020'
WHERE id = 'eeeeeeee-0020-0000-0000-000000000000';

-- Q21: Jitendra Shah - Ahmedabad, SG Highway (High tier)
UPDATE profiles SET
  phone_number     = '919800100021',
  language         = 'hi',
  aadhaar_verified = true,
  aadhaar_hash     = md5('AADHAAR-JITENDRA-SHAH'),
  dl_number        = 'GJ0120220098021',
  dl_verified      = true,
  rc_number        = 'GJ01QA0021',
  rc_verified      = true,
  vehicle_hash     = md5('VIN-Q21'),
  upi_id           = 'jitendra.shah@upi',
  upi_verified     = true,
  city             = 'ahmedabad',
  zone_latitude    = 23.030000,
  zone_longitude   = 72.530000,
  onboarding_status = 'complete',
  role             = 'driver',
  trust_score      = 0.69,
  referral_code    = 'JTNDR021'
WHERE id = 'eeeeeeee-0021-0000-0000-000000000000';

-- Q22: Hardik Patel - Ahmedabad, Satellite (Medium tier)
UPDATE profiles SET
  phone_number     = '919800100022',
  language         = 'hi',
  aadhaar_verified = true,
  aadhaar_hash     = md5('AADHAAR-HARDIK-PATEL'),
  dl_number        = 'GJ0120210098022',
  dl_verified      = true,
  rc_number        = 'GJ01QA0022',
  rc_verified      = true,
  vehicle_hash     = md5('VIN-Q22'),
  upi_id           = 'hardik.patel@upi',
  upi_verified     = true,
  city             = 'ahmedabad',
  zone_latitude    = 23.015000,
  zone_longitude   = 72.550000,
  onboarding_status = 'complete',
  role             = 'driver',
  trust_score      = 0.64,
  referral_code    = 'HARDK022'
WHERE id = 'eeeeeeee-0022-0000-0000-000000000000';

-- Q23: Om Prakash Sharma - Jaipur, Mansarovar (High tier)
UPDATE profiles SET
  phone_number     = '919800100023',
  language         = 'hi',
  aadhaar_verified = true,
  aadhaar_hash     = md5('AADHAAR-OMPRAKASH-S'),
  dl_number        = 'RJ1420220098023',
  dl_verified      = true,
  rc_number        = 'RJ14QA0023',
  rc_verified      = true,
  vehicle_hash     = md5('VIN-Q23'),
  upi_id           = 'omprakash.sharma@upi',
  upi_verified     = true,
  city             = 'jaipur',
  zone_latitude    = 26.852000,
  zone_longitude   = 75.762000,
  onboarding_status = 'complete',
  role             = 'driver',
  trust_score      = 0.77,
  referral_code    = 'OMPKS023'
WHERE id = 'eeeeeeee-0023-0000-0000-000000000000';

-- Q24: Dinesh Meena - Jaipur, Malviya Nagar (Normal tier)
UPDATE profiles SET
  phone_number     = '919800100024',
  language         = 'hi',
  aadhaar_verified = true,
  aadhaar_hash     = md5('AADHAAR-DINESH-MEENA'),
  dl_number        = 'RJ1420210098024',
  dl_verified      = true,
  rc_number        = 'RJ14QA0024',
  rc_verified      = true,
  vehicle_hash     = md5('VIN-Q24'),
  upi_id           = 'dinesh.meena@upi',
  upi_verified     = true,
  city             = 'jaipur',
  zone_latitude    = 26.861000,
  zone_longitude   = 75.806000,
  onboarding_status = 'complete',
  role             = 'driver',
  trust_score      = 0.53,
  referral_code    = 'DINSH024'
WHERE id = 'eeeeeeee-0024-0000-0000-000000000000';

-- Q25: Akhilesh Yadav - Lucknow, Indira Nagar (Medium tier)
UPDATE profiles SET
  phone_number     = '919800100025',
  language         = 'hi',
  aadhaar_verified = true,
  aadhaar_hash     = md5('AADHAAR-AKHILESH-YADAV'),
  dl_number        = 'UP3220220098025',
  dl_verified      = true,
  rc_number        = 'UP32QA0025',
  rc_verified      = true,
  vehicle_hash     = md5('VIN-Q25'),
  upi_id           = 'akhilesh.yadav@upi',
  upi_verified     = true,
  city             = 'lucknow',
  zone_latitude    = 26.880000,
  zone_longitude   = 80.990000,
  onboarding_status = 'complete',
  role             = 'driver',
  trust_score      = 0.59,
  referral_code    = 'AKHLH025'
WHERE id = 'eeeeeeee-0025-0000-0000-000000000000';

-- ============================================================================
-- SECTION 3: Weekly Policies (~250 policies)
-- Each user has 8-12 weeks. is_active = true ONLY for week 12 policies.
-- weather_risk_addon: 10-15, ubi_addon: 0-5 (low risk zones)
--
-- Weeks per user:
--   Q01: w1-w12 (12)  Q02: w1-w10 (10)  Q03: w1-w12 (12)  Q04: w1-w10 (10)
--   Q05: w1-w10 (10)  Q06: w1-w10 (10)  Q07: w3-w12 (10)  Q08: w1-w10 (10)
--   Q09: w1-w10 (10)  Q10: w3-w12 (10)  Q11: w1-w10 (10)  Q12: w3-w10 (8)
--   Q13: w1-w10 (10)  Q14: w1-w10 (10)  Q15: w3-w10 (8)   Q16: w1-w12 (12)
--   Q17: w1-w10 (10)  Q18: w3-w10 (8)   Q19: w1-w12 (12)  Q20: w1-w8  (8)
--   Q21: w1-w12 (12)  Q22: w1-w10 (10)  Q23: w1-w12 (12)  Q24: w1-w8  (8)
--   Q25: w3-w12 (10)
--   Total: 12+10+12+10+10+10+10+10+10+10+10+8+10+10+8+12+10+8+12+8+12+10+12+8+10 = 252
-- ============================================================================

INSERT INTO weekly_policies (
  profile_id, plan_id, week_start_date, week_end_date,
  base_premium_inr, weather_risk_addon, ubi_addon, final_premium_inr,
  is_active, payment_status, total_payout_this_week, created_at
) VALUES

-- ---------------------------------------------------------------------------
-- Q01: Deepak Rane - Mumbai, Medium (120), w1-w12
-- ---------------------------------------------------------------------------
('eeeeeeee-0001-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-01-12', '2026-01-18', 120.00, 12.00, 3.00, 135.00, false, 'paid', 0, '2026-01-12 07:00:00+00'),
('eeeeeeee-0001-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-01-19', '2026-01-25', 120.00, 11.00, 2.00, 133.00, false, 'paid', 0, '2026-01-19 07:00:00+00'),
('eeeeeeee-0001-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-01-26', '2026-02-01', 120.00, 13.00, 4.00, 137.00, false, 'paid', 0, '2026-01-26 07:00:00+00'),
('eeeeeeee-0001-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-02-02', '2026-02-08', 120.00, 12.00, 2.00, 134.00, false, 'paid', 0, '2026-02-02 07:00:00+00'),
('eeeeeeee-0001-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-02-09', '2026-02-15', 120.00, 14.00, 3.00, 137.00, false, 'paid', 0, '2026-02-09 07:00:00+00'),
('eeeeeeee-0001-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-02-16', '2026-02-22', 120.00, 13.00, 5.00, 138.00, false, 'paid', 0, '2026-02-16 07:00:00+00'),
('eeeeeeee-0001-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-02-23', '2026-03-01', 120.00, 11.00, 2.00, 133.00, false, 'paid', 0, '2026-02-23 07:00:00+00'),
('eeeeeeee-0001-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-03-02', '2026-03-08', 120.00, 14.00, 3.00, 137.00, false, 'paid', 0, '2026-03-02 07:00:00+00'),
('eeeeeeee-0001-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-03-09', '2026-03-15', 120.00, 12.00, 4.00, 136.00, false, 'paid', 0, '2026-03-09 07:00:00+00'),
('eeeeeeee-0001-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-03-16', '2026-03-22', 120.00, 13.00, 2.00, 135.00, false, 'paid', 0, '2026-03-16 07:00:00+00'),
('eeeeeeee-0001-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-03-23', '2026-03-29', 120.00, 11.00, 3.00, 134.00, false, 'paid', 0, '2026-03-23 07:00:00+00'),
('eeeeeeee-0001-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-03-30', '2026-04-05', 120.00, 14.00, 5.00, 139.00, true, 'paid', 0, '2026-03-30 07:00:00+00'),

-- ---------------------------------------------------------------------------
-- Q02: Santosh Naik - Mumbai, Medium (120), w1-w10
-- ---------------------------------------------------------------------------
('eeeeeeee-0002-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-01-12', '2026-01-18', 120.00, 13.00, 2.00, 135.00, false, 'paid', 0, '2026-01-12 08:00:00+00'),
('eeeeeeee-0002-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-01-19', '2026-01-25', 120.00, 12.00, 3.00, 135.00, false, 'paid', 0, '2026-01-19 08:00:00+00'),
('eeeeeeee-0002-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-01-26', '2026-02-01', 120.00, 14.00, 4.00, 138.00, false, 'paid', 0, '2026-01-26 08:00:00+00'),
('eeeeeeee-0002-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-02-02', '2026-02-08', 120.00, 11.00, 2.00, 133.00, false, 'paid', 0, '2026-02-02 08:00:00+00'),
('eeeeeeee-0002-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-02-09', '2026-02-15', 120.00, 13.00, 3.00, 136.00, false, 'paid', 0, '2026-02-09 08:00:00+00'),
('eeeeeeee-0002-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-02-16', '2026-02-22', 120.00, 12.00, 5.00, 137.00, false, 'paid', 0, '2026-02-16 08:00:00+00'),
('eeeeeeee-0002-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-02-23', '2026-03-01', 120.00, 14.00, 2.00, 136.00, false, 'paid', 0, '2026-02-23 08:00:00+00'),
('eeeeeeee-0002-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-03-02', '2026-03-08', 120.00, 11.00, 3.00, 134.00, false, 'paid', 0, '2026-03-02 08:00:00+00'),
('eeeeeeee-0002-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-03-09', '2026-03-15', 120.00, 13.00, 4.00, 137.00, false, 'paid', 0, '2026-03-09 08:00:00+00'),
('eeeeeeee-0002-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-03-16', '2026-03-22', 120.00, 12.00, 2.00, 134.00, false, 'paid', 0, '2026-03-16 08:00:00+00'),

-- ---------------------------------------------------------------------------
-- Q03: Pramod Sawant - Mumbai, High (160), w1-w12
-- ---------------------------------------------------------------------------
('eeeeeeee-0003-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-01-12', '2026-01-18', 160.00, 11.00, 3.00, 174.00, false, 'paid', 0, '2026-01-12 09:00:00+00'),
('eeeeeeee-0003-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-01-19', '2026-01-25', 160.00, 12.00, 4.00, 176.00, false, 'paid', 0, '2026-01-19 09:00:00+00'),
('eeeeeeee-0003-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-01-26', '2026-02-01', 160.00, 14.00, 2.00, 176.00, false, 'paid', 0, '2026-01-26 09:00:00+00'),
('eeeeeeee-0003-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-02-02', '2026-02-08', 160.00, 13.00, 5.00, 178.00, false, 'paid', 0, '2026-02-02 09:00:00+00'),
('eeeeeeee-0003-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-02-09', '2026-02-15', 160.00, 11.00, 3.00, 174.00, false, 'paid', 0, '2026-02-09 09:00:00+00'),
('eeeeeeee-0003-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-02-16', '2026-02-22', 160.00, 12.00, 2.00, 174.00, false, 'paid', 0, '2026-02-16 09:00:00+00'),
('eeeeeeee-0003-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-02-23', '2026-03-01', 160.00, 14.00, 4.00, 178.00, false, 'paid', 0, '2026-02-23 09:00:00+00'),
('eeeeeeee-0003-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-03-02', '2026-03-08', 160.00, 13.00, 3.00, 176.00, false, 'paid', 0, '2026-03-02 09:00:00+00'),
('eeeeeeee-0003-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-03-09', '2026-03-15', 160.00, 11.00, 5.00, 176.00, false, 'paid', 0, '2026-03-09 09:00:00+00'),
('eeeeeeee-0003-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-03-16', '2026-03-22', 160.00, 12.00, 2.00, 174.00, false, 'paid', 0, '2026-03-16 09:00:00+00'),
('eeeeeeee-0003-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-03-23', '2026-03-29', 160.00, 14.00, 4.00, 178.00, false, 'paid', 0, '2026-03-23 09:00:00+00'),
('eeeeeeee-0003-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-03-30', '2026-04-05', 160.00, 13.00, 3.00, 176.00, true, 'paid', 0, '2026-03-30 09:00:00+00'),

-- ---------------------------------------------------------------------------
-- Q04: Ganesh Patil - Mumbai, Normal (80), w1-w10
-- ---------------------------------------------------------------------------
('eeeeeeee-0004-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-01-12', '2026-01-18', 80.00, 12.00, 2.00, 94.00, false, 'paid', 0, '2026-01-12 06:30:00+00'),
('eeeeeeee-0004-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-01-19', '2026-01-25', 80.00, 13.00, 3.00, 96.00, false, 'paid', 0, '2026-01-19 06:30:00+00'),
('eeeeeeee-0004-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-01-26', '2026-02-01', 80.00, 11.00, 4.00, 95.00, false, 'paid', 0, '2026-01-26 06:30:00+00'),
('eeeeeeee-0004-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-02-02', '2026-02-08', 80.00, 14.00, 2.00, 96.00, false, 'paid', 0, '2026-02-02 06:30:00+00'),
('eeeeeeee-0004-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-02-09', '2026-02-15', 80.00, 12.00, 3.00, 95.00, false, 'paid', 0, '2026-02-09 06:30:00+00'),
('eeeeeeee-0004-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-02-16', '2026-02-22', 80.00, 13.00, 5.00, 98.00, false, 'paid', 0, '2026-02-16 06:30:00+00'),
('eeeeeeee-0004-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-02-23', '2026-03-01', 80.00, 11.00, 2.00, 93.00, false, 'paid', 0, '2026-02-23 06:30:00+00'),
('eeeeeeee-0004-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-03-02', '2026-03-08', 80.00, 14.00, 3.00, 97.00, false, 'paid', 0, '2026-03-02 06:30:00+00'),
('eeeeeeee-0004-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-03-09', '2026-03-15', 80.00, 12.00, 4.00, 96.00, false, 'paid', 0, '2026-03-09 06:30:00+00'),
('eeeeeeee-0004-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-03-16', '2026-03-22', 80.00, 13.00, 2.00, 95.00, false, 'paid', 0, '2026-03-16 06:30:00+00'),

-- ---------------------------------------------------------------------------
-- Q05: Naveen Gupta - Delhi, Medium (120), w1-w10
-- ---------------------------------------------------------------------------
('eeeeeeee-0005-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-01-12', '2026-01-18', 120.00, 11.00, 2.00, 133.00, false, 'paid', 0, '2026-01-12 08:00:00+00'),
('eeeeeeee-0005-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-01-19', '2026-01-25', 120.00, 12.00, 3.00, 135.00, false, 'paid', 0, '2026-01-19 08:00:00+00'),
('eeeeeeee-0005-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-01-26', '2026-02-01', 120.00, 14.00, 4.00, 138.00, false, 'paid', 0, '2026-01-26 08:00:00+00'),
('eeeeeeee-0005-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-02-02', '2026-02-08', 120.00, 13.00, 2.00, 135.00, false, 'paid', 0, '2026-02-02 08:00:00+00'),
('eeeeeeee-0005-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-02-09', '2026-02-15', 120.00, 11.00, 3.00, 134.00, false, 'paid', 0, '2026-02-09 08:00:00+00'),
('eeeeeeee-0005-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-02-16', '2026-02-22', 120.00, 12.00, 5.00, 137.00, false, 'paid', 0, '2026-02-16 08:00:00+00'),
('eeeeeeee-0005-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-02-23', '2026-03-01', 120.00, 14.00, 2.00, 136.00, false, 'paid', 0, '2026-02-23 08:00:00+00'),
('eeeeeeee-0005-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-03-02', '2026-03-08', 120.00, 13.00, 3.00, 136.00, false, 'paid', 0, '2026-03-02 08:00:00+00'),
('eeeeeeee-0005-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-03-09', '2026-03-15', 120.00, 11.00, 4.00, 135.00, false, 'paid', 0, '2026-03-09 08:00:00+00'),
('eeeeeeee-0005-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-03-16', '2026-03-22', 120.00, 12.00, 2.00, 134.00, false, 'paid', 0, '2026-03-16 08:00:00+00'),

-- ---------------------------------------------------------------------------
-- Q06: Rohit Verma - Delhi, Medium (120), w1-w10
-- ---------------------------------------------------------------------------
('eeeeeeee-0006-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-01-12', '2026-01-18', 120.00, 13.00, 3.00, 136.00, false, 'paid', 0, '2026-01-12 10:00:00+00'),
('eeeeeeee-0006-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-01-19', '2026-01-25', 120.00, 12.00, 2.00, 134.00, false, 'paid', 0, '2026-01-19 10:00:00+00'),
('eeeeeeee-0006-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-01-26', '2026-02-01', 120.00, 14.00, 4.00, 138.00, false, 'paid', 0, '2026-01-26 10:00:00+00'),
('eeeeeeee-0006-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-02-02', '2026-02-08', 120.00, 11.00, 3.00, 134.00, false, 'paid', 0, '2026-02-02 10:00:00+00'),
('eeeeeeee-0006-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-02-09', '2026-02-15', 120.00, 13.00, 5.00, 138.00, false, 'paid', 0, '2026-02-09 10:00:00+00'),
('eeeeeeee-0006-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-02-16', '2026-02-22', 120.00, 12.00, 2.00, 134.00, false, 'paid', 0, '2026-02-16 10:00:00+00'),
('eeeeeeee-0006-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-02-23', '2026-03-01', 120.00, 14.00, 3.00, 137.00, false, 'paid', 0, '2026-02-23 10:00:00+00'),
('eeeeeeee-0006-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-03-02', '2026-03-08', 120.00, 11.00, 4.00, 135.00, false, 'paid', 0, '2026-03-02 10:00:00+00'),
('eeeeeeee-0006-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-03-09', '2026-03-15', 120.00, 13.00, 2.00, 135.00, false, 'paid', 0, '2026-03-09 10:00:00+00'),
('eeeeeeee-0006-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-03-16', '2026-03-22', 120.00, 12.00, 3.00, 135.00, false, 'paid', 0, '2026-03-16 10:00:00+00'),

-- ---------------------------------------------------------------------------
-- Q07: Manish Tiwari - Delhi, Normal (80), w3-w12
-- ---------------------------------------------------------------------------
('eeeeeeee-0007-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-01-26', '2026-02-01', 80.00, 14.00, 3.00, 97.00, false, 'paid', 0, '2026-01-26 08:30:00+00'),
('eeeeeeee-0007-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-02-02', '2026-02-08', 80.00, 13.00, 2.00, 95.00, false, 'paid', 0, '2026-02-02 08:30:00+00'),
('eeeeeeee-0007-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-02-09', '2026-02-15', 80.00, 12.00, 4.00, 96.00, false, 'paid', 0, '2026-02-09 08:30:00+00'),
('eeeeeeee-0007-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-02-16', '2026-02-22', 80.00, 14.00, 3.00, 97.00, false, 'paid', 0, '2026-02-16 08:30:00+00'),
('eeeeeeee-0007-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-02-23', '2026-03-01', 80.00, 11.00, 2.00, 93.00, false, 'paid', 0, '2026-02-23 08:30:00+00'),
('eeeeeeee-0007-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-03-02', '2026-03-08', 80.00, 13.00, 5.00, 98.00, false, 'paid', 0, '2026-03-02 08:30:00+00'),
('eeeeeeee-0007-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-03-09', '2026-03-15', 80.00, 12.00, 3.00, 95.00, false, 'paid', 0, '2026-03-09 08:30:00+00'),
('eeeeeeee-0007-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-03-16', '2026-03-22', 80.00, 14.00, 2.00, 96.00, false, 'paid', 0, '2026-03-16 08:30:00+00'),
('eeeeeeee-0007-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-03-23', '2026-03-29', 80.00, 11.00, 4.00, 95.00, false, 'paid', 0, '2026-03-23 08:30:00+00'),
('eeeeeeee-0007-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-03-30', '2026-04-05', 80.00, 13.00, 3.00, 96.00, true, 'paid', 0, '2026-03-30 08:30:00+00'),

-- ---------------------------------------------------------------------------
-- Q08: Kiran Gowda - Bangalore, Medium (120), w1-w10
-- ---------------------------------------------------------------------------
('eeeeeeee-0008-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-01-12', '2026-01-18', 120.00, 10.00, 2.00, 132.00, false, 'paid', 0, '2026-01-12 06:00:00+00'),
('eeeeeeee-0008-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-01-19', '2026-01-25', 120.00, 11.00, 3.00, 134.00, false, 'paid', 0, '2026-01-19 06:00:00+00'),
('eeeeeeee-0008-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-01-26', '2026-02-01', 120.00, 12.00, 4.00, 136.00, false, 'paid', 0, '2026-01-26 06:00:00+00'),
('eeeeeeee-0008-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-02-02', '2026-02-08', 120.00, 10.00, 2.00, 132.00, false, 'paid', 0, '2026-02-02 06:00:00+00'),
('eeeeeeee-0008-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-02-09', '2026-02-15', 120.00, 13.00, 3.00, 136.00, false, 'paid', 0, '2026-02-09 06:00:00+00'),
('eeeeeeee-0008-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-02-16', '2026-02-22', 120.00, 11.00, 5.00, 136.00, false, 'paid', 0, '2026-02-16 06:00:00+00'),
('eeeeeeee-0008-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-02-23', '2026-03-01', 120.00, 12.00, 2.00, 134.00, false, 'paid', 0, '2026-02-23 06:00:00+00'),
('eeeeeeee-0008-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-03-02', '2026-03-08', 120.00, 14.00, 3.00, 137.00, false, 'paid', 0, '2026-03-02 06:00:00+00'),
('eeeeeeee-0008-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-03-09', '2026-03-15', 120.00, 11.00, 4.00, 135.00, false, 'paid', 0, '2026-03-09 06:00:00+00'),
('eeeeeeee-0008-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-03-16', '2026-03-22', 120.00, 13.00, 2.00, 135.00, false, 'paid', 0, '2026-03-16 06:00:00+00'),

-- ---------------------------------------------------------------------------
-- Q09: Ramesh Shetty - Bangalore, High (160), w1-w10
-- ---------------------------------------------------------------------------
('eeeeeeee-0009-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-01-12', '2026-01-18', 160.00, 12.00, 3.00, 175.00, false, 'paid', 0, '2026-01-12 09:30:00+00'),
('eeeeeeee-0009-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-01-19', '2026-01-25', 160.00, 13.00, 4.00, 177.00, false, 'paid', 0, '2026-01-19 09:30:00+00'),
('eeeeeeee-0009-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-01-26', '2026-02-01', 160.00, 11.00, 2.00, 173.00, false, 'paid', 0, '2026-01-26 09:30:00+00'),
('eeeeeeee-0009-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-02-02', '2026-02-08', 160.00, 14.00, 5.00, 179.00, false, 'paid', 0, '2026-02-02 09:30:00+00'),
('eeeeeeee-0009-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-02-09', '2026-02-15', 160.00, 12.00, 3.00, 175.00, false, 'paid', 0, '2026-02-09 09:30:00+00'),
('eeeeeeee-0009-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-02-16', '2026-02-22', 160.00, 13.00, 4.00, 177.00, false, 'paid', 0, '2026-02-16 09:30:00+00'),
('eeeeeeee-0009-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-02-23', '2026-03-01', 160.00, 11.00, 2.00, 173.00, false, 'paid', 0, '2026-02-23 09:30:00+00'),
('eeeeeeee-0009-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-03-02', '2026-03-08', 160.00, 14.00, 3.00, 177.00, false, 'paid', 0, '2026-03-02 09:30:00+00'),
('eeeeeeee-0009-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-03-09', '2026-03-15', 160.00, 12.00, 5.00, 177.00, false, 'paid', 0, '2026-03-09 09:30:00+00'),
('eeeeeeee-0009-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-03-16', '2026-03-22', 160.00, 13.00, 2.00, 175.00, false, 'paid', 0, '2026-03-16 09:30:00+00'),

-- ---------------------------------------------------------------------------
-- Q10: Venkatesh Murthy - Bangalore, Normal (80), w3-w12
-- ---------------------------------------------------------------------------
('eeeeeeee-0010-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-01-26', '2026-02-01', 80.00, 13.00, 3.00, 96.00, false, 'paid', 0, '2026-01-26 07:00:00+00'),
('eeeeeeee-0010-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-02-02', '2026-02-08', 80.00, 12.00, 2.00, 94.00, false, 'paid', 0, '2026-02-02 07:00:00+00'),
('eeeeeeee-0010-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-02-09', '2026-02-15', 80.00, 14.00, 4.00, 98.00, false, 'paid', 0, '2026-02-09 07:00:00+00'),
('eeeeeeee-0010-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-02-16', '2026-02-22', 80.00, 11.00, 3.00, 94.00, false, 'paid', 0, '2026-02-16 07:00:00+00'),
('eeeeeeee-0010-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-02-23', '2026-03-01', 80.00, 13.00, 2.00, 95.00, false, 'paid', 0, '2026-02-23 07:00:00+00'),
('eeeeeeee-0010-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-03-02', '2026-03-08', 80.00, 12.00, 5.00, 97.00, false, 'paid', 0, '2026-03-02 07:00:00+00'),
('eeeeeeee-0010-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-03-09', '2026-03-15', 80.00, 14.00, 3.00, 97.00, false, 'paid', 0, '2026-03-09 07:00:00+00'),
('eeeeeeee-0010-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-03-16', '2026-03-22', 80.00, 11.00, 2.00, 93.00, false, 'paid', 0, '2026-03-16 07:00:00+00'),
('eeeeeeee-0010-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-03-23', '2026-03-29', 80.00, 13.00, 4.00, 97.00, false, 'paid', 0, '2026-03-23 07:00:00+00'),
('eeeeeeee-0010-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-03-30', '2026-04-05', 80.00, 12.00, 3.00, 95.00, true, 'paid', 0, '2026-03-30 07:00:00+00'),

-- ---------------------------------------------------------------------------
-- Q11: Murugan S - Chennai, High (160), w1-w10
-- ---------------------------------------------------------------------------
('eeeeeeee-0011-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-01-12', '2026-01-18', 160.00, 11.00, 2.00, 173.00, false, 'paid', 0, '2026-01-12 08:30:00+00'),
('eeeeeeee-0011-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-01-19', '2026-01-25', 160.00, 12.00, 3.00, 175.00, false, 'paid', 0, '2026-01-19 08:30:00+00'),
('eeeeeeee-0011-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-01-26', '2026-02-01', 160.00, 14.00, 4.00, 178.00, false, 'paid', 0, '2026-01-26 08:30:00+00'),
('eeeeeeee-0011-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-02-02', '2026-02-08', 160.00, 13.00, 5.00, 178.00, false, 'paid', 0, '2026-02-02 08:30:00+00'),
('eeeeeeee-0011-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-02-09', '2026-02-15', 160.00, 11.00, 2.00, 173.00, false, 'paid', 0, '2026-02-09 08:30:00+00'),
('eeeeeeee-0011-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-02-16', '2026-02-22', 160.00, 12.00, 3.00, 175.00, false, 'paid', 0, '2026-02-16 08:30:00+00'),
('eeeeeeee-0011-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-02-23', '2026-03-01', 160.00, 14.00, 4.00, 178.00, false, 'paid', 0, '2026-02-23 08:30:00+00'),
('eeeeeeee-0011-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-03-02', '2026-03-08', 160.00, 13.00, 2.00, 175.00, false, 'paid', 0, '2026-03-02 08:30:00+00'),
('eeeeeeee-0011-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-03-09', '2026-03-15', 160.00, 11.00, 5.00, 176.00, false, 'paid', 0, '2026-03-09 08:30:00+00'),
('eeeeeeee-0011-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-03-16', '2026-03-22', 160.00, 12.00, 3.00, 175.00, false, 'paid', 0, '2026-03-16 08:30:00+00'),

-- ---------------------------------------------------------------------------
-- Q12: Balaji Krishnan - Chennai, Normal (80), w3-w10
-- ---------------------------------------------------------------------------
('eeeeeeee-0012-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-01-26', '2026-02-01', 80.00, 12.00, 3.00, 95.00, false, 'paid', 0, '2026-01-26 09:00:00+00'),
('eeeeeeee-0012-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-02-02', '2026-02-08', 80.00, 14.00, 2.00, 96.00, false, 'paid', 0, '2026-02-02 09:00:00+00'),
('eeeeeeee-0012-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-02-09', '2026-02-15', 80.00, 11.00, 4.00, 95.00, false, 'paid', 0, '2026-02-09 09:00:00+00'),
('eeeeeeee-0012-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-02-16', '2026-02-22', 80.00, 13.00, 3.00, 96.00, false, 'paid', 0, '2026-02-16 09:00:00+00'),
('eeeeeeee-0012-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-02-23', '2026-03-01', 80.00, 12.00, 2.00, 94.00, false, 'paid', 0, '2026-02-23 09:00:00+00'),
('eeeeeeee-0012-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-03-02', '2026-03-08', 80.00, 14.00, 5.00, 99.00, false, 'paid', 0, '2026-03-02 09:00:00+00'),
('eeeeeeee-0012-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-03-09', '2026-03-15', 80.00, 11.00, 3.00, 94.00, false, 'paid', 0, '2026-03-09 09:00:00+00'),
('eeeeeeee-0012-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-03-16', '2026-03-22', 80.00, 13.00, 2.00, 95.00, false, 'paid', 0, '2026-03-16 09:00:00+00'),

-- ---------------------------------------------------------------------------
-- Q13: Ajay Kulkarni - Pune, Medium (120), w1-w10
-- ---------------------------------------------------------------------------
('eeeeeeee-0013-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-01-12', '2026-01-18', 120.00, 11.00, 2.00, 133.00, false, 'paid', 0, '2026-01-12 10:00:00+00'),
('eeeeeeee-0013-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-01-19', '2026-01-25', 120.00, 12.00, 3.00, 135.00, false, 'paid', 0, '2026-01-19 10:00:00+00'),
('eeeeeeee-0013-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-01-26', '2026-02-01', 120.00, 14.00, 4.00, 138.00, false, 'paid', 0, '2026-01-26 10:00:00+00'),
('eeeeeeee-0013-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-02-02', '2026-02-08', 120.00, 13.00, 2.00, 135.00, false, 'paid', 0, '2026-02-02 10:00:00+00'),
('eeeeeeee-0013-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-02-09', '2026-02-15', 120.00, 11.00, 5.00, 136.00, false, 'paid', 0, '2026-02-09 10:00:00+00'),
('eeeeeeee-0013-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-02-16', '2026-02-22', 120.00, 12.00, 3.00, 135.00, false, 'paid', 0, '2026-02-16 10:00:00+00'),
('eeeeeeee-0013-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-02-23', '2026-03-01', 120.00, 14.00, 2.00, 136.00, false, 'paid', 0, '2026-02-23 10:00:00+00'),
('eeeeeeee-0013-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-03-02', '2026-03-08', 120.00, 13.00, 4.00, 137.00, false, 'paid', 0, '2026-03-02 10:00:00+00'),
('eeeeeeee-0013-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-03-09', '2026-03-15', 120.00, 11.00, 3.00, 134.00, false, 'paid', 0, '2026-03-09 10:00:00+00'),
('eeeeeeee-0013-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-03-16', '2026-03-22', 120.00, 12.00, 5.00, 137.00, false, 'paid', 0, '2026-03-16 10:00:00+00'),

-- ---------------------------------------------------------------------------
-- Q14: Sachin More - Pune, Medium (120), w1-w10
-- ---------------------------------------------------------------------------
('eeeeeeee-0014-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-01-12', '2026-01-18', 120.00, 11.00, 2.00, 133.00, false, 'paid', 0, '2026-01-12 07:30:00+00'),
('eeeeeeee-0014-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-01-19', '2026-01-25', 120.00, 13.00, 3.00, 136.00, false, 'paid', 0, '2026-01-19 07:30:00+00'),
('eeeeeeee-0014-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-01-26', '2026-02-01', 120.00, 12.00, 4.00, 136.00, false, 'paid', 0, '2026-01-26 07:30:00+00'),
('eeeeeeee-0014-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-02-02', '2026-02-08', 120.00, 14.00, 5.00, 139.00, false, 'paid', 0, '2026-02-02 07:30:00+00'),
('eeeeeeee-0014-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-02-09', '2026-02-15', 120.00, 11.00, 2.00, 133.00, false, 'paid', 0, '2026-02-09 07:30:00+00'),
('eeeeeeee-0014-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-02-16', '2026-02-22', 120.00, 12.00, 3.00, 135.00, false, 'paid', 0, '2026-02-16 07:30:00+00'),
('eeeeeeee-0014-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-02-23', '2026-03-01', 120.00, 14.00, 4.00, 138.00, false, 'paid', 0, '2026-02-23 07:30:00+00'),
('eeeeeeee-0014-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-03-02', '2026-03-08', 120.00, 13.00, 2.00, 135.00, false, 'paid', 0, '2026-03-02 07:30:00+00'),
('eeeeeeee-0014-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-03-09', '2026-03-15', 120.00, 11.00, 5.00, 136.00, false, 'paid', 0, '2026-03-09 07:30:00+00'),
('eeeeeeee-0014-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-03-16', '2026-03-22', 120.00, 12.00, 3.00, 135.00, false, 'paid', 0, '2026-03-16 07:30:00+00'),

-- ---------------------------------------------------------------------------
-- Q15: Vishal Jadhav - Pune, Normal (80), w3-w10
-- ---------------------------------------------------------------------------
('eeeeeeee-0015-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-01-26', '2026-02-01', 80.00, 14.00, 3.00, 97.00, false, 'paid', 0, '2026-01-26 08:30:00+00'),
('eeeeeeee-0015-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-02-02', '2026-02-08', 80.00, 12.00, 2.00, 94.00, false, 'paid', 0, '2026-02-02 08:30:00+00'),
('eeeeeeee-0015-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-02-09', '2026-02-15', 80.00, 13.00, 4.00, 97.00, false, 'paid', 0, '2026-02-09 08:30:00+00'),
('eeeeeeee-0015-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-02-16', '2026-02-22', 80.00, 11.00, 3.00, 94.00, false, 'paid', 0, '2026-02-16 08:30:00+00'),
('eeeeeeee-0015-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-02-23', '2026-03-01', 80.00, 14.00, 2.00, 96.00, false, 'paid', 0, '2026-02-23 08:30:00+00'),
('eeeeeeee-0015-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-03-02', '2026-03-08', 80.00, 12.00, 5.00, 97.00, false, 'paid', 0, '2026-03-02 08:30:00+00'),
('eeeeeeee-0015-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-03-09', '2026-03-15', 80.00, 13.00, 3.00, 96.00, false, 'paid', 0, '2026-03-09 08:30:00+00'),
('eeeeeeee-0015-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-03-16', '2026-03-22', 80.00, 11.00, 2.00, 93.00, false, 'paid', 0, '2026-03-16 08:30:00+00'),

-- ---------------------------------------------------------------------------
-- Q16: Srinivas Rao - Hyderabad, High (160), w1-w12
-- ---------------------------------------------------------------------------
('eeeeeeee-0016-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-01-12', '2026-01-18', 160.00, 12.00, 3.00, 175.00, false, 'paid', 0, '2026-01-12 09:00:00+00'),
('eeeeeeee-0016-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-01-19', '2026-01-25', 160.00, 13.00, 4.00, 177.00, false, 'paid', 0, '2026-01-19 09:00:00+00'),
('eeeeeeee-0016-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-01-26', '2026-02-01', 160.00, 11.00, 2.00, 173.00, false, 'paid', 0, '2026-01-26 09:00:00+00'),
('eeeeeeee-0016-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-02-02', '2026-02-08', 160.00, 14.00, 5.00, 179.00, false, 'paid', 0, '2026-02-02 09:00:00+00'),
('eeeeeeee-0016-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-02-09', '2026-02-15', 160.00, 12.00, 3.00, 175.00, false, 'paid', 0, '2026-02-09 09:00:00+00'),
('eeeeeeee-0016-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-02-16', '2026-02-22', 160.00, 13.00, 4.00, 177.00, false, 'paid', 0, '2026-02-16 09:00:00+00'),
('eeeeeeee-0016-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-02-23', '2026-03-01', 160.00, 11.00, 2.00, 173.00, false, 'paid', 0, '2026-02-23 09:00:00+00'),
('eeeeeeee-0016-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-03-02', '2026-03-08', 160.00, 14.00, 3.00, 177.00, false, 'paid', 0, '2026-03-02 09:00:00+00'),
('eeeeeeee-0016-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-03-09', '2026-03-15', 160.00, 12.00, 5.00, 177.00, false, 'paid', 0, '2026-03-09 09:00:00+00'),
('eeeeeeee-0016-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-03-16', '2026-03-22', 160.00, 13.00, 2.00, 175.00, false, 'paid', 0, '2026-03-16 09:00:00+00'),
('eeeeeeee-0016-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-03-23', '2026-03-29', 160.00, 11.00, 4.00, 175.00, false, 'paid', 0, '2026-03-23 09:00:00+00'),
('eeeeeeee-0016-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-03-30', '2026-04-05', 160.00, 14.00, 3.00, 177.00, true, 'paid', 0, '2026-03-30 09:00:00+00'),

-- ---------------------------------------------------------------------------
-- Q17: Mahesh Reddy - Hyderabad, High (160), w1-w10
-- ---------------------------------------------------------------------------
('eeeeeeee-0017-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-01-12', '2026-01-18', 160.00, 12.00, 2.00, 174.00, false, 'paid', 0, '2026-01-12 06:30:00+00'),
('eeeeeeee-0017-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-01-19', '2026-01-25', 160.00, 13.00, 3.00, 176.00, false, 'paid', 0, '2026-01-19 06:30:00+00'),
('eeeeeeee-0017-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-01-26', '2026-02-01', 160.00, 11.00, 4.00, 175.00, false, 'paid', 0, '2026-01-26 06:30:00+00'),
('eeeeeeee-0017-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-02-02', '2026-02-08', 160.00, 14.00, 2.00, 176.00, false, 'paid', 0, '2026-02-02 06:30:00+00'),
('eeeeeeee-0017-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-02-09', '2026-02-15', 160.00, 12.00, 5.00, 177.00, false, 'paid', 0, '2026-02-09 06:30:00+00'),
('eeeeeeee-0017-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-02-16', '2026-02-22', 160.00, 13.00, 3.00, 176.00, false, 'paid', 0, '2026-02-16 06:30:00+00'),
('eeeeeeee-0017-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-02-23', '2026-03-01', 160.00, 11.00, 2.00, 173.00, false, 'paid', 0, '2026-02-23 06:30:00+00'),
('eeeeeeee-0017-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-03-02', '2026-03-08', 160.00, 14.00, 4.00, 178.00, false, 'paid', 0, '2026-03-02 06:30:00+00'),
('eeeeeeee-0017-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-03-09', '2026-03-15', 160.00, 12.00, 3.00, 175.00, false, 'paid', 0, '2026-03-09 06:30:00+00'),
('eeeeeeee-0017-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-03-16', '2026-03-22', 160.00, 13.00, 5.00, 178.00, false, 'paid', 0, '2026-03-16 06:30:00+00'),

-- ---------------------------------------------------------------------------
-- Q18: Ravi Prasad - Hyderabad, Normal (80), w3-w10
-- ---------------------------------------------------------------------------
('eeeeeeee-0018-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-01-26', '2026-02-01', 80.00, 13.00, 2.00, 95.00, false, 'paid', 0, '2026-01-26 07:30:00+00'),
('eeeeeeee-0018-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-02-02', '2026-02-08', 80.00, 12.00, 3.00, 95.00, false, 'paid', 0, '2026-02-02 07:30:00+00'),
('eeeeeeee-0018-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-02-09', '2026-02-15', 80.00, 14.00, 4.00, 98.00, false, 'paid', 0, '2026-02-09 07:30:00+00'),
('eeeeeeee-0018-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-02-16', '2026-02-22', 80.00, 11.00, 2.00, 93.00, false, 'paid', 0, '2026-02-16 07:30:00+00'),
('eeeeeeee-0018-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-02-23', '2026-03-01', 80.00, 13.00, 5.00, 98.00, false, 'paid', 0, '2026-02-23 07:30:00+00'),
('eeeeeeee-0018-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-03-02', '2026-03-08', 80.00, 12.00, 3.00, 95.00, false, 'paid', 0, '2026-03-02 07:30:00+00'),
('eeeeeeee-0018-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-03-09', '2026-03-15', 80.00, 14.00, 2.00, 96.00, false, 'paid', 0, '2026-03-09 07:30:00+00'),
('eeeeeeee-0018-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-03-16', '2026-03-22', 80.00, 11.00, 4.00, 95.00, false, 'paid', 0, '2026-03-16 07:30:00+00'),

-- ---------------------------------------------------------------------------
-- Q19: Subhash Ghosh - Kolkata, High (160), w1-w12
-- ---------------------------------------------------------------------------
('eeeeeeee-0019-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-01-12', '2026-01-18', 160.00, 11.00, 3.00, 174.00, false, 'paid', 0, '2026-01-12 08:00:00+00'),
('eeeeeeee-0019-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-01-19', '2026-01-25', 160.00, 13.00, 4.00, 177.00, false, 'paid', 0, '2026-01-19 08:00:00+00'),
('eeeeeeee-0019-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-01-26', '2026-02-01', 160.00, 12.00, 2.00, 174.00, false, 'paid', 0, '2026-01-26 08:00:00+00'),
('eeeeeeee-0019-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-02-02', '2026-02-08', 160.00, 14.00, 5.00, 179.00, false, 'paid', 0, '2026-02-02 08:00:00+00'),
('eeeeeeee-0019-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-02-09', '2026-02-15', 160.00, 11.00, 3.00, 174.00, false, 'paid', 0, '2026-02-09 08:00:00+00'),
('eeeeeeee-0019-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-02-16', '2026-02-22', 160.00, 13.00, 4.00, 177.00, false, 'paid', 0, '2026-02-16 08:00:00+00'),
('eeeeeeee-0019-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-02-23', '2026-03-01', 160.00, 12.00, 2.00, 174.00, false, 'paid', 0, '2026-02-23 08:00:00+00'),
('eeeeeeee-0019-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-03-02', '2026-03-08', 160.00, 14.00, 5.00, 179.00, false, 'paid', 0, '2026-03-02 08:00:00+00'),
('eeeeeeee-0019-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-03-09', '2026-03-15', 160.00, 11.00, 3.00, 174.00, false, 'paid', 0, '2026-03-09 08:00:00+00'),
('eeeeeeee-0019-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-03-16', '2026-03-22', 160.00, 13.00, 4.00, 177.00, false, 'paid', 0, '2026-03-16 08:00:00+00'),
('eeeeeeee-0019-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-03-23', '2026-03-29', 160.00, 12.00, 2.00, 174.00, false, 'paid', 0, '2026-03-23 08:00:00+00'),
('eeeeeeee-0019-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-03-30', '2026-04-05', 160.00, 14.00, 5.00, 179.00, true, 'paid', 0, '2026-03-30 08:00:00+00'),

-- ---------------------------------------------------------------------------
-- Q20: Tapan Mondal - Kolkata, Normal (80), w1-w8
-- ---------------------------------------------------------------------------
('eeeeeeee-0020-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-01-12', '2026-01-18', 80.00, 12.00, 3.00, 95.00, false, 'paid', 0, '2026-01-12 09:30:00+00'),
('eeeeeeee-0020-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-01-19', '2026-01-25', 80.00, 14.00, 2.00, 96.00, false, 'paid', 0, '2026-01-19 09:30:00+00'),
('eeeeeeee-0020-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-01-26', '2026-02-01', 80.00, 11.00, 4.00, 95.00, false, 'paid', 0, '2026-01-26 09:30:00+00'),
('eeeeeeee-0020-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-02-02', '2026-02-08', 80.00, 13.00, 3.00, 96.00, false, 'paid', 0, '2026-02-02 09:30:00+00'),
('eeeeeeee-0020-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-02-09', '2026-02-15', 80.00, 12.00, 2.00, 94.00, false, 'paid', 0, '2026-02-09 09:30:00+00'),
('eeeeeeee-0020-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-02-16', '2026-02-22', 80.00, 14.00, 5.00, 99.00, false, 'paid', 0, '2026-02-16 09:30:00+00'),
('eeeeeeee-0020-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-02-23', '2026-03-01', 80.00, 11.00, 3.00, 94.00, false, 'paid', 0, '2026-02-23 09:30:00+00'),
('eeeeeeee-0020-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-03-02', '2026-03-08', 80.00, 13.00, 2.00, 95.00, false, 'paid', 0, '2026-03-02 09:30:00+00'),

-- ---------------------------------------------------------------------------
-- Q21: Jitendra Shah - Ahmedabad, High (160), w1-w12
-- ---------------------------------------------------------------------------
('eeeeeeee-0021-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-01-12', '2026-01-18', 160.00, 12.00, 3.00, 175.00, false, 'paid', 0, '2026-01-12 07:00:00+00'),
('eeeeeeee-0021-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-01-19', '2026-01-25', 160.00, 13.00, 4.00, 177.00, false, 'paid', 0, '2026-01-19 07:00:00+00'),
('eeeeeeee-0021-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-01-26', '2026-02-01', 160.00, 11.00, 2.00, 173.00, false, 'paid', 0, '2026-01-26 07:00:00+00'),
('eeeeeeee-0021-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-02-02', '2026-02-08', 160.00, 14.00, 5.00, 179.00, false, 'paid', 0, '2026-02-02 07:00:00+00'),
('eeeeeeee-0021-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-02-09', '2026-02-15', 160.00, 12.00, 3.00, 175.00, false, 'paid', 0, '2026-02-09 07:00:00+00'),
('eeeeeeee-0021-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-02-16', '2026-02-22', 160.00, 13.00, 4.00, 177.00, false, 'paid', 0, '2026-02-16 07:00:00+00'),
('eeeeeeee-0021-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-02-23', '2026-03-01', 160.00, 11.00, 2.00, 173.00, false, 'paid', 0, '2026-02-23 07:00:00+00'),
('eeeeeeee-0021-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-03-02', '2026-03-08', 160.00, 14.00, 5.00, 179.00, false, 'paid', 0, '2026-03-02 07:00:00+00'),
('eeeeeeee-0021-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-03-09', '2026-03-15', 160.00, 12.00, 3.00, 175.00, false, 'paid', 0, '2026-03-09 07:00:00+00'),
('eeeeeeee-0021-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-03-16', '2026-03-22', 160.00, 13.00, 4.00, 177.00, false, 'paid', 0, '2026-03-16 07:00:00+00'),
('eeeeeeee-0021-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-03-23', '2026-03-29', 160.00, 11.00, 2.00, 173.00, false, 'paid', 0, '2026-03-23 07:00:00+00'),
('eeeeeeee-0021-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-03-30', '2026-04-05', 160.00, 14.00, 5.00, 179.00, true, 'paid', 0, '2026-03-30 07:00:00+00'),

-- ---------------------------------------------------------------------------
-- Q22: Hardik Patel - Ahmedabad, Medium (120), w1-w10
-- ---------------------------------------------------------------------------
('eeeeeeee-0022-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-01-12', '2026-01-18', 120.00, 12.00, 3.00, 135.00, false, 'paid', 0, '2026-01-12 08:00:00+00'),
('eeeeeeee-0022-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-01-19', '2026-01-25', 120.00, 11.00, 2.00, 133.00, false, 'paid', 0, '2026-01-19 08:00:00+00'),
('eeeeeeee-0022-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-01-26', '2026-02-01', 120.00, 14.00, 4.00, 138.00, false, 'paid', 0, '2026-01-26 08:00:00+00'),
('eeeeeeee-0022-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-02-02', '2026-02-08', 120.00, 13.00, 5.00, 138.00, false, 'paid', 0, '2026-02-02 08:00:00+00'),
('eeeeeeee-0022-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-02-09', '2026-02-15', 120.00, 12.00, 3.00, 135.00, false, 'paid', 0, '2026-02-09 08:00:00+00'),
('eeeeeeee-0022-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-02-16', '2026-02-22', 120.00, 11.00, 2.00, 133.00, false, 'paid', 0, '2026-02-16 08:00:00+00'),
('eeeeeeee-0022-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-02-23', '2026-03-01', 120.00, 14.00, 4.00, 138.00, false, 'paid', 0, '2026-02-23 08:00:00+00'),
('eeeeeeee-0022-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-03-02', '2026-03-08', 120.00, 13.00, 3.00, 136.00, false, 'paid', 0, '2026-03-02 08:00:00+00'),
('eeeeeeee-0022-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-03-09', '2026-03-15', 120.00, 12.00, 5.00, 137.00, false, 'paid', 0, '2026-03-09 08:00:00+00'),
('eeeeeeee-0022-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-03-16', '2026-03-22', 120.00, 11.00, 2.00, 133.00, false, 'paid', 0, '2026-03-16 08:00:00+00'),

-- ---------------------------------------------------------------------------
-- Q23: Om Prakash Sharma - Jaipur, High (160), w1-w12
-- ---------------------------------------------------------------------------
('eeeeeeee-0023-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-01-12', '2026-01-18', 160.00, 11.00, 2.00, 173.00, false, 'paid', 0, '2026-01-12 06:00:00+00'),
('eeeeeeee-0023-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-01-19', '2026-01-25', 160.00, 12.00, 3.00, 175.00, false, 'paid', 0, '2026-01-19 06:00:00+00'),
('eeeeeeee-0023-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-01-26', '2026-02-01', 160.00, 14.00, 4.00, 178.00, false, 'paid', 0, '2026-01-26 06:00:00+00'),
('eeeeeeee-0023-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-02-02', '2026-02-08', 160.00, 13.00, 5.00, 178.00, false, 'paid', 0, '2026-02-02 06:00:00+00'),
('eeeeeeee-0023-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-02-09', '2026-02-15', 160.00, 11.00, 2.00, 173.00, false, 'paid', 0, '2026-02-09 06:00:00+00'),
('eeeeeeee-0023-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-02-16', '2026-02-22', 160.00, 12.00, 3.00, 175.00, false, 'paid', 0, '2026-02-16 06:00:00+00'),
('eeeeeeee-0023-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-02-23', '2026-03-01', 160.00, 14.00, 4.00, 178.00, false, 'paid', 0, '2026-02-23 06:00:00+00'),
('eeeeeeee-0023-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-03-02', '2026-03-08', 160.00, 13.00, 3.00, 176.00, false, 'paid', 0, '2026-03-02 06:00:00+00'),
('eeeeeeee-0023-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-03-09', '2026-03-15', 160.00, 11.00, 5.00, 176.00, false, 'paid', 0, '2026-03-09 06:00:00+00'),
('eeeeeeee-0023-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-03-16', '2026-03-22', 160.00, 12.00, 2.00, 174.00, false, 'paid', 0, '2026-03-16 06:00:00+00'),
('eeeeeeee-0023-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-03-23', '2026-03-29', 160.00, 14.00, 4.00, 178.00, false, 'paid', 0, '2026-03-23 06:00:00+00'),
('eeeeeeee-0023-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'high'),
 '2026-03-30', '2026-04-05', 160.00, 13.00, 3.00, 176.00, true, 'paid', 0, '2026-03-30 06:00:00+00'),

-- ---------------------------------------------------------------------------
-- Q24: Dinesh Meena - Jaipur, Normal (80), w1-w8
-- ---------------------------------------------------------------------------
('eeeeeeee-0024-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-01-12', '2026-01-18', 80.00, 13.00, 2.00, 95.00, false, 'paid', 0, '2026-01-12 09:00:00+00'),
('eeeeeeee-0024-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-01-19', '2026-01-25', 80.00, 11.00, 3.00, 94.00, false, 'paid', 0, '2026-01-19 09:00:00+00'),
('eeeeeeee-0024-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-01-26', '2026-02-01', 80.00, 14.00, 4.00, 98.00, false, 'paid', 0, '2026-01-26 09:00:00+00'),
('eeeeeeee-0024-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-02-02', '2026-02-08', 80.00, 12.00, 2.00, 94.00, false, 'paid', 0, '2026-02-02 09:00:00+00'),
('eeeeeeee-0024-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-02-09', '2026-02-15', 80.00, 13.00, 5.00, 98.00, false, 'paid', 0, '2026-02-09 09:00:00+00'),
('eeeeeeee-0024-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-02-16', '2026-02-22', 80.00, 11.00, 3.00, 94.00, false, 'paid', 0, '2026-02-16 09:00:00+00'),
('eeeeeeee-0024-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-02-23', '2026-03-01', 80.00, 14.00, 2.00, 96.00, false, 'paid', 0, '2026-02-23 09:00:00+00'),
('eeeeeeee-0024-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'normal'),
 '2026-03-02', '2026-03-08', 80.00, 12.00, 4.00, 96.00, false, 'paid', 0, '2026-03-02 09:00:00+00'),

-- ---------------------------------------------------------------------------
-- Q25: Akhilesh Yadav - Lucknow, Medium (120), w3-w12
-- ---------------------------------------------------------------------------
('eeeeeeee-0025-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-01-26', '2026-02-01', 120.00, 12.00, 3.00, 135.00, false, 'paid', 0, '2026-01-26 10:00:00+00'),
('eeeeeeee-0025-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-02-02', '2026-02-08', 120.00, 13.00, 4.00, 137.00, false, 'paid', 0, '2026-02-02 10:00:00+00'),
('eeeeeeee-0025-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-02-09', '2026-02-15', 120.00, 11.00, 2.00, 133.00, false, 'paid', 0, '2026-02-09 10:00:00+00'),
('eeeeeeee-0025-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-02-16', '2026-02-22', 120.00, 14.00, 5.00, 139.00, false, 'paid', 0, '2026-02-16 10:00:00+00'),
('eeeeeeee-0025-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-02-23', '2026-03-01', 120.00, 12.00, 3.00, 135.00, false, 'paid', 0, '2026-02-23 10:00:00+00'),
('eeeeeeee-0025-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-03-02', '2026-03-08', 120.00, 13.00, 2.00, 135.00, false, 'paid', 0, '2026-03-02 10:00:00+00'),
('eeeeeeee-0025-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-03-09', '2026-03-15', 120.00, 11.00, 4.00, 135.00, false, 'paid', 0, '2026-03-09 10:00:00+00'),
('eeeeeeee-0025-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-03-16', '2026-03-22', 120.00, 14.00, 5.00, 139.00, false, 'paid', 0, '2026-03-16 10:00:00+00'),
('eeeeeeee-0025-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-03-23', '2026-03-29', 120.00, 12.00, 3.00, 135.00, false, 'paid', 0, '2026-03-23 10:00:00+00'),
('eeeeeeee-0025-0000-0000-000000000000', (SELECT id FROM plan_packages WHERE slug = 'medium'),
 '2026-03-30', '2026-04-05', 120.00, 13.00, 2.00, 135.00, true, 'paid', 0, '2026-03-30 10:00:00+00');

-- ============================================================================
-- SECTION 4: Parametric Claims (4 small claims)
-- All use Normal payout (1,000 INR). Reference existing disruption events.
-- ============================================================================

-- Claim Q1: Deepak Rane (Q01, Mumbai), E1 rainfall w2, 1000 INR
INSERT INTO parametric_claims (
  policy_id, profile_id, disruption_event_id,
  payout_amount_inr, status,
  gate1_passed, gate1_checked_at, gate2_passed, gate2_checked_at,
  activity_minutes, gps_within_zone,
  is_flagged, flag_reason, fraud_score, fraud_signals, device_fingerprint,
  admin_review_status, reviewed_by, reviewed_at,
  gateway_transaction_id, payout_initiated_at, payout_completed_at,
  created_at
) VALUES (
  (SELECT id FROM weekly_policies WHERE profile_id = 'eeeeeeee-0001-0000-0000-000000000000' AND week_start_date = '2026-01-19' LIMIT 1),
  'eeeeeeee-0001-0000-0000-000000000000',
  'cccccccc-0000-0000-0000-000000000001'::uuid,
  1000.00, 'paid',
  true, '2026-01-21 02:35:00+00', true, '2026-01-21 02:37:00+00',
  60, true,
  false, NULL, 0.05, '{}'::jsonb, 'fp-deepak-device-01',
  'approved', 'system', '2026-01-21 02:37:00+00',
  'SAFESHIFT_UPI_Q001', '2026-01-21 02:38:00+00', '2026-01-21 02:40:00+00',
  '2026-01-21 02:32:00+00'
);

-- Claim Q2: Santosh Naik (Q02, Mumbai), E3 rainfall w7, 1000 INR
INSERT INTO parametric_claims (
  policy_id, profile_id, disruption_event_id,
  payout_amount_inr, status,
  gate1_passed, gate1_checked_at, gate2_passed, gate2_checked_at,
  activity_minutes, gps_within_zone,
  is_flagged, flag_reason, fraud_score, fraud_signals, device_fingerprint,
  admin_review_status, reviewed_by, reviewed_at,
  gateway_transaction_id, payout_initiated_at, payout_completed_at,
  created_at
) VALUES (
  (SELECT id FROM weekly_policies WHERE profile_id = 'eeeeeeee-0002-0000-0000-000000000000' AND week_start_date = '2026-02-23' LIMIT 1),
  'eeeeeeee-0002-0000-0000-000000000000',
  'cccccccc-0000-0000-0000-000000000003'::uuid,
  1000.00, 'paid',
  true, '2026-02-25 13:05:00+00', true, '2026-02-25 13:07:00+00',
  60, true,
  false, NULL, 0.05, '{}'::jsonb, 'fp-santosh-device-01',
  'approved', 'system', '2026-02-25 13:07:00+00',
  'SAFESHIFT_UPI_Q002', '2026-02-25 13:08:00+00', '2026-02-25 13:10:00+00',
  '2026-02-25 13:02:00+00'
);

-- Claim Q3: Naveen Gupta (Q05, Delhi), E5 AQI w3, 1000 INR
INSERT INTO parametric_claims (
  policy_id, profile_id, disruption_event_id,
  payout_amount_inr, status,
  gate1_passed, gate1_checked_at, gate2_passed, gate2_checked_at,
  activity_minutes, gps_within_zone,
  is_flagged, flag_reason, fraud_score, fraud_signals, device_fingerprint,
  admin_review_status, reviewed_by, reviewed_at,
  gateway_transaction_id, payout_initiated_at, payout_completed_at,
  created_at
) VALUES (
  (SELECT id FROM weekly_policies WHERE profile_id = 'eeeeeeee-0005-0000-0000-000000000000' AND week_start_date = '2026-01-26' LIMIT 1),
  'eeeeeeee-0005-0000-0000-000000000000',
  'cccccccc-0000-0000-0000-000000000005'::uuid,
  1000.00, 'paid',
  true, '2026-01-28 09:35:00+00', true, '2026-01-28 09:37:00+00',
  60, true,
  false, NULL, 0.05, '{}'::jsonb, 'fp-naveen-device-01',
  'approved', 'system', '2026-01-28 09:37:00+00',
  'SAFESHIFT_UPI_Q003', '2026-01-28 09:38:00+00', '2026-01-28 09:40:00+00',
  '2026-01-28 09:32:00+00'
);

-- Claim Q4: Tapan Mondal (Q20, Kolkata), E14 cyclone w7, 1000 INR
INSERT INTO parametric_claims (
  policy_id, profile_id, disruption_event_id,
  payout_amount_inr, status,
  gate1_passed, gate1_checked_at, gate2_passed, gate2_checked_at,
  activity_minutes, gps_within_zone,
  is_flagged, flag_reason, fraud_score, fraud_signals, device_fingerprint,
  admin_review_status, reviewed_by, reviewed_at,
  gateway_transaction_id, payout_initiated_at, payout_completed_at,
  created_at
) VALUES (
  (SELECT id FROM weekly_policies WHERE profile_id = 'eeeeeeee-0020-0000-0000-000000000000' AND week_start_date = '2026-02-23' LIMIT 1),
  'eeeeeeee-0020-0000-0000-000000000000',
  'cccccccc-0000-0000-0000-000000000014'::uuid,
  1000.00, 'paid',
  true, '2026-02-25 10:35:00+00', true, '2026-02-25 10:37:00+00',
  60, true,
  false, NULL, 0.05, '{}'::jsonb, 'fp-tapan-device-01',
  'approved', 'system', '2026-02-25 10:37:00+00',
  'SAFESHIFT_UPI_Q004', '2026-02-25 10:38:00+00', '2026-02-25 10:40:00+00',
  '2026-02-25 10:32:00+00'
);

-- ============================================================================
-- SECTION 5: Payout Ledger (4 entries)
-- ============================================================================

INSERT INTO payout_ledger (claim_id, profile_id, amount_inr, payout_method, status, mock_upi_ref, completed_at, created_at) VALUES
((SELECT id FROM parametric_claims WHERE profile_id = 'eeeeeeee-0001-0000-0000-000000000000' AND disruption_event_id = 'cccccccc-0000-0000-0000-000000000001'::uuid LIMIT 1),
 'eeeeeeee-0001-0000-0000-000000000000', 1000.00, 'upi_instant', 'completed', 'SAFESHIFT_UPI_20260121_Q001', '2026-01-21 02:40:00+00', '2026-01-21 02:38:00+00'),
((SELECT id FROM parametric_claims WHERE profile_id = 'eeeeeeee-0002-0000-0000-000000000000' AND disruption_event_id = 'cccccccc-0000-0000-0000-000000000003'::uuid LIMIT 1),
 'eeeeeeee-0002-0000-0000-000000000000', 1000.00, 'upi_instant', 'completed', 'SAFESHIFT_UPI_20260225_Q002', '2026-02-25 13:10:00+00', '2026-02-25 13:08:00+00'),
((SELECT id FROM parametric_claims WHERE profile_id = 'eeeeeeee-0005-0000-0000-000000000000' AND disruption_event_id = 'cccccccc-0000-0000-0000-000000000005'::uuid LIMIT 1),
 'eeeeeeee-0005-0000-0000-000000000000', 1000.00, 'upi_instant', 'completed', 'SAFESHIFT_UPI_20260128_Q003', '2026-01-28 09:40:00+00', '2026-01-28 09:38:00+00'),
((SELECT id FROM parametric_claims WHERE profile_id = 'eeeeeeee-0020-0000-0000-000000000000' AND disruption_event_id = 'cccccccc-0000-0000-0000-000000000014'::uuid LIMIT 1),
 'eeeeeeee-0020-0000-0000-000000000000', 1000.00, 'upi_instant', 'completed', 'SAFESHIFT_UPI_20260225_Q004', '2026-02-25 10:40:00+00', '2026-02-25 10:38:00+00');

-- ============================================================================
-- SECTION 6: Coins Ledger (weekly_login entries, 2-3 per user)
-- ============================================================================

INSERT INTO coins_ledger (profile_id, activity, coins, description, created_at) VALUES
('eeeeeeee-0001-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-01-12 09:00:00+00'),
('eeeeeeee-0001-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-02-09 09:00:00+00'),
('eeeeeeee-0001-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-03-09 09:00:00+00'),
('eeeeeeee-0002-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-01-26 10:00:00+00'),
('eeeeeeee-0002-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-02-16 10:00:00+00'),
('eeeeeeee-0003-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-01-19 11:00:00+00'),
('eeeeeeee-0003-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-02-23 11:00:00+00'),
('eeeeeeee-0003-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-03-23 11:00:00+00'),
('eeeeeeee-0004-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-01-12 08:00:00+00'),
('eeeeeeee-0004-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-02-09 08:00:00+00'),
('eeeeeeee-0005-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-01-19 10:00:00+00'),
('eeeeeeee-0005-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-02-16 10:00:00+00'),
('eeeeeeee-0005-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-03-09 10:00:00+00'),
('eeeeeeee-0006-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-02-02 12:00:00+00'),
('eeeeeeee-0006-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-03-02 12:00:00+00'),
('eeeeeeee-0007-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-02-02 10:00:00+00'),
('eeeeeeee-0007-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-03-02 10:00:00+00'),
('eeeeeeee-0007-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-03-30 10:00:00+00'),
('eeeeeeee-0008-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-01-12 08:00:00+00'),
('eeeeeeee-0008-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-02-09 08:00:00+00'),
('eeeeeeee-0009-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-01-26 11:00:00+00'),
('eeeeeeee-0009-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-02-23 11:00:00+00'),
('eeeeeeee-0010-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-02-16 09:00:00+00'),
('eeeeeeee-0010-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-03-16 09:00:00+00'),
('eeeeeeee-0010-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-03-30 09:00:00+00'),
('eeeeeeee-0011-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-01-12 10:00:00+00'),
('eeeeeeee-0011-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-02-09 10:00:00+00'),
('eeeeeeee-0012-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-02-02 11:00:00+00'),
('eeeeeeee-0012-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-03-02 11:00:00+00'),
('eeeeeeee-0013-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-01-12 12:00:00+00'),
('eeeeeeee-0013-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-02-09 12:00:00+00'),
('eeeeeeee-0013-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-03-09 12:00:00+00'),
('eeeeeeee-0014-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-01-19 09:00:00+00'),
('eeeeeeee-0014-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-02-16 09:00:00+00'),
('eeeeeeee-0015-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-02-02 10:00:00+00'),
('eeeeeeee-0015-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-03-02 10:00:00+00'),
('eeeeeeee-0016-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-01-12 11:00:00+00'),
('eeeeeeee-0016-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-02-16 11:00:00+00'),
('eeeeeeee-0016-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-03-16 11:00:00+00'),
('eeeeeeee-0017-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-01-19 08:00:00+00'),
('eeeeeeee-0017-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-02-16 08:00:00+00'),
('eeeeeeee-0018-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-02-02 09:00:00+00'),
('eeeeeeee-0018-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-03-02 09:00:00+00'),
('eeeeeeee-0019-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-01-12 10:00:00+00'),
('eeeeeeee-0019-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-02-09 10:00:00+00'),
('eeeeeeee-0019-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-03-16 10:00:00+00'),
('eeeeeeee-0020-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-01-26 11:00:00+00'),
('eeeeeeee-0020-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-02-16 11:00:00+00'),
('eeeeeeee-0021-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-01-19 09:00:00+00'),
('eeeeeeee-0021-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-02-16 09:00:00+00'),
('eeeeeeee-0021-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-03-16 09:00:00+00'),
('eeeeeeee-0022-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-01-26 10:00:00+00'),
('eeeeeeee-0022-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-02-23 10:00:00+00'),
('eeeeeeee-0023-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-01-12 08:00:00+00'),
('eeeeeeee-0023-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-02-09 08:00:00+00'),
('eeeeeeee-0023-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-03-09 08:00:00+00'),
('eeeeeeee-0024-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-01-26 11:00:00+00'),
('eeeeeeee-0024-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-02-16 11:00:00+00'),
('eeeeeeee-0025-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-02-09 12:00:00+00'),
('eeeeeeee-0025-0000-0000-000000000000', 'weekly_login', 10, 'Weekly login bonus', '2026-03-09 12:00:00+00');

-- ============================================================================
-- SECTION 7: Update total_payout_this_week for policies with claims
-- ============================================================================

UPDATE weekly_policies SET total_payout_this_week = 1000.00
WHERE profile_id = 'eeeeeeee-0001-0000-0000-000000000000' AND week_start_date = '2026-01-19';

UPDATE weekly_policies SET total_payout_this_week = 1000.00
WHERE profile_id = 'eeeeeeee-0002-0000-0000-000000000000' AND week_start_date = '2026-02-23';

UPDATE weekly_policies SET total_payout_this_week = 1000.00
WHERE profile_id = 'eeeeeeee-0005-0000-0000-000000000000' AND week_start_date = '2026-01-26';

UPDATE weekly_policies SET total_payout_this_week = 1000.00
WHERE profile_id = 'eeeeeeee-0020-0000-0000-000000000000' AND week_start_date = '2026-02-23';

-- ============================================================================
-- VERIFICATION QUERIES (run these to check)
-- ============================================================================
--
-- Count quiet users:
--   SELECT COUNT(*) FROM profiles WHERE id::text LIKE 'eeeeeeee-%';
--   -- Expected: 25
--
-- Count quiet user policies:
--   SELECT COUNT(*) FROM weekly_policies WHERE profile_id::text LIKE 'eeeeeeee-%';
--   -- Expected: 252
--
-- Total quiet user premiums:
--   SELECT SUM(final_premium_inr) FROM weekly_policies WHERE profile_id::text LIKE 'eeeeeeee-%';
--   -- Expected: ~33,500-34,500
--
-- Quiet user claims:
--   SELECT COUNT(*) FROM parametric_claims WHERE profile_id::text LIKE 'eeeeeeee-%';
--   -- Expected: 4
--
-- BCR calculation (target 0.55-0.70):
--   SELECT
--     (SELECT SUM(payout_amount_inr) FROM parametric_claims WHERE status = 'paid') AS total_claims,
--     (SELECT SUM(final_premium_inr) FROM weekly_policies WHERE payment_status = 'paid') AS total_premiums,
--     ROUND(
--       (SELECT SUM(payout_amount_inr) FROM parametric_claims WHERE status = 'paid') /
--       NULLIF((SELECT SUM(final_premium_inr) FROM weekly_policies WHERE payment_status = 'paid'), 0),
--       3
--     ) AS bcr;
--   -- Expected BCR: ~0.64
--
-- ============================================================================
