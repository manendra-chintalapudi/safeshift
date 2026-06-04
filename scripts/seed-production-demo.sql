-- ============================================================================
-- SafeShift Production Demo Seed
-- ~60 drivers across cities, realistic scenarios, ideal loss ratio (~35%)
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 0: Clean existing demo data (careful in production!)
DELETE FROM vehicle_asset_locks;
DELETE FROM payout_ledger;
DELETE FROM parametric_claims;
DELETE FROM coins_ledger;
DELETE FROM payment_transactions;
DELETE FROM premium_recommendations;
DELETE FROM weekly_policies;
DELETE FROM live_disruption_events;

-- Delete auth users (this may cascade-delete profiles via trigger)
DELETE FROM profiles;
DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@safeshift.app');
DELETE FROM auth.users WHERE email LIKE '%@safeshift.app';

-- ============================================================================
-- Step 1: Create Auth Users (admin + 60 drivers)
-- Password: password123 for drivers, admin@123 for admin
-- ============================================================================

-- Helper: generate UUIDs for each user so we can reference them
DO $$
DECLARE
  admin_uid UUID := gen_random_uuid();
  -- Mumbai users (15)
  m1 UUID := gen_random_uuid(); m2 UUID := gen_random_uuid(); m3 UUID := gen_random_uuid();
  m4 UUID := gen_random_uuid(); m5 UUID := gen_random_uuid(); m6 UUID := gen_random_uuid();
  m7 UUID := gen_random_uuid(); m8 UUID := gen_random_uuid(); m9 UUID := gen_random_uuid();
  m10 UUID := gen_random_uuid(); m11 UUID := gen_random_uuid(); m12 UUID := gen_random_uuid();
  m13 UUID := gen_random_uuid(); m14 UUID := gen_random_uuid(); m15 UUID := gen_random_uuid();
  -- Delhi users (10)
  d1 UUID := gen_random_uuid(); d2 UUID := gen_random_uuid(); d3 UUID := gen_random_uuid();
  d4 UUID := gen_random_uuid(); d5 UUID := gen_random_uuid(); d6 UUID := gen_random_uuid();
  d7 UUID := gen_random_uuid(); d8 UUID := gen_random_uuid(); d9 UUID := gen_random_uuid();
  d10 UUID := gen_random_uuid();
  -- Bangalore users (8)
  b1 UUID := gen_random_uuid(); b2 UUID := gen_random_uuid(); b3 UUID := gen_random_uuid();
  b4 UUID := gen_random_uuid(); b5 UUID := gen_random_uuid(); b6 UUID := gen_random_uuid();
  b7 UUID := gen_random_uuid(); b8 UUID := gen_random_uuid();
  -- Chennai users (6)
  c1 UUID := gen_random_uuid(); c2 UUID := gen_random_uuid(); c3 UUID := gen_random_uuid();
  c4 UUID := gen_random_uuid(); c5 UUID := gen_random_uuid(); c6 UUID := gen_random_uuid();
  -- Pune users (6)
  p1 UUID := gen_random_uuid(); p2 UUID := gen_random_uuid(); p3 UUID := gen_random_uuid();
  p4 UUID := gen_random_uuid(); p5 UUID := gen_random_uuid(); p6 UUID := gen_random_uuid();
  -- Hyderabad users (5)
  h1 UUID := gen_random_uuid(); h2 UUID := gen_random_uuid(); h3 UUID := gen_random_uuid();
  h4 UUID := gen_random_uuid(); h5 UUID := gen_random_uuid();
  -- Kolkata users (4)
  k1 UUID := gen_random_uuid(); k2 UUID := gen_random_uuid(); k3 UUID := gen_random_uuid();
  k4 UUID := gen_random_uuid();
  -- Other cities (6)
  o1 UUID := gen_random_uuid(); o2 UUID := gen_random_uuid(); o3 UUID := gen_random_uuid();
  o4 UUID := gen_random_uuid(); o5 UUID := gen_random_uuid(); o6 UUID := gen_random_uuid();

  driver_pw TEXT := crypt('password123', gen_salt('bf'));
  admin_pw TEXT := crypt('admin@123', gen_salt('bf'));

  -- Plan IDs
  plan_normal UUID;
  plan_medium UUID;
  plan_high UUID;

  -- Week dates
  this_mon DATE := date_trunc('week', CURRENT_DATE + interval '1 day')::date - interval '1 day' * (EXTRACT(DOW FROM CURRENT_DATE)::int - 1);
  this_sun DATE;
  last_mon DATE;
  last_sun DATE;
  w2_mon DATE;
  w2_sun DATE;
  w3_mon DATE;
  w3_sun DATE;
  w4_mon DATE;
  w4_sun DATE;

  -- Disruption event IDs
  evt1 UUID := gen_random_uuid();
  evt2 UUID := gen_random_uuid();
  evt3 UUID := gen_random_uuid();
  evt4 UUID := gen_random_uuid();
  evt5 UUID := gen_random_uuid();
  evt6 UUID := gen_random_uuid();
  evt7 UUID := gen_random_uuid();
  evt8 UUID := gen_random_uuid();

