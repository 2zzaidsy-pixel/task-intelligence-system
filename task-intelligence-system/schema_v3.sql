-- =============================================
-- THE SYSTEM - Schema v3
-- XP, Levels, Ranks, Achievements, Waitlist
-- Run AFTER schema.sql and schema_v2.sql
-- =============================================

-- 1. User Progress (XP, Level, Rank, Streak)
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  total_xp INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  current_rank TEXT DEFAULT 'E' CHECK (current_rank IN ('E','D','C','B','A','S','SS','National')),
  streak_days INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  completed_quests INTEGER DEFAULT 0,
  completed_challenges INTEGER DEFAULT 0,
  last_activity_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. XP Transaction Log
CREATE TABLE IF NOT EXISTS xp_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  source TEXT NOT NULL,
  source_id TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Achievements
CREATE TABLE IF NOT EXISTS achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT DEFAULT 'general',
  requirement_type TEXT,
  requirement_value INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. User Achievements
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- 5. Challenge Waitlist
CREATE TABLE IF NOT EXISTS challenge_waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(challenge_id, user_id)
);

-- 6. Challenge Auto-generated Tasks
CREATE TABLE IF NOT EXISTS challenge_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  day_number INTEGER,
  xp_reward INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Add rarity to badges
ALTER TABLE badges ADD COLUMN IF NOT EXISTS rarity TEXT DEFAULT 'common'
  CHECK (rarity IN ('common', 'rare', 'epic', 'legendary', 'mythic'));

-- Enable RLS
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_tasks ENABLE ROW LEVEL SECURITY;

-- User Progress Policies
DROP POLICY IF EXISTS "Users can view own progress" ON user_progress;
CREATE POLICY "Users can view own progress"
  ON user_progress FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert progress" ON user_progress;
CREATE POLICY "System can insert progress"
  ON user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can update progress" ON user_progress;
CREATE POLICY "System can update progress"
  ON user_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- XP Log Policies
DROP POLICY IF EXISTS "Users can view own xp log" ON xp_log;
CREATE POLICY "Users can view own xp log"
  ON xp_log FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert xp log" ON xp_log;
CREATE POLICY "System can insert xp log"
  ON xp_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Achievements Policies
DROP POLICY IF EXISTS "Anyone can view achievements" ON achievements;
CREATE POLICY "Anyone can view achievements"
  ON achievements FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage achievements" ON achievements;
CREATE POLICY "Admins can manage achievements"
  ON achievements FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins can update achievements" ON achievements;
CREATE POLICY "Admins can update achievements"
  ON achievements FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- User Achievements Policies
DROP POLICY IF EXISTS "Anyone can view user achievements" ON user_achievements;
CREATE POLICY "Anyone can view user achievements"
  ON user_achievements FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "System can award achievements" ON user_achievements;
CREATE POLICY "System can award achievements"
  ON user_achievements FOR INSERT
  WITH CHECK (true);

-- Waitlist Policies
DROP POLICY IF EXISTS "Anyone can view waitlist" ON challenge_waitlist;
CREATE POLICY "Anyone can view waitlist"
  ON challenge_waitlist FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can join waitlist" ON challenge_waitlist;
CREATE POLICY "Users can join waitlist"
  ON challenge_waitlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can leave waitlist" ON challenge_waitlist;
CREATE POLICY "Users can leave waitlist"
  ON challenge_waitlist FOR DELETE
  USING (auth.uid() = user_id);

-- Challenge Tasks Policies
DROP POLICY IF EXISTS "Anyone can view challenge tasks" ON challenge_tasks;
CREATE POLICY "Anyone can view challenge tasks"
  ON challenge_tasks FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage challenge tasks" ON challenge_tasks;
CREATE POLICY "Admins can manage challenge tasks"
  ON challenge_tasks FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins can update challenge tasks" ON challenge_tasks;
CREATE POLICY "Admins can update challenge tasks"
  ON challenge_tasks FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins can delete challenge tasks" ON challenge_tasks;
CREATE POLICY "Admins can delete challenge tasks"
  ON challenge_tasks FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Insert default achievements
INSERT INTO achievements (name, description, icon, category, requirement_type, requirement_value) VALUES
  ('First Quest', 'Complete your first task', '🎯', 'milestone', 'quests_completed', 1),
  ('Task Warrior', 'Complete 50 tasks', '⚔️', 'milestone', 'quests_completed', 50),
  ('Task Master', 'Complete 500 tasks', '👑', 'milestone', 'quests_completed', 500),
  ('Rising Star', 'Earn 100 XP', '⭐', 'xp', 'total_xp', 100),
  ('XP Hunter', 'Earn 1000 XP', '🔥', 'xp', 'total_xp', 1000),
  ('XP Legend', 'Earn 10000 XP', '💫', 'xp', 'total_xp', 10000),
  ('First Challenge', 'Join your first challenge', '🏁', 'challenge', 'challenges_joined', 1),
  ('Challenge Veteran', 'Complete 5 challenges', '🏆', 'challenge', 'challenges_completed', 5),
  ('Week Warrior', 'Maintain a 7-day streak', '📅', 'streak', 'streak_days', 7),
  ('Monthly Legend', 'Maintain a 30-day streak', '🗓️', 'streak', 'streak_days', 30),
  ('Unstoppable', 'Reach S Rank', '💎', 'rank', 'rank', 25000),
  ('System Master', 'Reach Level 50', '🌟', 'level', 'level', 50)
ON CONFLICT DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_xp_log_user_id ON xp_log(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_log_user_source ON xp_log(user_id, source);
CREATE INDEX IF NOT EXISTS idx_user_progress_xp ON user_progress(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_user_progress_rank ON user_progress(current_rank);
CREATE INDEX IF NOT EXISTS idx_user_progress_level ON user_progress(current_level);
CREATE INDEX IF NOT EXISTS idx_user_progress_streak ON user_progress(streak_days DESC);
CREATE INDEX IF NOT EXISTS idx_challenge_waitlist_challenge ON challenge_waitlist(challenge_id, joined_at);
CREATE INDEX IF NOT EXISTS idx_challenge_tasks_challenge ON challenge_tasks(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_points ON challenge_participants(challenge_id, points DESC);
CREATE INDEX IF NOT EXISTS idx_challenge_submissions_status ON challenge_submissions(challenge_id, status);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_due ON daily_tasks(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_recurring_tasks_user ON recurring_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_status_date ON challenges(status, start_date);

-- Enable realtime for new tables
ALTER publication supabase_realtime ADD TABLE user_progress;
ALTER publication supabase_realtime ADD TABLE xp_log;
ALTER publication supabase_realtime ADD TABLE achievements;
ALTER publication supabase_realtime ADD TABLE user_achievements;
ALTER publication supabase_realtime ADD TABLE challenge_waitlist;
ALTER publication supabase_realtime ADD TABLE challenge_tasks;

-- =============================================
-- SECURITY: Auto-promote admin by email trigger
-- Replaces client-side admin check (security fix)
-- Run this AFTER schema_v3.sql in Supabase SQL Editor
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_admin_promotion()
RETURNS TRIGGER AS $$
BEGIN
  -- IMPORTANT: Change '2zzaid.sy@gmail.com' to your admin email
  IF NEW.email = '2zzaid.sy@gmail.com' THEN
    NEW.role := 'admin';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_insert_admin_check ON public.profiles;
CREATE TRIGGER on_profile_insert_admin_check
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_admin_promotion();
