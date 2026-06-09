-- ============================================
-- Mundio Travel Management Schema
-- Coller dans Supabase SQL Editor et exécuter
-- ============================================

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- COMPANIES (clients corporate)
-- ============================================
CREATE TABLE companies (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  siret         TEXT,
  country       TEXT NOT NULL DEFAULT 'MZ',
  city          TEXT,
  email_domain  TEXT,                    -- ex: bci.co.mz (auto-rattachement)
  contract_type TEXT DEFAULT 'standard', -- standard | premium | vip
  credit_limit  NUMERIC(12,2) DEFAULT 0,
  payment_terms INTEGER DEFAULT 30,      -- jours
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROFILES (users liés à auth.users Supabase)
-- ============================================
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id    UUID REFERENCES companies(id) ON DELETE SET NULL,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT,
  role          TEXT NOT NULL DEFAULT 'traveler',
  -- roles: traveler | manager | approver | admin (Mundio staff)
  department    TEXT,
  cost_center   TEXT,
  passport_no   TEXT,
  passport_exp  DATE,
  nationality   TEXT DEFAULT 'MZ',
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TRAVEL POLICIES (par entreprise)
-- ============================================
CREATE TABLE travel_policies (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id            UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL DEFAULT 'Politique par défaut',
  -- Vols
  flight_economy_max_hours    INTEGER DEFAULT 4,
  flight_premium_max_hours    INTEGER DEFAULT 8,
  flight_business_roles       TEXT[] DEFAULT ARRAY['manager','approver'],
  -- Hôtels (MZN/nuit)
  hotel_africa_max_per_night  NUMERIC(10,2) DEFAULT 4000,
  hotel_europe_max_per_night  NUMERIC(10,2) DEFAULT 8000,
  hotel_other_max_per_night   NUMERIC(10,2) DEFAULT 6000,
  -- Approbations
  approval_threshold    NUMERIC(10,2) DEFAULT 50000, -- MZN
  approver_role         TEXT DEFAULT 'approver',
  -- Délais
  advance_booking_days  INTEGER DEFAULT 3,
  urgent_surcharge_pct  NUMERIC(5,2) DEFAULT 15,
  is_active             BOOLEAN DEFAULT true,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BUDGETS (par entreprise/département/période)
-- ============================================
CREATE TABLE budgets (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  department    TEXT NOT NULL,
  period_year   INTEGER NOT NULL,
  period_month  INTEGER,                  -- NULL = budget annuel
  amount        NUMERIC(12,2) NOT NULL,
  currency      TEXT DEFAULT 'MZN',
  created_by    UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TRAVEL REQUESTS (demandes de voyage)
-- ============================================
CREATE TABLE travel_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference       TEXT UNIQUE NOT NULL,   -- ex: MND-2025-0088
  company_id      UUID NOT NULL REFERENCES companies(id),
  traveler_id     UUID NOT NULL REFERENCES profiles(id),
  created_by      UUID NOT NULL REFERENCES profiles(id),

  -- Voyage
  trip_type       TEXT NOT NULL DEFAULT 'flight',  -- flight | hotel | package
  origin          TEXT,
  destination     TEXT NOT NULL,
  departure_date  DATE NOT NULL,
  return_date     DATE,
  passengers      INTEGER DEFAULT 1,
  cabin_class     TEXT DEFAULT 'economy',
  hotel_name      TEXT,
  hotel_checkin   DATE,
  hotel_checkout  DATE,

  -- Gestion
  purpose         TEXT,
  department      TEXT,
  cost_center     TEXT,
  total_amount    NUMERIC(12,2),
  currency        TEXT DEFAULT 'MZN',

  -- Statut
  status          TEXT NOT NULL DEFAULT 'draft',
  -- draft | pending_approval | approved | rejected | booked | cancelled
  rejection_reason TEXT,

  -- GDS / booking
  gds_pnr         TEXT,
  ticket_numbers  TEXT[],
  booked_at       TIMESTAMPTZ,
  booked_by       UUID REFERENCES profiles(id),

  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- APPROVALS (workflow d'approbation)
-- ============================================
CREATE TABLE approvals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id      UUID NOT NULL REFERENCES travel_requests(id) ON DELETE CASCADE,
  approver_id     UUID NOT NULL REFERENCES profiles(id),
  status          TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  comment         TEXT,
  decided_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INVITATIONS (inviter un gestionnaire)
-- ============================================
CREATE TABLE invitations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id),
  email         TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'manager',
  token         TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by    UUID REFERENCES profiles(id),
  accepted_at   TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AUTO-REFERENCE pour travel_requests
-- ============================================
CREATE SEQUENCE travel_request_seq START 1;

CREATE OR REPLACE FUNCTION generate_request_reference()
RETURNS TRIGGER AS $$
BEGIN
  NEW.reference := 'MND-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' ||
                   LPAD(nextval('travel_request_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_request_reference
BEFORE INSERT ON travel_requests
FOR EACH ROW WHEN (NEW.reference IS NULL OR NEW.reference = '')
EXECUTE FUNCTION generate_request_reference();

-- ============================================
-- UPDATED_AT auto
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_companies_updated BEFORE UPDATE ON companies
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_requests_updated BEFORE UPDATE ON travel_requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE companies       ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals       ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets         ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_policies ENABLE ROW LEVEL SECURITY;

-- Helper: récupérer le profil de l'utilisateur connecté
CREATE OR REPLACE FUNCTION auth_profile()
RETURNS profiles AS $$
  SELECT * FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Companies : visible par les membres de l'entreprise et les admins
CREATE POLICY "company_members_can_view" ON companies
  FOR SELECT USING (
    id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "admins_manage_companies" ON companies
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Profiles : chacun voit les membres de son entreprise
CREATE POLICY "same_company_profiles" ON profiles
  FOR SELECT USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "own_profile_update" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Travel requests : visibles par l'entreprise concernée
CREATE POLICY "company_requests" ON travel_requests
  FOR SELECT USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "travelers_create_requests" ON travel_requests
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "managers_update_requests" ON travel_requests
  FOR UPDATE USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('manager','approver','admin')
  );

-- Approvals : visibles par l'entreprise
CREATE POLICY "company_approvals" ON approvals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM travel_requests tr
      WHERE tr.id = request_id
      AND tr.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "approvers_decide" ON approvals
  FOR UPDATE USING (approver_id = auth.uid());

-- Budgets
CREATE POLICY "company_budgets" ON budgets
  FOR SELECT USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- ============================================
-- DONNÉES DE DÉMONSTRATION
-- ============================================
INSERT INTO companies (id, name, country, city, email_domain, contract_type, credit_limit, payment_terms)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'BCI Banco', 'MZ', 'Maputo', 'bci.co.mz', 'premium', 500000, 30),
  ('22222222-2222-2222-2222-222222222222', 'Aeroportos de Moçambique', 'MZ', 'Maputo', 'adm.co.mz', 'vip', 1000000, 45);

INSERT INTO travel_policies (company_id, name, approval_threshold)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Política BCI 2025', 50000),
  ('22222222-2222-2222-2222-222222222222', 'Política ADM 2025', 80000);