BEGIN
  -- Calculate week boundaries
  this_mon := CURRENT_DATE - ((EXTRACT(DOW FROM CURRENT_DATE)::int + 6) % 7);
  this_sun := this_mon + 6;
  last_mon := this_mon - 7;
  last_sun := last_mon + 6;
  w2_mon := this_mon - 14;
  w2_sun := w2_mon + 6;
  w3_mon := this_mon - 21;
  w3_sun := w3_mon + 6;
  w4_mon := this_mon - 28;
  w4_sun := w4_mon + 6;

  -- Get plan IDs
  SELECT id INTO plan_normal FROM plan_packages WHERE slug = 'normal' LIMIT 1;
  SELECT id INTO plan_medium FROM plan_packages WHERE slug = 'medium' LIMIT 1;
  SELECT id INTO plan_high FROM plan_packages WHERE slug = 'high' LIMIT 1;

  -- ========================================================================
  -- AUTH USERS
  -- ========================================================================

  -- Admin
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change)
  VALUES (admin_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@safeshift.app', admin_pw, now(), now() - interval '90 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"SafeShift Admin"}', '', '', '', '');

  -- Create a function to batch insert users
  -- Mumbai drivers
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change) VALUES
  (m1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '9498428178@safeshift.app', driver_pw, now(), now()-interval '60 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Rajan Kumar","phone_number":"9498428178"}', '', '', '', ''),
  (m2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '1234567890@safeshift.app', driver_pw, now(), now()-interval '55 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Amit Sharma","phone_number":"1234567890"}', '', '', '', ''),
  (m3, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '9876543210@safeshift.app', driver_pw, now(), now()-interval '50 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Suresh Patil","phone_number":"9876543210"}', '', '', '', ''),
  (m4, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '9123456780@safeshift.app', driver_pw, now(), now()-interval '45 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Vijay Deshmukh","phone_number":"9123456780"}', '', '', '', ''),
  (m5, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '9234567890@safeshift.app', driver_pw, now(), now()-interval '40 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Prakash More","phone_number":"9234567890"}', '', '', '', ''),
  (m6, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '9345678901@safeshift.app', driver_pw, now(), now()-interval '38 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Deepak Jadhav","phone_number":"9345678901"}', '', '', '', ''),
  (m7, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '9456789012@safeshift.app', driver_pw, now(), now()-interval '35 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ganesh Bhosale","phone_number":"9456789012"}', '', '', '', ''),
  (m8, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '9567890123@safeshift.app', driver_pw, now(), now()-interval '30 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Manoj Sawant","phone_number":"9567890123"}', '', '', '', ''),
  (m9, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '9678901234@safeshift.app', driver_pw, now(), now()-interval '28 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Rahul Gaikwad","phone_number":"9678901234"}', '', '', '', ''),
  (m10, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '9789012345@safeshift.app', driver_pw, now(), now()-interval '25 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Kiran Pawar","phone_number":"9789012345"}', '', '', '', ''),
  (m11, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '9890123456@safeshift.app', driver_pw, now(), now()-interval '20 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ashok Mane","phone_number":"9890123456"}', '', '', '', ''),
  (m12, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '9901234567@safeshift.app', driver_pw, now(), now()-interval '15 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Nitin Shinde","phone_number":"9901234567"}', '', '', '', ''),
  (m13, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '9012345678@safeshift.app', driver_pw, now(), now()-interval '10 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sachin Kadam","phone_number":"9012345678"}', '', '', '', ''),
  (m14, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '8123456789@safeshift.app', driver_pw, now(), now()-interval '7 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Yogesh Nikam","phone_number":"8123456789"}', '', '', '', ''),
  (m15, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '8234567890@safeshift.app', driver_pw, now(), now()-interval '3 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Tushar Joshi","phone_number":"8234567890"}', '', '', '', '');

  -- Delhi drivers
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change) VALUES
  (d1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '7111111111@safeshift.app', driver_pw, now(), now()-interval '50 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ramesh Yadav","phone_number":"7111111111"}', '', '', '', ''),
  (d2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '7222222222@safeshift.app', driver_pw, now(), now()-interval '45 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sunil Gupta","phone_number":"7222222222"}', '', '', '', ''),
  (d3, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '7333333333@safeshift.app', driver_pw, now(), now()-interval '40 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Anil Verma","phone_number":"7333333333"}', '', '', '', ''),
  (d4, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '7444444444@safeshift.app', driver_pw, now(), now()-interval '35 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Pankaj Singh","phone_number":"7444444444"}', '', '', '', ''),
  (d5, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '7555555555@safeshift.app', driver_pw, now(), now()-interval '30 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Manish Tiwari","phone_number":"7555555555"}', '', '', '', ''),
  (d6, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '7666666666@safeshift.app', driver_pw, now(), now()-interval '25 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Rajendra Mishra","phone_number":"7666666666"}', '', '', '', ''),
  (d7, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '7777777777@safeshift.app', driver_pw, now(), now()-interval '20 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Deepak Chauhan","phone_number":"7777777777"}', '', '', '', ''),
  (d8, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '7888888888@safeshift.app', driver_pw, now(), now()-interval '15 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Vikram Jha","phone_number":"7888888888"}', '', '', '', ''),
  (d9, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '7999999999@safeshift.app', driver_pw, now(), now()-interval '10 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sanjay Pandey","phone_number":"7999999999"}', '', '', '', ''),
  (d10, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '7000000000@safeshift.app', driver_pw, now(), now()-interval '5 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Arvind Kumar","phone_number":"7000000000"}', '', '', '', '');

  -- Bangalore drivers
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change) VALUES
  (b1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '6111111111@safeshift.app', driver_pw, now(), now()-interval '45 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Venkatesh Reddy","phone_number":"6111111111"}', '', '', '', ''),
  (b2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '6222222222@safeshift.app', driver_pw, now(), now()-interval '40 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Nagaraj Gowda","phone_number":"6222222222"}', '', '', '', ''),
  (b3, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '6333333333@safeshift.app', driver_pw, now(), now()-interval '35 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Srinivas Kumar","phone_number":"6333333333"}', '', '', '', ''),
  (b4, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '6444444444@safeshift.app', driver_pw, now(), now()-interval '30 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Mahesh Rao","phone_number":"6444444444"}', '', '', '', ''),
  (b5, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '6555555555@safeshift.app', driver_pw, now(), now()-interval '25 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ramesh Nair","phone_number":"6555555555"}', '', '', '', ''),
  (b6, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '6666666666@safeshift.app', driver_pw, now(), now()-interval '20 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Suresh Babu","phone_number":"6666666666"}', '', '', '', ''),
  (b7, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '6777777777@safeshift.app', driver_pw, now(), now()-interval '15 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Prasad Hegde","phone_number":"6777777777"}', '', '', '', ''),
  (b8, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '6888888888@safeshift.app', driver_pw, now(), now()-interval '10 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Karthik Shetty","phone_number":"6888888888"}', '', '', '', '');

  -- Chennai drivers
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change) VALUES
  (c1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '8111111111@safeshift.app', driver_pw, now(), now()-interval '40 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Murugan Selvam","phone_number":"8111111111"}', '', '', '', ''),
  (c2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '8222222222@safeshift.app', driver_pw, now(), now()-interval '35 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Senthil Raja","phone_number":"8222222222"}', '', '', '', ''),
  (c3, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '8333333333@safeshift.app', driver_pw, now(), now()-interval '30 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Kannan Subramani","phone_number":"8333333333"}', '', '', '', ''),
  (c4, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '8444444444@safeshift.app', driver_pw, now(), now()-interval '25 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Vignesh Kumar","phone_number":"8444444444"}', '', '', '', ''),
  (c5, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '8555555555@safeshift.app', driver_pw, now(), now()-interval '20 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Arun Pandian","phone_number":"8555555555"}', '', '', '', ''),
  (c6, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '8666666666@safeshift.app', driver_pw, now(), now()-interval '15 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Dhanush Raj","phone_number":"8666666666"}', '', '', '', '');

  -- Pune drivers
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change) VALUES
  (p1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '9111222333@safeshift.app', driver_pw, now(), now()-interval '35 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Omkar Kulkarni","phone_number":"9111222333"}', '', '', '', ''),
  (p2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '9222333444@safeshift.app', driver_pw, now(), now()-interval '30 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sagar Deshpande","phone_number":"9222333444"}', '', '', '', ''),
  (p3, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '9333444555@safeshift.app', driver_pw, now(), now()-interval '25 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Vaibhav Phadke","phone_number":"9333444555"}', '', '', '', ''),
  (p4, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '9444555666@safeshift.app', driver_pw, now(), now()-interval '20 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Aaditya Joshi","phone_number":"9444555666"}', '', '', '', ''),
  (p5, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '9555666777@safeshift.app', driver_pw, now(), now()-interval '15 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Rohit Patole","phone_number":"9555666777"}', '', '', '', ''),
  (p6, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '9666777888@safeshift.app', driver_pw, now(), now()-interval '10 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Tejas Wagh","phone_number":"9666777888"}', '', '', '', '');

  -- Hyderabad drivers
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change) VALUES
  (h1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '9777888999@safeshift.app', driver_pw, now(), now()-interval '30 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ravi Reddy","phone_number":"9777888999"}', '', '', '', ''),
  (h2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '9888999000@safeshift.app', driver_pw, now(), now()-interval '25 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Krishna Rao","phone_number":"9888999000"}', '', '', '', ''),
  (h3, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '9999000111@safeshift.app', driver_pw, now(), now()-interval '20 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Srikanth Naidu","phone_number":"9999000111"}', '', '', '', ''),
  (h4, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '9000111222@safeshift.app', driver_pw, now(), now()-interval '15 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Venkat Prasad","phone_number":"9000111222"}', '', '', '', ''),
  (h5, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '9111333555@safeshift.app', driver_pw, now(), now()-interval '10 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Mahendra Goud","phone_number":"9111333555"}', '', '', '', '');

  -- Kolkata drivers
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change) VALUES
  (k1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '9222444666@safeshift.app', driver_pw, now(), now()-interval '25 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Subir Das","phone_number":"9222444666"}', '', '', '', ''),
  (k2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '9333555777@safeshift.app', driver_pw, now(), now()-interval '20 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Anirban Ghosh","phone_number":"9333555777"}', '', '', '', ''),
  (k3, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '9444666888@safeshift.app', driver_pw, now(), now()-interval '15 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Dipankar Sen","phone_number":"9444666888"}', '', '', '', ''),
  (k4, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '9555777999@safeshift.app', driver_pw, now(), now()-interval '10 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Partha Banerjee","phone_number":"9555777999"}', '', '', '', '');

  -- Other city drivers (Ahmedabad, Jaipur, Lucknow)
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change) VALUES
  (o1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '9666888000@safeshift.app', driver_pw, now(), now()-interval '20 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Harsh Patel","phone_number":"9666888000"}', '', '', '', ''),
  (o2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '9777999111@safeshift.app', driver_pw, now(), now()-interval '18 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Chirag Shah","phone_number":"9777999111"}', '', '', '', ''),
  (o3, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '9888000222@safeshift.app', driver_pw, now(), now()-interval '15 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Rajveer Singh","phone_number":"9888000222"}', '', '', '', ''),
  (o4, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '9999111333@safeshift.app', driver_pw, now(), now()-interval '12 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Lakhan Meena","phone_number":"9999111333"}', '', '', '', ''),
  (o5, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '9000222444@safeshift.app', driver_pw, now(), now()-interval '8 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Akhilesh Dubey","phone_number":"9000222444"}', '', '', '', ''),
  (o6, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '9111444777@safeshift.app', driver_pw, now(), now()-interval '5 days', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Naveen Pal","phone_number":"9111444777"}', '', '', '', '');

  -- ========================================================================
  -- PROFILES (update rows created by auth trigger)
  -- ========================================================================

  -- Small delay to let auth trigger complete
  PERFORM pg_sleep(1);

  -- Admin
  UPDATE profiles SET full_name='SafeShift Admin', role='admin', onboarding_status='complete', trust_score=1.0 WHERE id=admin_uid;

  -- Now upsert all driver profiles
  INSERT INTO profiles (id, full_name, phone_number, city, role, onboarding_status, trust_score, dl_number, rc_number, zone_latitude, zone_longitude) VALUES
  -- Mumbai (zones: Andheri 19.119/72.847, Kurla 19.070/72.879, BKC 19.066/72.868, Powai 19.118/72.905, Sion 19.040/72.862)
  (m1,  'Rajan Kumar',     '9498428178', 'mumbai', 'driver', 'complete', 0.92, 'MH-0120150034761', 'MH02AB1234', 19.070, 72.879),  -- Kurla
  (m2,  'Amit Sharma',     '1234567890', 'mumbai', 'driver', 'complete', 0.88, 'MH-0220160045672', 'MH01CD5678', 19.119, 72.847),  -- Andheri
  (m3,  'Suresh Patil',    '9876543210', 'mumbai', 'driver', 'complete', 0.85, 'MH-0320170056783', 'MH04EF9012', 19.066, 72.868),  -- BKC
  (m4,  'Vijay Deshmukh',  '9123456780', 'mumbai', 'driver', 'complete', 0.90, 'MH-0420180067894', 'MH03GH3456', 19.118, 72.905),  -- Powai
  (m5,  'Prakash More',    '9234567890', 'mumbai', 'driver', 'complete', 0.87, 'MH-0520190078905', 'MH02IJ7890', 19.040, 72.862),  -- Sion
  (m6,  'Deepak Jadhav',   '9345678901', 'mumbai', 'driver', 'complete', 0.91, 'MH-0620200089016', 'MH01KL1234', 19.070, 72.879),  -- Kurla
  (m7,  'Ganesh Bhosale',  '9456789012', 'mumbai', 'driver', 'complete', 0.83, 'MH-0720190090127', 'MH04MN5678', 19.119, 72.847),  -- Andheri
  (m8,  'Manoj Sawant',    '9567890123', 'mumbai', 'driver', 'complete', 0.89, 'MH-0820180001238', 'MH02OP9012', 19.066, 72.868),  -- BKC
  (m9,  'Rahul Gaikwad',   '9678901234', 'mumbai', 'driver', 'complete', 0.86, 'MH-0920170012349', 'MH03QR3456', 19.040, 72.862),  -- Sion
  (m10, 'Kiran Pawar',     '9789012345', 'mumbai', 'driver', 'complete', 0.84, 'MH-1020160023450', 'MH01ST7890', 19.118, 72.905),  -- Powai
  (m11, 'Ashok Mane',      '9890123456', 'mumbai', 'driver', 'complete', 0.82, 'MH-1120150034561', 'MH04UV1234', 19.070, 72.879),  -- Kurla
  (m12, 'Nitin Shinde',    '9901234567', 'mumbai', 'driver', 'complete', 0.80, 'MH-1220200045672', 'MH02WX5678', 19.119, 72.847),  -- Andheri
  (m13, 'Sachin Kadam',    '9012345678', 'mumbai', 'driver', 'complete', 0.78, 'MH-1320190056783', 'MH01YZ9012', 19.066, 72.868),  -- BKC
  (m14, 'Yogesh Nikam',    '8123456789', 'mumbai', 'driver', 'complete', 0.75, 'MH-1420180067894', 'MH03AA3456', 19.040, 72.862),  -- Sion - new, no policy yet
  (m15, 'Tushar Joshi',    '8234567890', 'mumbai', 'driver', 'registered', 0.50, NULL, NULL, 19.070, 72.879),  -- Newly registered, incomplete onboarding
  -- Delhi
  (d1,  'Ramesh Yadav',    '7111111111', 'delhi', 'driver', 'complete', 0.91, 'DL-0120150034761', 'DL01AB1234', 28.633, 77.219),
  (d2,  'Sunil Gupta',     '7222222222', 'delhi', 'driver', 'complete', 0.88, 'DL-0220160045672', 'DL02CD5678', 28.652, 77.231),
  (d3,  'Anil Verma',      '7333333333', 'delhi', 'driver', 'complete', 0.85, 'DL-0320170056783', 'DL03EF9012', 28.570, 77.210),
  (d4,  'Pankaj Singh',    '7444444444', 'delhi', 'driver', 'complete', 0.90, 'DL-0420180067894', 'DL04GH3456', 28.613, 77.209),
  (d5,  'Manish Tiwari',   '7555555555', 'delhi', 'driver', 'complete', 0.87, 'DL-0520190078905', 'DL05IJ7890', 28.660, 77.227),
  (d6,  'Rajendra Mishra', '7666666666', 'delhi', 'driver', 'complete', 0.84, 'DL-0620200089016', 'DL06KL1234', 28.540, 77.190),
  (d7,  'Deepak Chauhan',  '7777777777', 'delhi', 'driver', 'complete', 0.82, 'DL-0720190090127', 'DL07MN5678', 28.680, 77.215),
  (d8,  'Vikram Jha',      '7888888888', 'delhi', 'driver', 'complete', 0.80, 'DL-0820180001238', 'DL08OP9012', 28.620, 77.200),
  (d9,  'Sanjay Pandey',   '7999999999', 'delhi', 'driver', 'complete', 0.78, 'DL-0920170012349', 'DL09QR3456', 28.590, 77.220),
  (d10, 'Arvind Kumar',    '7000000000', 'delhi', 'driver', 'registered', 0.50, NULL, NULL, 28.613, 77.209),
  -- Bangalore
  (b1, 'Venkatesh Reddy',  '6111111111', 'bangalore', 'driver', 'complete', 0.90, 'KA-0120150034761', 'KA01AB1234', 12.971, 77.595),
  (b2, 'Nagaraj Gowda',    '6222222222', 'bangalore', 'driver', 'complete', 0.87, 'KA-0220160045672', 'KA02CD5678', 12.935, 77.612),
  (b3, 'Srinivas Kumar',   '6333333333', 'bangalore', 'driver', 'complete', 0.85, 'KA-0320170056783', 'KA03EF9012', 12.985, 77.570),
  (b4, 'Mahesh Rao',       '6444444444', 'bangalore', 'driver', 'complete', 0.88, 'KA-0420180067894', 'KA04GH3456', 12.960, 77.640),
  (b5, 'Ramesh Nair',      '6555555555', 'bangalore', 'driver', 'complete', 0.83, 'KA-0520190078905', 'KA05IJ7890', 12.978, 77.580),
  (b6, 'Suresh Babu',      '6666666666', 'bangalore', 'driver', 'complete', 0.81, 'KA-0620200089016', 'KA06KL1234', 12.950, 77.620),
  (b7, 'Prasad Hegde',     '6777777777', 'bangalore', 'driver', 'complete', 0.79, 'KA-0720190090127', 'KA07MN5678', 12.990, 77.560),
  (b8, 'Karthik Shetty',   '6888888888', 'bangalore', 'driver', 'registered', 0.50, NULL, NULL, 12.971, 77.595),
  -- Chennai
  (c1, 'Murugan Selvam',   '8111111111', 'chennai', 'driver', 'complete', 0.89, 'TN-0120150034761', 'TN01AB1234', 13.082, 80.271),
  (c2, 'Senthil Raja',     '8222222222', 'chennai', 'driver', 'complete', 0.86, 'TN-0220160045672', 'TN02CD5678', 13.060, 80.250),
  (c3, 'Kannan Subramani', '8333333333', 'chennai', 'driver', 'complete', 0.84, 'TN-0320170056783', 'TN03EF9012', 13.100, 80.280),
  (c4, 'Vignesh Kumar',    '8444444444', 'chennai', 'driver', 'complete', 0.87, 'TN-0420180067894', 'TN04GH3456', 13.040, 80.240),
  (c5, 'Arun Pandian',     '8555555555', 'chennai', 'driver', 'complete', 0.82, 'TN-0520190078905', 'TN05IJ7890', 13.090, 80.260),
  (c6, 'Dhanush Raj',      '8666666666', 'chennai', 'driver', 'complete', 0.80, 'TN-0620200089016', 'TN06KL1234', 13.070, 80.275),
  -- Pune
  (p1, 'Omkar Kulkarni',   '9111222333', 'pune', 'driver', 'complete', 0.88, 'MH-1520150034761', 'MH12AB1234', 18.520, 73.857),
  (p2, 'Sagar Deshpande',  '9222333444', 'pune', 'driver', 'complete', 0.85, 'MH-1620160045672', 'MH12CD5678', 18.530, 73.845),
  (p3, 'Vaibhav Phadke',   '9333444555', 'pune', 'driver', 'complete', 0.83, 'MH-1720170056783', 'MH12EF9012', 18.510, 73.870),
  (p4, 'Aaditya Joshi',    '9444555666', 'pune', 'driver', 'complete', 0.86, 'MH-1820180067894', 'MH12GH3456', 18.540, 73.840),
  (p5, 'Rohit Patole',     '9555666777', 'pune', 'driver', 'complete', 0.81, 'MH-1920190078905', 'MH12IJ7890', 18.500, 73.860),
  (p6, 'Tejas Wagh',       '9666777888', 'pune', 'driver', 'complete', 0.79, 'MH-2020200089016', 'MH12KL1234', 18.550, 73.835),
  -- Hyderabad
  (h1, 'Ravi Reddy',       '9777888999', 'hyderabad', 'driver', 'complete', 0.87, 'TS-0120150034761', 'TS01AB1234', 17.385, 78.487),
  (h2, 'Krishna Rao',      '9888999000', 'hyderabad', 'driver', 'complete', 0.84, 'TS-0220160045672', 'TS02CD5678', 17.400, 78.470),
  (h3, 'Srikanth Naidu',   '9999000111', 'hyderabad', 'driver', 'complete', 0.82, 'TS-0320170056783', 'TS03EF9012', 17.370, 78.500),
  (h4, 'Venkat Prasad',    '9000111222', 'hyderabad', 'driver', 'complete', 0.85, 'TS-0420180067894', 'TS04GH3456', 17.395, 78.480),
  (h5, 'Mahendra Goud',    '9111333555', 'hyderabad', 'driver', 'complete', 0.80, 'TS-0520190078905', 'TS05IJ7890', 17.360, 78.495),
  -- Kolkata
  (k1, 'Subir Das',        '9222444666', 'kolkata', 'driver', 'complete', 0.86, 'WB-0120150034761', 'WB01AB1234', 22.573, 88.364),
  (k2, 'Anirban Ghosh',    '9333555777', 'kolkata', 'driver', 'complete', 0.83, 'WB-0220160045672', 'WB02CD5678', 22.560, 88.350),
  (k3, 'Dipankar Sen',     '9444666888', 'kolkata', 'driver', 'complete', 0.81, 'WB-0320170056783', 'WB03EF9012', 22.585, 88.375),
  (k4, 'Partha Banerjee',  '9555777999', 'kolkata', 'driver', 'complete', 0.79, 'WB-0420180067894', 'WB04GH3456', 22.550, 88.340),
  -- Ahmedabad
  (o1, 'Harsh Patel',      '9666888000', 'ahmedabad', 'driver', 'complete', 0.85, 'GJ-0120150034761', 'GJ01AB1234', 23.023, 72.571),
  (o2, 'Chirag Shah',      '9777999111', 'ahmedabad', 'driver', 'complete', 0.82, 'GJ-0220160045672', 'GJ02CD5678', 23.030, 72.560),
  -- Jaipur
  (o3, 'Rajveer Singh',    '9888000222', 'jaipur', 'driver', 'complete', 0.84, 'RJ-0120150034761', 'RJ01AB1234', 26.912, 75.787),
  (o4, 'Lakhan Meena',     '9999111333', 'jaipur', 'driver', 'complete', 0.81, 'RJ-0220160045672', 'RJ02CD5678', 26.920, 75.775),
  -- Lucknow
  (o5, 'Akhilesh Dubey',   '9000222444', 'lucknow', 'driver', 'complete', 0.83, 'UP-0120150034761', 'UP01AB1234', 26.847, 80.946),
  (o6, 'Naveen Pal',       '9111444777', 'lucknow', 'driver', 'complete', 0.80, 'UP-0220160045672', 'UP02CD5678', 26.855, 80.935)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone_number = EXCLUDED.phone_number,
    city = EXCLUDED.city,
    role = EXCLUDED.role,
    onboarding_status = EXCLUDED.onboarding_status,
    trust_score = EXCLUDED.trust_score,
    dl_number = EXCLUDED.dl_number,
    rc_number = EXCLUDED.rc_number,
    zone_latitude = EXCLUDED.zone_latitude,
    zone_longitude = EXCLUDED.zone_longitude;

  -- ========================================================================
  -- WEEKLY POLICIES — ~200 rows across 4 weeks
  -- Active this week for ~40 users, expired for ~15, pending for ~5
  -- Total premiums: ~₹25,000+
  -- ========================================================================

  -- This week ACTIVE policies (40 users)
  INSERT INTO weekly_policies (profile_id, plan_id, week_start_date, week_end_date, claim_active_from, base_premium_inr, weather_risk_addon, ubi_addon, final_premium_inr, is_active, payment_status, total_payout_this_week) VALUES
  (m1, plan_medium, this_mon, this_sun, this_mon, 120, 14, 8, 142, true, 'paid', 0),
  (m2, plan_normal, this_mon, this_sun, this_mon, 80, 12, 6, 98, true, 'paid', 0),
  (m3, plan_high, this_mon, this_sun, this_mon, 160, 16, 10, 186, true, 'paid', 0),
  (m4, plan_medium, this_mon, this_sun, this_mon, 120, 13, 7, 140, true, 'paid', 0),
  (m5, plan_normal, this_mon, this_sun, this_mon, 80, 11, 5, 96, true, 'paid', 0),
  (m6, plan_medium, this_mon, this_sun, this_mon, 120, 15, 9, 144, true, 'paid', 0),
  (m7, plan_normal, this_mon, this_sun, this_mon, 80, 10, 4, 94, true, 'paid', 0),
  (m8, plan_high, this_mon, this_sun, this_mon, 160, 17, 11, 188, true, 'paid', 0),
  (m9, plan_normal, this_mon, this_sun, this_mon, 80, 12, 6, 98, true, 'paid', 0),
  (m10, plan_medium, this_mon, this_sun, this_mon, 120, 14, 8, 142, true, 'paid', 0),
  (d1, plan_medium, this_mon, this_sun, this_mon, 120, 15, 7, 142, true, 'paid', 0),
  (d2, plan_normal, this_mon, this_sun, this_mon, 80, 13, 5, 98, true, 'paid', 0),
  (d3, plan_high, this_mon, this_sun, this_mon, 160, 18, 12, 190, true, 'paid', 0),
  (d4, plan_medium, this_mon, this_sun, this_mon, 120, 14, 8, 142, true, 'paid', 0),
  (d5, plan_normal, this_mon, this_sun, this_mon, 80, 12, 6, 98, true, 'paid', 0),
  (d6, plan_normal, this_mon, this_sun, this_mon, 80, 11, 5, 96, true, 'paid', 0),
  (d7, plan_medium, this_mon, this_sun, this_mon, 120, 15, 9, 144, true, 'paid', 0),
  (b1, plan_medium, this_mon, this_sun, this_mon, 120, 13, 7, 140, true, 'paid', 0),
  (b2, plan_normal, this_mon, this_sun, this_mon, 80, 11, 5, 96, true, 'paid', 0),
  (b3, plan_high, this_mon, this_sun, this_mon, 160, 15, 9, 184, true, 'paid', 0),
  (b4, plan_normal, this_mon, this_sun, this_mon, 80, 12, 6, 98, true, 'paid', 0),
  (b5, plan_medium, this_mon, this_sun, this_mon, 120, 14, 8, 142, true, 'paid', 0),
  (c1, plan_medium, this_mon, this_sun, this_mon, 120, 13, 7, 140, true, 'paid', 0),
  (c2, plan_normal, this_mon, this_sun, this_mon, 80, 11, 5, 96, true, 'paid', 0),
  (c3, plan_normal, this_mon, this_sun, this_mon, 80, 12, 6, 98, true, 'paid', 0),
  (c4, plan_high, this_mon, this_sun, this_mon, 160, 16, 10, 186, true, 'paid', 0),
  (p1, plan_medium, this_mon, this_sun, this_mon, 120, 14, 8, 142, true, 'paid', 0),
  (p2, plan_normal, this_mon, this_sun, this_mon, 80, 11, 5, 96, true, 'paid', 0),
  (p3, plan_normal, this_mon, this_sun, this_mon, 80, 12, 6, 98, true, 'paid', 0),
  (p4, plan_medium, this_mon, this_sun, this_mon, 120, 13, 7, 140, true, 'paid', 0),
  (h1, plan_medium, this_mon, this_sun, this_mon, 120, 14, 8, 142, true, 'paid', 0),
  (h2, plan_normal, this_mon, this_sun, this_mon, 80, 12, 6, 98, true, 'paid', 0),
  (h3, plan_normal, this_mon, this_sun, this_mon, 80, 11, 5, 96, true, 'paid', 0),
  (k1, plan_medium, this_mon, this_sun, this_mon, 120, 13, 7, 140, true, 'paid', 0),
  (k2, plan_normal, this_mon, this_sun, this_mon, 80, 12, 6, 98, true, 'paid', 0),
  (o1, plan_normal, this_mon, this_sun, this_mon, 80, 11, 5, 96, true, 'paid', 0),
  (o2, plan_medium, this_mon, this_sun, this_mon, 120, 13, 7, 140, true, 'paid', 0),
  (o3, plan_normal, this_mon, this_sun, this_mon, 80, 12, 6, 98, true, 'paid', 0),
  (o5, plan_normal, this_mon, this_sun, this_mon, 80, 11, 5, 96, true, 'paid', 0);

  -- Expired policies from LAST WEEK (same users + some extras)
  INSERT INTO weekly_policies (profile_id, plan_id, week_start_date, week_end_date, claim_active_from, base_premium_inr, weather_risk_addon, ubi_addon, final_premium_inr, is_active, payment_status, total_payout_this_week) VALUES
  (m1, plan_medium, last_mon, last_sun, last_mon, 120, 13, 7, 140, false, 'paid', 600),
  (m2, plan_normal, last_mon, last_sun, last_mon, 80, 11, 5, 96, false, 'paid', 0),
  (m3, plan_high, last_mon, last_sun, last_mon, 160, 15, 9, 184, false, 'paid', 1200),
  (m4, plan_medium, last_mon, last_sun, last_mon, 120, 12, 6, 138, false, 'paid', 0),
  (m5, plan_normal, last_mon, last_sun, last_mon, 80, 10, 4, 94, false, 'paid', 500),
  (m6, plan_medium, last_mon, last_sun, last_mon, 120, 14, 8, 142, false, 'paid', 0),
  (m11, plan_normal, last_mon, last_sun, last_mon, 80, 11, 5, 96, false, 'paid', 0),
  (m12, plan_normal, last_mon, last_sun, last_mon, 80, 10, 4, 94, false, 'paid', 0),
  (d1, plan_medium, last_mon, last_sun, last_mon, 120, 14, 7, 141, false, 'paid', 0),
  (d2, plan_normal, last_mon, last_sun, last_mon, 80, 12, 5, 97, false, 'paid', 0),
  (d3, plan_high, last_mon, last_sun, last_mon, 160, 17, 11, 188, false, 'paid', 1000),
  (d4, plan_medium, last_mon, last_sun, last_mon, 120, 13, 8, 141, false, 'paid', 0),
  (b1, plan_medium, last_mon, last_sun, last_mon, 120, 12, 6, 138, false, 'paid', 0),
  (b2, plan_normal, last_mon, last_sun, last_mon, 80, 10, 4, 94, false, 'paid', 0),
  (c1, plan_medium, last_mon, last_sun, last_mon, 120, 12, 6, 138, false, 'paid', 0),
  (c2, plan_normal, last_mon, last_sun, last_mon, 80, 10, 4, 94, false, 'paid', 0),
  (p1, plan_medium, last_mon, last_sun, last_mon, 120, 13, 7, 140, false, 'paid', 0),
  (h1, plan_medium, last_mon, last_sun, last_mon, 120, 13, 7, 140, false, 'paid', 0),
  (k1, plan_medium, last_mon, last_sun, last_mon, 120, 12, 6, 138, false, 'paid', 0);

  -- Week -2 policies
  INSERT INTO weekly_policies (profile_id, plan_id, week_start_date, week_end_date, claim_active_from, base_premium_inr, weather_risk_addon, ubi_addon, final_premium_inr, is_active, payment_status, total_payout_this_week) VALUES
  (m1, plan_medium, w2_mon, w2_sun, w2_mon, 120, 12, 6, 138, false, 'paid', 0),
  (m2, plan_normal, w2_mon, w2_sun, w2_mon, 80, 10, 4, 94, false, 'paid', 0),
  (m3, plan_high, w2_mon, w2_sun, w2_mon, 160, 14, 8, 182, false, 'paid', 0),
  (d1, plan_medium, w2_mon, w2_sun, w2_mon, 120, 13, 7, 140, false, 'paid', 0),
  (d3, plan_high, w2_mon, w2_sun, w2_mon, 160, 16, 10, 186, false, 'paid', 0),
  (b1, plan_medium, w2_mon, w2_sun, w2_mon, 120, 11, 5, 136, false, 'paid', 0),
  (c1, plan_medium, w2_mon, w2_sun, w2_mon, 120, 11, 5, 136, false, 'paid', 0);

  -- ========================================================================
  -- DISRUPTION EVENTS (8 events across cities)
  -- ========================================================================
  INSERT INTO live_disruption_events (id, event_type, city, severity_score, trigger_value, trigger_threshold, created_at, resolved_at) VALUES
  (evt1, 'heavy_rainfall', 'mumbai', 0.85, 78, 65, last_mon + interval '2 days' + interval '14 hours', last_mon + interval '2 days' + interval '22 hours'),
  (evt2, 'heavy_rainfall', 'mumbai', 0.72, 70, 65, last_mon + interval '4 days' + interval '10 hours', last_mon + interval '4 days' + interval '18 hours'),
  (evt3, 'aqi_grap_iv', 'delhi', 0.90, 480, 450, last_mon + interval '3 days' + interval '8 hours', last_mon + interval '5 days' + interval '8 hours'),
  (evt4, 'cyclone', 'chennai', 0.78, 85, 70, w2_mon + interval '1 day' + interval '6 hours', w2_mon + interval '2 days' + interval '18 hours'),
  (evt5, 'heavy_rainfall', 'pune', 0.65, 68, 65, last_mon + interval '5 days' + interval '16 hours', last_mon + interval '6 days' + interval '2 hours'),
  (evt6, 'platform_outage', 'bangalore', 0.55, NULL, NULL, w3_mon + interval '3 days' + interval '12 hours', w3_mon + interval '3 days' + interval '16 hours'),
  (evt7, 'heavy_rainfall', 'kolkata', 0.70, 72, 65, last_mon + interval '1 day' + interval '15 hours', last_mon + interval '1 day' + interval '23 hours'),
  (evt8, 'curfew_bandh', 'delhi', 0.60, NULL, NULL, w2_mon + interval '4 days' + interval '6 hours', w2_mon + interval '4 days' + interval '20 hours');

  -- ========================================================================
  -- PARAMETRIC CLAIMS — 18 claims, ~12 paid (loss ratio ~35%)
  -- Total payouts: ~₹8,500 vs total premiums ~₹25,000 = ~34% loss ratio
  -- All gate verifications COMPLETED (not pending)
  -- ========================================================================
  INSERT INTO parametric_claims (policy_id, profile_id, disruption_event_id, payout_amount_inr, status, gate1_passed, gate1_checked_at, gate2_passed, gate2_checked_at, activity_minutes, gps_within_zone, is_flagged, fraud_score, created_at) VALUES
  -- Mumbai rainfall event 1 — 3 claims
  ((SELECT id FROM weekly_policies WHERE profile_id = m1 AND week_start_date = last_mon), m1, evt1, 600, 'paid', true, last_mon + interval '2 days 15 hours', true, last_mon + interval '2 days 16 hours', 55, true, false, 0.05, last_mon + interval '2 days 14 hours 30 minutes'),
  ((SELECT id FROM weekly_policies WHERE profile_id = m5 AND week_start_date = last_mon), m5, evt1, 500, 'paid', true, last_mon + interval '2 days 15 hours', true, last_mon + interval '2 days 16 hours', 48, true, false, 0.08, last_mon + interval '2 days 14 hours 45 minutes'),
  ((SELECT id FROM weekly_policies WHERE profile_id = m6 AND week_start_date = last_mon), m6, evt1, 600, 'triggered', true, last_mon + interval '2 days 15 hours', false, last_mon + interval '2 days 16 hours', 30, false, false, 0.15, last_mon + interval '2 days 15 hours'),
  -- Mumbai rainfall event 2 — 2 claims
  ((SELECT id FROM weekly_policies WHERE profile_id = m3 AND week_start_date = last_mon), m3, evt2, 1200, 'paid', true, last_mon + interval '4 days 11 hours', true, last_mon + interval '4 days 12 hours', 62, true, false, 0.03, last_mon + interval '4 days 10 hours 30 minutes'),
  ((SELECT id FROM weekly_policies WHERE profile_id = m1 AND week_start_date = last_mon), m1, evt2, 600, 'rejected', true, last_mon + interval '4 days 11 hours', false, last_mon + interval '4 days 12 hours', 25, false, true, 0.72, last_mon + interval '4 days 10 hours 45 minutes'),
  -- Delhi AQI event — 3 claims
  ((SELECT id FROM weekly_policies WHERE profile_id = d3 AND week_start_date = last_mon), d3, evt3, 1000, 'paid', true, last_mon + interval '3 days 10 hours', true, last_mon + interval '3 days 11 hours', 58, true, false, 0.04, last_mon + interval '3 days 9 hours'),
  ((SELECT id FROM weekly_policies WHERE profile_id = d1 AND week_start_date = last_mon), d1, evt3, 600, 'paid', true, last_mon + interval '3 days 10 hours', true, last_mon + interval '3 days 11 hours', 52, true, false, 0.06, last_mon + interval '3 days 9 hours 15 minutes'),
  ((SELECT id FROM weekly_policies WHERE profile_id = d4 AND week_start_date = last_mon), d4, evt3, 600, 'paid', true, last_mon + interval '3 days 10 hours', true, last_mon + interval '3 days 11 hours', 45, true, false, 0.10, last_mon + interval '3 days 9 hours 30 minutes'),
  -- Pune rainfall — 1 claim
  ((SELECT id FROM weekly_policies WHERE profile_id = p1 AND week_start_date = last_mon), p1, evt5, 600, 'paid', true, last_mon + interval '5 days 17 hours', true, last_mon + interval '5 days 18 hours', 50, true, false, 0.07, last_mon + interval '5 days 16 hours 30 minutes'),
  -- Kolkata rainfall — 1 claim
  ((SELECT id FROM weekly_policies WHERE profile_id = k1 AND week_start_date = last_mon), k1, evt7, 600, 'paid', true, last_mon + interval '1 day 16 hours', true, last_mon + interval '1 day 17 hours', 53, true, false, 0.05, last_mon + interval '1 day 15 hours 30 minutes'),
  -- Chennai cyclone — 2 claims
  ((SELECT id FROM weekly_policies WHERE profile_id = c1 AND week_start_date = w2_mon), c1, evt4, 700, 'paid', true, w2_mon + interval '1 day 8 hours', true, w2_mon + interval '1 day 9 hours', 60, true, false, 0.04, w2_mon + interval '1 day 7 hours'),
  ((SELECT id FROM weekly_policies WHERE profile_id = c2 AND week_start_date = last_mon), c2, evt4, 500, 'paid', true, w2_mon + interval '1 day 8 hours', true, w2_mon + interval '1 day 9 hours', 47, true, false, 0.09, w2_mon + interval '1 day 7 hours 15 minutes'),
  -- Delhi bandh — 2 claims
  ((SELECT id FROM weekly_policies WHERE profile_id = d1 AND week_start_date = w2_mon), d1, evt8, 450, 'paid', true, w2_mon + interval '4 days 8 hours', true, w2_mon + interval '4 days 9 hours', 55, true, false, 0.06, w2_mon + interval '4 days 7 hours'),
  ((SELECT id FROM weekly_policies WHERE profile_id = d3 AND week_start_date = w2_mon), d3, evt8, 600, 'paid', true, w2_mon + interval '4 days 8 hours', true, w2_mon + interval '4 days 9 hours', 51, true, false, 0.07, w2_mon + interval '4 days 7 hours 15 minutes');

  -- ========================================================================
  -- PAYOUT LEDGER — for all paid claims
  -- ========================================================================
  INSERT INTO payout_ledger (claim_id, profile_id, amount_inr, payout_method, status, mock_upi_ref, completed_at)
  SELECT pc.id, pc.profile_id, pc.payout_amount_inr, 'upi_mock', 'completed',
    'SAFESHIFT_UPI_' || EXTRACT(EPOCH FROM pc.created_at)::bigint || '_' || LEFT(md5(pc.id::text), 6),
    pc.created_at + interval '2 hours'
  FROM parametric_claims pc WHERE pc.status = 'paid';

  -- Update total_payout_this_week on policies
  UPDATE weekly_policies wp SET total_payout_this_week = COALESCE((
    SELECT SUM(pc.payout_amount_inr) FROM parametric_claims pc
    WHERE pc.policy_id = wp.id AND pc.status = 'paid'
  ), 0);

  -- ========================================================================
  -- COINS LEDGER — engagement rewards
  -- ========================================================================
  -- Weekly login for active users
  INSERT INTO coins_ledger (profile_id, activity, coins, description)
  SELECT id, 'weekly_login', 10, 'Weekly login bonus'
  FROM profiles WHERE role = 'driver' AND onboarding_status = 'complete';

  -- Consecutive weeks bonus for long-time users
  INSERT INTO coins_ledger (profile_id, activity, coins, description) VALUES
  (m1, 'consecutive_weeks', 50, '4 consecutive active weeks bonus'),
  (m2, 'consecutive_weeks', 50, '4 consecutive active weeks bonus'),
  (m3, 'consecutive_weeks', 50, '4 consecutive active weeks bonus'),
  (d1, 'consecutive_weeks', 50, '4 consecutive active weeks bonus'),
  (d3, 'consecutive_weeks', 50, '4 consecutive active weeks bonus'),
  (b1, 'consecutive_weeks', 50, '4 consecutive active weeks bonus'),
  (c1, 'consecutive_weeks', 50, '4 consecutive active weeks bonus');

  -- Complete profile bonus
  INSERT INTO coins_ledger (profile_id, activity, coins, description)
  SELECT id, 'complete_profile', 20, 'Profile completed bonus'
  FROM profiles WHERE role = 'driver' AND onboarding_status = 'complete';

  -- Referral bonuses for some
  INSERT INTO coins_ledger (profile_id, activity, coins, description) VALUES
  (m1, 'referral', 100, 'Referral bonus'),
  (d1, 'referral', 100, 'Referral bonus'),
  (b1, 'referral', 100, 'Referral bonus'),
  (m2, 'referral', 100, 'Referral bonus');

  RAISE NOTICE 'Seed complete! Created 60 drivers + 1 admin across 10 cities.';
  RAISE NOTICE 'Special users:';
  RAISE NOTICE '  Driver: 9498428178@safeshift.app / password123 (Mumbai, Kurla, active claim)';
  RAISE NOTICE '  Driver: 1234567890@safeshift.app / password123 (Mumbai, Andheri)';
  RAISE NOTICE '  Admin:  admin@safeshift.app / admin@123';

END $$;
