/* ===========================================
   THE SYSTEM - XP / Level / Rank Engine
   =========================================== */

const XP_SOURCES = {
  DAILY_TASK: { amount: 10, desc: 'إكمال مهمة يومية' },
  RECURRING_TASK: { amount: 15, desc: 'إكمال مهمة متكررة' },
  JOIN_CHALLENGE: { amount: 50, desc: 'المشاركة في تحدي' },
  COMPLETE_CHALLENGE: { amount: 200, desc: 'إكمال تحدي' },
  WIN_CHALLENGE: { amount: 500, desc: 'الفوز بتحدي' },
  STREAK_7: { amount: 100, desc: 'استمرارية 7 أيام' },
  STREAK_30: { amount: 500, desc: 'استمرارية 30 يوماً' },
  QUEST_COMPLETE: { amount: 10, desc: 'إكمال مهمة' }
};

const RANK_THRESHOLDS = [
  { rank: 'E', minXp: 0, minLevel: 1, icon: '🟢', title: 'مبتدئ' },
  { rank: 'D', minXp: 500, minLevel: 5, icon: '🔵', title: 'متدرب' },
  { rank: 'C', minXp: 1500, minLevel: 10, icon: '🟣', title: 'محارب' },
  { rank: 'B', minXp: 4000, minLevel: 20, icon: '🟡', title: 'فارس' },
  { rank: 'A', minXp: 10000, minLevel: 35, icon: '🔴', title: 'نخبة' },
  { rank: 'S', minXp: 25000, minLevel: 55, icon: '💎', title: 'أسطورة' },
  { rank: 'SS', minXp: 50000, minLevel: 75, icon: '👑', title: 'ملك' },
  { rank: 'SSS', minXp: 75000, minLevel: 85, icon: '🌌', title: 'إمبراطور' },
  { rank: 'National', minXp: 100000, minLevel: 95, icon: '🌍', title: 'وطني' },
  { rank: 'Monarch', minXp: 200000, minLevel: 100, icon: '👁️', title: 'سيّد' }
];

function getLevelThreshold(level) {
  return Math.floor(100 * Math.pow(level, 1.5));
}

function getTotalXpForLevel(level) {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += getLevelThreshold(i);
  }
  return total;
}

function calculateLevel(totalXp) {
  let level = 1;
  let remaining = totalXp;
  while (remaining >= getLevelThreshold(level)) {
    remaining -= getLevelThreshold(level);
    level++;
  }
  return { level: Math.max(1, level), xpInLevel: remaining, xpForNext: getLevelThreshold(level) };
}

function calculateRank(totalXp, level, completedChallenges) {
  let bestRank = 'E';
  for (const r of RANK_THRESHOLDS) {
    if (totalXp >= r.minXp && level >= r.minLevel) {
      bestRank = r.rank;
    }
  }
  return bestRank;
}

function getRankInfo(rank) {
  return RANK_THRESHOLDS.find(r => r.rank === rank) || RANK_THRESHOLDS[0];
}

async function ensureUserProgress(userId) {
  let { data, error } = await supabaseClient
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const { data: newProgress, error: insertError } = await supabaseClient
      .from('user_progress')
      .insert({
        user_id: userId,
        total_xp: 0,
        current_level: 1,
        current_rank: 'E',
        streak_days: 0,
        best_streak: 0,
        completed_quests: 0,
        completed_challenges: 0
      })
      .select()
      .single();
    if (insertError) throw insertError;
    return newProgress;
  }
  return data;
}

