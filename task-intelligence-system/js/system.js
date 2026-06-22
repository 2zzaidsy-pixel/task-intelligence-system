/* ===========================================
   THE SYSTEM - Main System Page Logic
   =========================================== */

let systemUser = null;
let systemProgress = null;

document.addEventListener('DOMContentLoaded', async () => {
  const auth = await checkAuthWithRole();
  if (!auth) return;
  systemUser = auth.user;
  await loadSystemPage();
});

async function loadSystemPage() {
  try {
    systemProgress = await ensureUserProgress(systemUser.id);
    await updateStreak(systemUser.id);
    await checkAchievements(systemUser.id);
    systemProgress = await ensureUserProgress(systemUser.id);
  } catch (err) {
    console.error('System init error:', err);
    systemProgress = { total_xp: 0, current_level: 1, current_rank: 'E', streak_days: 0, best_streak: 0, completed_quests: 0, completed_challenges: 0 };
  }
  // Each section is independent — one failure never blocks the rest
  try { renderLevelCard(); } catch (e) { console.error('Level card error:', e); }
  try { renderStats(); } catch (e) { console.error('Stats error:', e); }
  try { await renderActiveQuests(); } catch (e) { console.error('Quests error:', e); }
  try { await renderActiveChallenges(); } catch (e) { console.error('Challenges error:', e); }
  try { await renderAchievements(); } catch (e) { console.error('Achievements error:', e); }
}

function renderLevelCard() {
  const p = systemProgress || {};
  const { xpInLevel, xpForNext } = typeof calculateLevel === 'function'
    ? calculateLevel(p.total_xp || 0)
    : { xpInLevel: 0, xpForNext: 100 };
  const rankInfo = typeof getRankInfo === 'function'
    ? getRankInfo(p.current_rank || 'E')
    : { icon: '🟢', title: 'مبتدئ' };

  const byId = (id) => document.getElementById(id);
  const setText = (id, val) => { const el = byId(id); if (el) el.textContent = val; };

  setText('systemLevelBadge', p.current_level || 1);
  const rankEl = byId('systemRankDisplay');
  if (rankEl) {
    rankEl.textContent = `${rankInfo.icon} ${p.current_rank || 'E'} Rank`;
    rankEl.className = `rank-${p.current_rank || 'E'}`;
  }
  setText('systemRankTitle', rankInfo.title);
  setText('systemCurrentXp', p.total_xp || 0);
  setText('systemXpForNext', xpForNext);

  const percent = xpForNext > 0 ? Math.min(100, Math.round((xpInLevel / xpForNext) * 100)) : 0;
  const bar = byId('systemXpBar');
  if (bar) bar.style.width = percent + '%';
}

function renderStats() {
  const p = systemProgress || {};
  const byId = (id) => document.getElementById(id);
  const setText = (id, val) => { const el = byId(id); if (el) el.textContent = val; };

  setText('statTotalXp', p.total_xp || 0);
  setText('statCompletedQuests', p.completed_quests || 0);
  setText('statCompletedChallenges', p.completed_challenges || 0);
  setText('statStreakDays', p.streak_days || 0);
  setText('statBestStreak', p.best_streak || 0);

  const streakEl = byId('statStreakDays');
  if (streakEl) {
    if (p.streak_days >= 30) streakEl.style.color = 'var(--danger)';
    else if (p.streak_days >= 7) streakEl.style.color = 'var(--warning)';
  }
}

async function renderActiveQuests() {
  const container = document.getElementById('activeQuestsContainer');
  try {
    const today = getTodayStr();
    const { data: tasks } = await supabaseClient
      .from('daily_tasks')
      .select('*')
      .eq('user_id', systemUser.id)
      .eq('due_date', today)
      .order('priority', { ascending: true });

    const active = (tasks || []).filter(t => !t.completed);
    const completed = (tasks || []).filter(t => t.completed);

    if (active.length === 0 && completed.length === 0) {
      container.innerHTML = '<div class="empty-state"><p style="color:var(--text-muted);">لا توجد مهام لليوم. أضف مهامك في صفحة المهام</p></div>';
      return;
    }

    let html = '';

    if (active.length > 0) {
      html += `<div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:8px;">🎯 المهام النشطة (${active.length})</div>`;
      active.forEach(t => {
        const difficulty = t.priority === 1 ? 'hard' : t.priority === 2 ? 'medium' : 'easy';
        const diffLabel = t.priority === 1 ? 'صعب' : t.priority === 2 ? 'متوسط' : 'سهل';
        html += `
          <div class="quest-item" onclick="toggleTaskFromSystem('${t.id}')">
            <div class="quest-icon">${getCategoryIcon(t.category)}</div>
            <div class="quest-content">
              <div class="quest-title">${escapeHtml(t.title)}</div>
              <div class="quest-meta">
                <span>${t.category || 'عام'}</span>
                <span class="quest-difficulty ${difficulty}">${diffLabel}</span>
                ${t.estimated_time ? `<span>⏱ ${t.estimated_time} دقيقة</span>` : ''}
              </div>
            </div>
            <div class="quest-reward">+10 XP</div>
          </div>`;
      });
    }

    if (completed.length > 0) {
      html += `<div style="font-size:0.8rem;color:var(--text-muted);margin-top:16px;margin-bottom:8px;">✅ المهام المنجزة (${completed.length})</div>`;
      completed.forEach(t => {
        html += `
          <div class="quest-item completed">
            <div class="quest-icon completed-icon">✅</div>
            <div class="quest-content">
              <div class="quest-title">${escapeHtml(t.title)}</div>
              <div class="quest-meta">
                <span>${t.category || 'عام'}</span>
                <span>${t.completed_at ? formatTime(t.completed_at) : ''}</span>
              </div>
            </div>
            <div class="quest-reward" style="color:var(--success);">+10 XP ✓</div>
          </div>`;
      });
    }

    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = '<div class="empty-state"><p style="color:var(--danger);">حدث خطأ</p></div>';
  }
}

