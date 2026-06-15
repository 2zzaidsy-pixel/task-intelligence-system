/* ===========================================
   Task Intelligence System - Dashboard Module
   =========================================== */

let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = await checkAuth();
  if (!currentUser) return;
  await loadDashboard();
});

async function loadDashboard() {
  try {
    const today = getTodayStr();

    const { data: tasks, error } = await supabaseClient
      .from('daily_tasks')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('due_date', today);

    if (error) throw error;

    const taskList = tasks || [];
    const total = taskList.length;
    const completed = taskList.filter(t => t.completed).length;
    const pending = total - completed;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Get or calculate productivity score (with full fallback)
    let prodScore = rate;
    try {
      const { data: stats } = await supabaseClient
        .from('productivity_stats')
        .select('productivity_score')
        .eq('user_id', currentUser.id)
        .eq('date', today)
        .maybeSingle();

      if (stats) {
        prodScore = stats.productivity_score;
      } else if (typeof calculateConsistency === 'function') {
        const consistency = await calculateConsistency(currentUser.id);
        prodScore = Math.round(rate * 0.5 + consistency * 0.5);
      }
    } catch (e) {
      prodScore = rate;
    }

    // Update stats cards (with null checks)
    const byId = (id) => document.getElementById(id);
    const setText = (id, val) => { const el = byId(id); if (el) el.textContent = val; };
    const setClass = (id, cls) => { const el = byId(id); if (el) el.className = cls; };

    setText('completedCount', completed);
    setText('pendingCount', pending);
    setText('completionRate', rate + '%');
    setClass('completionRate', getCompletionRateClass(rate));
    setText('productivityScore', prodScore);
    setClass('productivityScore', prodScore >= 70 ? 'stat-value text-success' : prodScore >= 40 ? 'stat-value text-warning' : 'stat-value text-danger');

    updateCircularProgress(rate);

    setText('summaryCompleted', completed);
    setText('summaryPending', pending);
    setText('summaryTotal', total);
    const bar = byId('summaryBar');
    if (bar) {
      bar.style.width = rate + '%';
      bar.className = 'progress-bar-fill ' + (rate >= 80 ? 'success' : rate >= 40 ? 'warning' : 'danger');
    }

    // Load XP/Level/Rank system data (separate try/catch so it never blocks dashboard)
    try {
      if (typeof ensureUserProgress === 'function') {
        await ensureUserProgress(currentUser.id);
      }
      await loadSystemStatus();
    } catch (e) {}

    // Load upcoming tasks (separate try/catch)
    try {
      await loadUpcomingTasks();
    } catch (e) {}

  } catch (err) {
    console.error('Dashboard error:', err);
    showToast('حدث خطأ في تحميل البيانات', 'error');
  }
}

async function loadSystemStatus() {
  try {
    if (typeof ensureUserProgress !== 'function') return;
    const progress = await ensureUserProgress(currentUser.id);
    if (!progress) return;
    const rankInfo = typeof getRankInfo === 'function' ? getRankInfo(progress.current_rank || 'E') : { icon: '🟢', title: '' };
    const level = progress.current_level || 1;
    const rank = progress.current_rank || 'E';
    const xp = progress.total_xp || 0;
    const streak = progress.streak_days || 0;

    const byId = (id) => document.getElementById(id);
    const setText = (id, val) => { const el = byId(id); if (el) el.textContent = val; };
    const setClass = (id, cls) => { const el = byId(id); if (el) el.className = cls; };

    setText('dashboardLevel', level);
    setText('dashboardRank', `${rankInfo.icon} ${rank}`);
    setClass('dashboardRank', `rank-${rank}`);
    setText('dashboardXp', `${xp} XP`);
    setText('dashboardStreak', `🔥 ${streak}`);
  } catch (e) {}
}

function updateCircularProgress(rate) {
  const circle = document.querySelector('.progress-circle');
  const percentEl = document.getElementById('circlePercent');
  if (!circle || !percentEl) return;

  const circumference = 2 * Math.PI * 48;
  const offset = circumference - (rate / 100) * circumference;
  circle.style.strokeDashoffset = offset;

  if (rate >= 80) circle.style.stroke = '#22c55e';
  else if (rate >= 60) circle.style.stroke = '#3b82f6';
  else if (rate >= 40) circle.style.stroke = '#f59e0b';
  else circle.style.stroke = '#ef4444';

  percentEl.textContent = rate + '%';
  percentEl.className = 'center-value ' + getCompletionRateClass(rate);
}

async function loadUpcomingTasks() {
  const container = document.getElementById('upcomingTasks');
  if (!container) return;

  try {
    const today = getTodayStr();
    const weekRange = getWeekRange();

    // Get today's pending tasks first
    const { data: todayTasks, error: todayErr } = await supabaseClient
      .from('daily_tasks')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('due_date', today)
      .eq('completed', false)
      .order('priority', { ascending: true })
      .limit(5);

    if (todayErr) throw todayErr;

    // Get tasks for upcoming days
    const { data: upcoming, error: upErr } = await supabaseClient
      .from('daily_tasks')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('completed', false)
      .gt('due_date', today)
      .lte('due_date', weekRange.end)
      .order('due_date', { ascending: true })
      .order('priority', { ascending: true })
      .limit(10);

    if (upErr) throw upErr;

    const allTasks = [...(todayTasks || []), ...(upcoming || [])];

    if (allTasks.length === 0) {
      showEmptyState(container, 'مبارك! 🎉', 'لا توجد مهام قادمة. لقد أنجزت كل شيء!');
      return;
    }

    let html = '<div class="task-list">';
    allTasks.forEach(task => {
      const priorityClass = getPriorityColor(task.priority);
      const isToday = task.due_date === today;
      const dateLabel = isToday ? 'اليوم' : formatDateShort(task.due_date);
      const categoryIcon = getCategoryIcon(task.category);
      html += `
        <div class="task-item priority-${priorityClass}">
          <div class="task-content">
            <div class="task-title">${escapeHtml(task.title)}</div>
            <div class="task-meta">
              <span class="badge badge-${priorityClass}">${getPriorityLabel(task.priority)}</span>
              <span>📅 ${dateLabel}</span>
              ${task.estimated_time ? `<span>⏱ ${task.estimated_time} د</span>` : ''}
              <span>${categoryIcon} ${task.category}</span>
            </div>
          </div>
          <div class="task-actions">
            <button class="btn btn-sm btn-primary" onclick="quickComplete('${task.id}')">✓ إكمال</button>
          </div>
        </div>
      `;
    });
    html += '</div>';
    container.innerHTML = html;

  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p class="empty-state-text" style="color:var(--danger);">حدث خطأ</p></div>`;
  }
}

async function quickComplete(id) {
  try {
    const now = new Date().toISOString();
    const { error } = await supabaseClient
      .from('daily_tasks')
      .update({ completed: true, completed_at: now })
      .eq('id', id);

    if (error) throw error;
    showToast('🎉 تم إكمال المهمة بنجاح!', 'success');

    // Award XP and create user_progress if needed
    if (typeof addXp === 'function') {
      try { await addXp(currentUser.id, 10, 'daily_task', id, 'إكمال مهمة'); } catch(e) {}
    }
    if (typeof incrementCompletedQuests === 'function') {
      try { await incrementCompletedQuests(currentUser.id); } catch(e) {}
    }
    if (typeof updateStreak === 'function') {
      try { await updateStreak(currentUser.id); } catch(e) {}
    }

    await loadDashboard();
  } catch (err) {
    showToast('حدث خطأ', 'error');
  }
}