async function addXp(userId, amount, source, sourceId, description) {
  const { error: logError } = await supabaseClient
    .from('xp_log')
    .insert({
      user_id: userId,
      amount,
      source,
      source_id: sourceId ? String(sourceId) : null,
      description: description || ''
    });
  if (logError) throw logError;

  let progress = await ensureUserProgress(userId);
  const newTotal = (progress.total_xp || 0) + amount;
  const { level, xpInLevel, xpForNext } = calculateLevel(newTotal);
  const newRank = calculateRank(newTotal, level, progress.completed_challenges || 0);

  if (newRank !== progress.current_rank) {
    showToast(`ترقية الرتبة! ${getRankInfo(newRank).icon} ${newRank} Rank`, 'success', 5000);
  }
  if (level > progress.current_level) {
    showToast(`رفع المستوى! المستوى ${level} 🎉`, 'success', 5000);
  }

  const { error: updateError } = await supabaseClient
    .from('user_progress')
    .update({
      total_xp: newTotal,
      current_level: level,
      current_rank: newRank,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);
  if (updateError) throw updateError;

  progress.total_xp = newTotal;
  progress.current_level = level;
  progress.current_rank = newRank;
  return progress;
}

async function updateStreak(userId) {
  const today = getTodayStr();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  let progress = await ensureUserProgress(userId);

  const { data: todayTasks } = await supabaseClient
    .from('daily_tasks')
    .select('id')
    .eq('user_id', userId)
    .eq('due_date', today)
    .eq('completed', true);

  const hasActivity = todayTasks && todayTasks.length > 0;

  if (hasActivity) {
    const lastDate = progress.last_activity_date;
    let newStreak = progress.streak_days || 0;

    if (lastDate === yesterday) {
      newStreak += 1;
    } else if (lastDate !== today) {
      newStreak = 1;
    }

    const bestStreak = Math.max(newStreak, progress.best_streak || 0);
    const updates = {
      streak_days: newStreak,
      best_streak: bestStreak,
      last_activity_date: today,
      updated_at: new Date().toISOString()
    };

    if (newStreak === 7) {
      try { await addXp(userId, 100, 'streak_7', null, 'استمرارية 7 أيام'); } catch(e) {}
    } else if (newStreak === 30) {
      try { await addXp(userId, 500, 'streak_30', null, 'استمرارية 30 يوماً'); } catch(e) {}
    }

    await supabaseClient.from('user_progress').update(updates).eq('user_id', userId);
    return { ...progress, ...updates };
  }

  if (!hasActivity && progress.last_activity_date && progress.last_activity_date !== today) {
    if (progress.last_activity_date !== yesterday) {
      await supabaseClient.from('user_progress')
        .update({ streak_days: 0, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
      return { ...progress, streak_days: 0 };
    }
  }

  return progress;
}

async function checkAchievements(userId) {
  const progress = await ensureUserProgress(userId);
  const { data: allAchievements } = await supabaseClient.from('achievements').select('*');
  const { data: earnedData } = await supabaseClient.from('user_achievements').select('achievement_id').eq('user_id', userId);
  const earnedIds = new Set((earnedData || []).map(a => a.achievement_id));

  const newAchievements = [];

  for (const ach of (allAchievements || [])) {
    if (earnedIds.has(ach.id)) continue;
    let earned = false;
    switch (ach.requirement_type) {
      case 'quests_completed':
        earned = (progress.completed_quests || 0) >= ach.requirement_value;
        break;
      case 'total_xp':
        earned = (progress.total_xp || 0) >= ach.requirement_value;
        break;
      case 'challenges_joined':
        break;
      case 'challenges_completed':
        earned = (progress.completed_challenges || 0) >= ach.requirement_value;
        break;
      case 'streak_days':
        earned = (progress.streak_days || 0) >= ach.requirement_value;
        break;
      case 'rank':
        const rankOrder = ['E','D','C','B','A','S','SS','National'];
        const minRankIndex = rankOrder.indexOf(ach.requirement_value);
        const userRankIndex = rankOrder.indexOf(progress.current_rank);
        earned = userRankIndex >= minRankIndex;
        break;
      case 'level':
        earned = (progress.current_level || 0) >= ach.requirement_value;
        break;
    }
    if (earned) {
      newAchievements.push(ach);
      await supabaseClient.from('user_achievements').insert({
        user_id: userId,
        achievement_id: ach.id
      });
    }
  }

  for (const ach of newAchievements) {
    showToast(`إنجاز جديد! ${ach.icon} ${ach.name}`, 'success', 5000);
  }

  return newAchievements;
}

async function incrementCompletedQuests(userId) {
  const progress = await ensureUserProgress(userId);
  const newCount = (progress.completed_quests || 0) + 1;
  await supabaseClient.from('user_progress').update({ completed_quests: newCount }).eq('user_id', userId);
  return newCount;
}

async function incrementCompletedChallenges(userId) {
  const progress = await ensureUserProgress(userId);
  const newCount = (progress.completed_challenges || 0) + 1;
  await supabaseClient.from('user_progress').update({ completed_challenges: newCount }).eq('user_id', userId);
  return newCount;
}
