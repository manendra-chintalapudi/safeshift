-- ============================================================================
-- Migration 002: Profiles table
-- ============================================================================

CREATE TABLE profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name             TEXT,
  phone_number          TEXT UNIQUE,
  language              TEXT DEFAULT 'en',
  aadhaar_verified      BOOLEAN DEFAULT false,
  aadhaar_hash          TEXT,
  dl_number             TEXT,
  dl_verified           BOOLEAN DEFAULT false,
  dl_image_url          TEXT,
  rc_number             TEXT,
  rc_verified           BOOLEAN DEFAULT false,
  rc_image_url          TEXT,
  vehicle_hash          TEXT,
  upi_id                TEXT,
  upi_verified          BOOLEAN DEFAULT false,
  city                  TEXT,
  zone_latitude         NUMERIC(10,6),
  zone_longitude        NUMERIC(10,6),
  onboarding_status     onboarding_status DEFAULT 'language_selected',
  role                  TEXT DEFAULT 'driver' CHECK (role IN ('driver', 'admin')),
  trust_score           NUMERIC(3,2) DEFAULT 0.50,
  referral_code         TEXT UNIQUE,
  referred_by           UUID REFERENCES profiles(id),
  device_fingerprint    TEXT,
  razorpay_customer_id  TEXT,
  razorpay_subscription_id TEXT,
  auto_renew_enabled    BOOLEAN DEFAULT false,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, referral_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    UPPER(SUBSTRING(MD5(NEW.id::TEXT) FROM 1 FOR 8))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Service role full access"
  ON profiles FOR ALL USING (auth.role() = 'service_role');
