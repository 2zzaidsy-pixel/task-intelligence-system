-- =============================================
-- Task Intelligence System - Database Schema
-- =============================================

-- 1. Recurring Tasks Table
CREATE TABLE IF NOT EXISTS recurring_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  priority INTEGER DEFAULT 2 CHECK (priority >= 1 AND priority <= 3),
  days TEXT[] DEFAULT '{}',
  time TIME DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Daily Tasks Table
CREATE TABLE IF NOT EXISTS daily_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  priority INTEGER DEFAULT 2 CHECK (priority >= 1 AND priority <= 3),
  category TEXT DEFAULT 'شخصي',
  due_date DATE DEFAULT CURRENT_DATE,
  estimated_time INTEGER DEFAULT 30,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Productivity Stats Table
CREATE TABLE IF NOT EXISTS productivity_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  completion_rate DECIMAL(5,2) DEFAULT 0,
  productivity_score DECIMAL(5,2) DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  tasks_total INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 4. Task Completion Log (for recurring tasks daily tracking)
CREATE TABLE IF NOT EXISTS task_completion_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES recurring_tasks(id) ON DELETE CASCADE,
  completed_date DATE DEFAULT CURRENT_DATE,
  completed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, completed_date)
);

-- Enable Row Level Security
ALTER TABLE recurring_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE productivity_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completion_log ENABLE ROW LEVEL SECURITY;

-- Recurring Tasks Policies
DROP POLICY IF EXISTS "Users can view their own recurring tasks" ON recurring_tasks;
CREATE POLICY "Users can view their own recurring tasks"
  ON recurring_tasks FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own recurring tasks" ON recurring_tasks;
CREATE POLICY "Users can insert their own recurring tasks"
  ON recurring_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own recurring tasks" ON recurring_tasks;
CREATE POLICY "Users can update their own recurring tasks"
  ON recurring_tasks FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own recurring tasks" ON recurring_tasks;
CREATE POLICY "Users can delete their own recurring tasks"
  ON recurring_tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Daily Tasks Policies
DROP POLICY IF EXISTS "Users can view their own daily tasks" ON daily_tasks;
CREATE POLICY "Users can view their own daily tasks"
  ON daily_tasks FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own daily tasks" ON daily_tasks;
CREATE POLICY "Users can insert their own daily tasks"
  ON daily_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own daily tasks" ON daily_tasks;
CREATE POLICY "Users can update their own daily tasks"
  ON daily_tasks FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own daily tasks" ON daily_tasks;
CREATE POLICY "Users can delete their own daily tasks"
  ON daily_tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Productivity Stats Policies
DROP POLICY IF EXISTS "Users can view their own stats" ON productivity_stats;
CREATE POLICY "Users can view their own stats"
  ON productivity_stats FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own stats" ON productivity_stats;
CREATE POLICY "Users can insert their own stats"
  ON productivity_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own stats" ON productivity_stats;
CREATE POLICY "Users can update their own stats"
  ON productivity_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- Task Completion Log Policies
DROP POLICY IF EXISTS "Users can view their own completion log" ON task_completion_log;
CREATE POLICY "Users can view their own completion log"
  ON task_completion_log FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own completion log" ON task_completion_log;
CREATE POLICY "Users can insert their own completion log"
  ON task_completion_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own completion log" ON task_completion_log;
CREATE POLICY "Users can delete their own completion log"
  ON task_completion_log FOR DELETE
  USING (auth.uid() = user_id);

-- Enable real-time subscriptions
ALTER publication supabase_realtime ADD TABLE recurring_tasks;
ALTER publication supabase_realtime ADD TABLE daily_tasks;
ALTER publication supabase_realtime ADD TABLE productivity_stats;
ALTER publication supabase_realtime ADD TABLE task_completion_log;
