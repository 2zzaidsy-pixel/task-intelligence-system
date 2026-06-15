-- =============================================
-- Task Intelligence System - Schema v2
-- Challenges, Profiles, Badges System
-- Run this AFTER schema.sql
-- =============================================

-- 1. Profiles Table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  email TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Challenges Table
CREATE TABLE IF NOT EXISTS challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  category TEXT DEFAULT 'general',
  start_date DATE,
  end_date DATE,
  winners_count INTEGER DEFAULT 1,
  max_participants INTEGER DEFAULT 100,
  current_participants INTEGER DEFAULT 0,
  registration_open BOOLEAN DEFAULT TRUE,
  success_requirements TEXT,
  verification_instructions TEXT,
  rules TEXT,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled', 'full')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Challenge Participants
CREATE TABLE IF NOT EXISTS challenge_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  email TEXT,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  points INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'banned', 'removed')),
  UNIQUE(challenge_id, user_id)
);

-- 4. Challenge Submissions
CREATE TABLE IF NOT EXISTS challenge_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  day_number INTEGER,
  description TEXT,
  proof_type TEXT DEFAULT 'text',
  telegram_username TEXT,
  google_email TEXT,
  notes TEXT,
  points_awarded INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Challenge Winners
CREATE TABLE IF NOT EXISTS challenge_winners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rank INTEGER,
  points INTEGER DEFAULT 0,
  approved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(challenge_id, user_id)
);

-- 6. Badges
CREATE TABLE IF NOT EXISTS badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. User Badges
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Challenges Policies
DROP POLICY IF EXISTS "Anyone can view challenges" ON challenges;
CREATE POLICY "Anyone can view challenges"
  ON challenges FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can insert challenges" ON challenges;
CREATE POLICY "Admins can insert challenges"
  ON challenges FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can update challenges" ON challenges;
CREATE POLICY "Admins can update challenges"
  ON challenges FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can delete challenges" ON challenges;
CREATE POLICY "Admins can delete challenges"
  ON challenges FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Challenge Participants Policies
DROP POLICY IF EXISTS "Anyone can view participants" ON challenge_participants;
CREATE POLICY "Anyone can view participants"
  ON challenge_participants FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can join challenges" ON challenge_participants;
CREATE POLICY "Users can join challenges"
  ON challenge_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage participants" ON challenge_participants;
CREATE POLICY "Admins can manage participants"
  ON challenge_participants FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can delete participants" ON challenge_participants;
CREATE POLICY "Admins can delete participants"
  ON challenge_participants FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Challenge Submissions Policies
DROP POLICY IF EXISTS "Users can view own submissions" ON challenge_submissions;
CREATE POLICY "Users can view own submissions"
  ON challenge_submissions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all submissions" ON challenge_submissions;
CREATE POLICY "Admins can view all submissions"
  ON challenge_submissions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users can insert own submissions" ON challenge_submissions;
CREATE POLICY "Users can insert own submissions"
  ON challenge_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can review submissions" ON challenge_submissions;
CREATE POLICY "Admins can review submissions"
  ON challenge_submissions FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Challenge Winners Policies
DROP POLICY IF EXISTS "Anyone can view winners" ON challenge_winners;
CREATE POLICY "Anyone can view winners"
  ON challenge_winners FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage winners" ON challenge_winners;
CREATE POLICY "Admins can manage winners"
  ON challenge_winners FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can update winners" ON challenge_winners;
CREATE POLICY "Admins can update winners"
  ON challenge_winners FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Badges Policies
DROP POLICY IF EXISTS "Anyone can view badges" ON badges;
CREATE POLICY "Anyone can view badges"
  ON badges FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage badges" ON badges;
CREATE POLICY "Admins can manage badges"
  ON badges FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- User Badges Policies
DROP POLICY IF EXISTS "Anyone can view user badges" ON user_badges;
CREATE POLICY "Anyone can view user badges"
  ON user_badges FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "System can award badges" ON user_badges;
CREATE POLICY "System can award badges"
  ON user_badges FOR INSERT
  WITH CHECK (true);

-- Insert default badges
INSERT INTO badges (name, description, icon, category) VALUES
  ('First Challenge', 'Complete your first challenge', '🏆', 'milestone'),
  ('7 Days Streak', '7 consecutive days of submissions', '🔥', 'streak'),
  ('30 Days Streak', '30 consecutive days of submissions', '💎', 'streak'),
  ('Weekly Champion', 'Top performer of the week', '👑', 'achievement'),
  ('Monthly Champion', 'Top performer of the month', '🌟', 'achievement'),
  ('Challenge Winner', 'Win any challenge', '🥇', 'achievement'),
  ('Top Performer', 'Highest points in a challenge', '⚡', 'achievement')
ON CONFLICT DO NOTHING;

-- Enable realtime
ALTER publication supabase_realtime ADD TABLE challenges;
ALTER publication supabase_realtime ADD TABLE challenge_participants;
ALTER publication supabase_realtime ADD TABLE challenge_submissions;
ALTER publication supabase_realtime ADD TABLE challenge_winners;
ALTER publication supabase_realtime ADD TABLE profiles;
ALTER publication supabase_realtime ADD TABLE user_badges;