async function toggleTaskFromSystem(taskId) {
  try {
    const { error } = await supabaseClient
      .from('daily_tasks')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('id', taskId)
      .eq('user_id', systemUser.id);
    if (error) throw error;

    await addXp(systemUser.id, 10, 'daily_task', taskId, 'إكمال مهمة يومية');
    await incrementCompletedQuests(systemUser.id);
    await updateStreak(systemUser.id);
    systemProgress = await ensureUserProgress(systemUser.id);

    showXpToast(10, 'إكمال مهمة');
    await loadSystemPage();
  } catch (err) {
    showToast('حدث خطأ', 'error');
  }
}

async function renderActiveChallenges() {
  const container = document.getElementById('activeChallengesContainer');
  try {
    const { data: participations } = await supabaseClient
      .from('challenge_participants')
      .select('*, challenges(*)')
      .eq('user_id', systemUser.id);

    const active = (participations || []).filter(p =>
      p.challenges && p.challenges.status === 'active'
    );

    if (active.length === 0) {
      container.innerHTML = '<div class="empty-state"><p style="color:var(--text-muted);">لا توجد تحديات نشطة. اشترك في تحدي من صفحة التحديات</p></div>';
      return;
    }

    let html = '';
    active.forEach(p => {
      const c = p.challenges;
      html += `
        <div class="challenge-card" onclick="window.location.href='challenges.html'">
          <div class="challenge-card-image">
            <span>🏆</span>
            <span class="challenge-card-status active">نشط</span>
          </div>
          <div class="challenge-card-body">
            <div class="challenge-card-category">${c.category || 'عام'}</div>
            <div class="challenge-card-title">${escapeHtml(c.title)}</div>
            <div class="challenge-card-desc">${escapeHtml((c.description || '').substring(0, 100))}</div>
            <div class="challenge-card-progress">
              <div class="challenge-card-progress-header">
                <span>نقاطي: ${p.points || 0}</span>
                <span>${c.winners_count ? `أفضل ${c.winners_count}` : ''}</span>
              </div>
            </div>
          </div>
          <div class="challenge-card-footer">
            <div class="challenge-card-time">⏳ ${c.end_date ? formatDateShort(c.end_date) : ''}</div>
            <span class="quest-reward">+200 XP</span>
          </div>
        </div>`;
    });

    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = '<div class="empty-state"><p style="color:var(--danger);">حدث خطأ</p></div>';
  }
}

async function renderAchievements() {
  const container = document.getElementById('achievementsContainer');
  try {
    const { data: allAchievements } = await supabaseClient.from('achievements').select('*');
    const { data: earnedData } = await supabaseClient.from('user_achievements')
      .select('*, achievements(*)')
      .eq('user_id', systemUser.id);

    if (!allAchievements || allAchievements.length === 0) {
      container.innerHTML = '<div class="empty-state"><p style="color:var(--text-muted);">لا توجد إنجازات متاحة</p></div>';
      document.getElementById('achievementCount').textContent = '0/0';
      return;
    }

    const earnedIds = new Set((earnedData || []).map(e => e.achievement_id));
    document.getElementById('achievementCount').textContent = `${earnedIds.size}/${allAchievements.length}`;

    let html = '<div class="achievement-grid">';
    allAchievements.forEach(ach => {
      const earned = earnedIds.has(ach.id);
      const earnedInfo = earnedData?.find(e => e.achievement_id === ach.id);
      html += `
        <div class="achievement-card ${earned ? '' : 'locked'}">
          <div class="achievement-icon">${ach.icon || '🏅'}</div>
          <div class="achievement-info">
            <div class="achievement-name">${escapeHtml(ach.name)}</div>
            <div class="achievement-desc">${escapeHtml(ach.description || '')}</div>
            ${earned && earnedInfo ? `<div class="achievement-date">✅ ${formatDateShort(earnedInfo.earned_at)}</div>` : '<div class="achievement-date" style="color:var(--text-muted);">🔒 لم يتحقق بعد</div>'}
          </div>
        </div>`;
    });
    html += '</div>';

    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = '<div class="empty-state"><p style="color:var(--danger);">حدث خطأ</p></div>';
  }
}

function showXpToast(amount, source) {
  const existing = document.querySelector('.xp-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'xp-toast';
  toast.innerHTML = `
    <span class="xp-toast-icon">⚡</span>
    <div>
      <div class="xp-toast-text">+${amount} XP</div>
      <div class="xp-toast-desc">${source}</div>
    </div>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
}
