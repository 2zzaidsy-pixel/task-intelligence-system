/* ===========================================
   Task Intelligence System - Analytics Module
   Charts, Scores, Suggestions
   =========================================== */

let currentUser = null;
let chartInstances = {};

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = await checkAuth();
  if (!currentUser) return;
  await loadAnalytics();
});

async function loadAnalytics() {
  try {
    await Promise.all([
      loadProductivityScore(),
      loadCompletionRates(),
      loadDailyChart(),
      loadCategoryChart(),
      loadWeeklyChart(),
      loadMonthlyChart(),
      loadSuggestions()
    ]);
  } catch (err) {
    showToast('حدث خطأ في تحميل التحليلات', 'error');
  }
}

// ===========================================
// PRODUCTIVITY SCORE
// ===========================================

async function loadProductivityScore() {
  try {
    const today = getTodayStr();
    const weekRange = getWeekRange();
    const monthRange = getMonthRange();

    // Get today's stats
    const { data: todayStats } = await supabaseClient
      .from('productivity_stats')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('date', today)
      .maybeSingle();

    // Get weekly data for consistency
    const { data: weekData } = await supabaseClient
      .from('daily_tasks')
      .select('due_date, completed')
      .eq('user_id', currentUser.id)
      .gte('due_date', weekRange.start)
      .lte('due_date', weekRange.end);

    // Get monthly data
    const { data: monthData } = await supabaseClient
      .from('daily_tasks')
      .select('due_date, completed')
      .eq('user_id', currentUser.id)
      .gte('due_date', monthRange.start)
      .lte('due_date', monthRange.end);

    // Calculate commitment (today's completion)
    const weekTasks = weekData || [];
    const monthTasks = monthData || [];
    const todayTasks = weekTasks.filter(t => t.due_date === today);
    const todayTotal = todayTasks.length;
    const todayCompleted = todayTasks.filter(t => t.completed).length;
    const commitment = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;

    // Calculate completion (weekly average)
    const daysWithTasks = {};
    weekTasks.forEach(t => {
      if (!daysWithTasks[t.due_date]) daysWithTasks[t.due_date] = { total: 0, completed: 0 };
      daysWithTasks[t.due_date].total++;
      if (t.completed) daysWithTasks[t.due_date].completed++;
    });
    const dayValues = Object.values(daysWithTasks);
    const completion = dayValues.length > 0
      ? Math.round(dayValues.reduce((s, d) => s + (d.completed / d.total * 100), 0) / dayValues.length)
      : 0;

    // Calculate consistency (monthly trend)
    const monthDays = {};
    monthTasks.forEach(t => {
      if (!monthDays[t.due_date]) monthDays[t.due_date] = { total: 0, completed: 0 };
      monthDays[t.due_date].total++;
      if (t.completed) monthDays[t.due_date].completed++;
    });
    const monthValues = Object.values(monthDays);
    const consistency = monthValues.length > 0
      ? Math.round(monthValues.reduce((s, d) => s + (d.completed / d.total * 100), 0) / monthValues.length)
      : 0;

    // Overall score
    let score;
    if (todayStats && todayStats.productivity_score > 0) {
      score = todayStats.productivity_score;
    } else {
      score = Math.round(commitment * 0.4 + completion * 0.35 + consistency * 0.25);
    }

    // Update UI
    const scoreEl = document.getElementById('prodScoreValue');
    const circle = document.querySelector('.score-circle .progress');
    if (scoreEl) scoreEl.textContent = score;
    if (circle) {
      const circumference = 2 * Math.PI * 65;
      const offset = circumference - (score / 100) * circumference;
      circle.style.strokeDashoffset = offset;
      if (score >= 80) circle.style.stroke = '#22c55e';
      else if (score >= 60) circle.style.stroke = '#3b82f6';
      else if (score >= 40) circle.style.stroke = '#f59e0b';
      else circle.style.stroke = '#ef4444';
    }

    document.getElementById('detailCommitment').textContent = commitment + '%';
    document.getElementById('detailCompletion').textContent = completion + '%';
    document.getElementById('detailConsistency').textContent = consistency + '%';

  } catch (err) {
    console.error('Productivity score error:', err);
  }
}

// ===========================================
// COMPLETION RATES
// ===========================================

async function loadCompletionRates() {
  try {
    const today = getTodayStr();
    const weekRange = getWeekRange();
    const monthRange = getMonthRange();

    // Daily rate
    const { data: todayTasks } = await supabaseClient
      .from('daily_tasks')
      .select('completed')
      .eq('user_id', currentUser.id)
      .eq('due_date', today);

    const todayTotal = todayTasks ? todayTasks.length : 0;
    const todayDone = todayTasks ? todayTasks.filter(t => t.completed).length : 0;
    const dailyRate = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;

    // Weekly rate
    const { data: weekTasks } = await supabaseClient
      .from('daily_tasks')
      .select('completed')
      .eq('user_id', currentUser.id)
      .gte('due_date', weekRange.start)
      .lte('due_date', weekRange.end);

    const weekTotal = weekTasks ? weekTasks.length : 0;
    const weekDone = weekTasks ? weekTasks.filter(t => t.completed).length : 0;
    const weeklyRate = weekTotal > 0 ? Math.round((weekDone / weekTotal) * 100) : 0;

    // Monthly rate
    const { data: monthTasks } = await supabaseClient
      .from('daily_tasks')
      .select('completed')
      .eq('user_id', currentUser.id)
      .gte('due_date', monthRange.start)
      .lte('due_date', monthRange.end);

    const monthTotal = monthTasks ? monthTasks.length : 0;
    const monthDone = monthTasks ? monthTasks.filter(t => t.completed).length : 0;
    const monthlyRate = monthTotal > 0 ? Math.round((monthDone / monthTotal) * 100) : 0;

    // Update UI
    document.getElementById('dailyRateLabel').textContent = dailyRate + '%';
    document.getElementById('dailyRateBar').style.width = dailyRate + '%';
    document.getElementById('dailyRateBar').className = 'progress-bar-fill ' + (dailyRate >= 80 ? 'success' : dailyRate >= 40 ? 'warning' : 'danger');

    document.getElementById('weeklyRateLabel').textContent = weeklyRate + '%';
    document.getElementById('weeklyRateBar').style.width = weeklyRate + '%';
    document.getElementById('weeklyRateBar').className = 'progress-bar-fill ' + (weeklyRate >= 80 ? 'success' : weeklyRate >= 40 ? 'warning' : 'danger');

    document.getElementById('monthlyRateLabel').textContent = monthlyRate + '%';
    document.getElementById('monthlyRateBar').style.width = monthlyRate + '%';
    document.getElementById('monthlyRateBar').className = 'progress-bar-fill ' + (monthlyRate >= 80 ? 'success' : monthlyRate >= 40 ? 'warning' : 'danger');

  } catch (err) {
    console.error('Completion rates error:', err);
  }
}

// ===========================================
// CHARTS
// ===========================================

async function getLast7Days() {
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

async function getLast4Weeks() {
  const weeks = [];
  const now = new Date();
  for (let i = 3; i >= 0; i--) {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay() - i * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    weeks.push({
      label: `${start.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}`,
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    });
  }
  return weeks;
}

async function getLast6Months() {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    months.push({
      label: d.toLocaleDateString('ar-SA', { month: 'long' }),
      start: d.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    });
  }
  return months;
}

async function loadDailyChart() {
  const canvas = document.getElementById('dailyChart');
  if (!canvas) return;

  if (chartInstances.daily) chartInstances.daily.destroy();

  try {
    const dates = await getLast7Days();
    const dayLabels = dates.map(d => formatDateShort(d));
    const completed = [];
    const total = [];

    for (const date of dates) {
      const { data: tasks } = await supabaseClient
        .from('daily_tasks')
        .select('completed')
        .eq('user_id', currentUser.id)
        .eq('due_date', date);

      const t = tasks || [];
      total.push(t.length);
      completed.push(t.filter(x => x.completed).length);
    }

    chartInstances.daily = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: dayLabels,
        datasets: [
          {
            label: 'مكتمل',
            data: completed,
            backgroundColor: '#22c55e',
            borderRadius: 6
          },
          {
            label: 'إجمالي',
            data: total,
            backgroundColor: '#3b82f6',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#94a3b8', font: { family: 'Segoe UI' } }
          }
        },
        scales: {
          x: {
            ticks: { color: '#64748b' },
            grid: { color: '#1e293b' }
          },
          y: {
            beginAtZero: true,
            ticks: { color: '#64748b', stepSize: 1 },
            grid: { color: '#1e293b' }
          }
        }
      }
    });
  } catch (err) {
    console.error('Daily chart error:', err);
  }
}

async function loadCategoryChart() {
  const canvas = document.getElementById('categoryChart');
  if (!canvas) return;

  if (chartInstances.category) chartInstances.category.destroy();

  try {
    const monthRange = getMonthRange();
    const { data: tasks } = await supabaseClient
      .from('daily_tasks')
      .select('category, completed')
      .eq('user_id', currentUser.id)
      .gte('due_date', monthRange.start)
      .lte('due_date', monthRange.end);

    const allTasks = tasks || [];
    const categories = {};
    allTasks.forEach(t => {
      if (!categories[t.category]) categories[t.category] = { total: 0, completed: 0 };
      categories[t.category].total++;
      if (t.completed) categories[t.category].completed++;
    });

    const labels = Object.keys(categories);
    const data = labels.map(l => categories[l].completed);
    const colors = ['#3b82f6', '#f59e0b', '#22c55e', '#8b5cf6', '#ef4444'];

    chartInstances.category = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: '#0f172a',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#94a3b8', font: { family: 'Segoe UI' }, padding: 12 }
          }
        }
      }
    });
  } catch (err) {
    console.error('Category chart error:', err);
  }
}

async function loadWeeklyChart() {
  const canvas = document.getElementById('weeklyChart');
  if (!canvas) return;

  if (chartInstances.weekly) chartInstances.weekly.destroy();

  try {
    const weeks = await getLast4Weeks();
    const completed = [];
    const total = [];

    for (const week of weeks) {
      const { data: tasks } = await supabaseClient
        .from('daily_tasks')
        .select('completed')
        .eq('user_id', currentUser.id)
        .gte('due_date', week.start)
        .lte('due_date', week.end);

      const t = tasks || [];
      total.push(t.length);
      completed.push(t.filter(x => x.completed).length);
    }

    chartInstances.weekly = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: weeks.map(w => w.label),
        datasets: [{
          label: 'المهام المنجزة',
          data: completed,
          backgroundColor: '#22c55e',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#94a3b8', font: { family: 'Segoe UI' } }
          }
        },
        scales: {
          x: {
            ticks: { color: '#64748b' },
            grid: { color: '#1e293b' }
          },
          y: {
            beginAtZero: true,
            ticks: { color: '#64748b', stepSize: 1 },
            grid: { color: '#1e293b' }
          }
        }
      }
    });
  } catch (err) {
    console.error('Weekly chart error:', err);
  }
}

async function loadMonthlyChart() {
  const canvas = document.getElementById('monthlyChart');
  if (!canvas) return;

  if (chartInstances.monthly) chartInstances.monthly.destroy();

  try {
    const months = await getLast6Months();
    const completed = [];
    const total = [];

    for (const month of months) {
      const { data: tasks } = await supabaseClient
        .from('daily_tasks')
        .select('completed')
        .eq('user_id', currentUser.id)
        .gte('due_date', month.start)
        .lte('due_date', month.end);

      const t = tasks || [];
      total.push(t.length);
      completed.push(t.filter(x => x.completed).length);
    }

    chartInstances.monthly = new Chart(canvas, {
      type: 'line',
      data: {
        labels: months.map(m => m.label),
        datasets: [
          {
            label: 'مكتمل',
            data: completed,
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#22c55e'
          },
          {
            label: 'إجمالي',
            data: total,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#3b82f6'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#94a3b8', font: { family: 'Segoe UI' } }
          }
        },
        scales: {
          x: {
            ticks: { color: '#64748b' },
            grid: { color: '#1e293b' }
          },
          y: {
            beginAtZero: true,
            ticks: { color: '#64748b', stepSize: 1 },
            grid: { color: '#1e293b' }
          }
        }
      }
    });
  } catch (err) {
    console.error('Monthly chart error:', err);
  }
}

// ===========================================
// SMART SUGGESTIONS
// ===========================================

async function loadSuggestions() {
  const container = document.getElementById('suggestionsContainer');
  if (!container) return;

  try {
    const today = getTodayStr();
    const weekRange = getWeekRange();

    const { data: todayTasks } = await supabaseClient
      .from('daily_tasks')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('due_date', today);

    const { data: weekTasks } = await supabaseClient
      .from('daily_tasks')
      .select('*')
      .eq('user_id', currentUser.id)
      .gte('due_date', weekRange.start)
      .lte('due_date', weekRange.end);

    const allTasks = weekTasks || [];
    const dayTasks = todayTasks || [];

    const suggestions = [];

    // 1. Priority suggestion - focus on high priority incomplete tasks
    const highPriorityIncomplete = dayTasks.filter(t => t.priority === 1 && !t.completed);
    if (highPriorityIncomplete.length > 0) {
      suggestions.push({
        icon: '🎯',
        title: 'ركز على المهام عالية الأولوية',
        text: `لديك ${highPriorityIncomplete.length} مهام عالية الأولوية لم تكتمل بعد. أنجزها أولاً لتحقيق أقصى إنتاجية.`
      });
    }

    // 2. Completion suggestion
    const completed = dayTasks.filter(t => t.completed).length;
    const total = dayTasks.length;
    if (total > 0) {
      const rate = Math.round((completed / total) * 100);
      if (rate < 50) {
        suggestions.push({
          icon: '💪',
          title: 'حسّن نسبة إنجازك',
          text: `نسبة إنجازك اليوم ${rate}%. حاول التركيز على المهام القصيرة أولاً لرفع النسبة.`
        });
      } else if (rate >= 80) {
        suggestions.push({
          icon: '🌟',
          title: 'أداء ممتاز!',
          text: `نسبة إنجازك ${rate}% اليوم. استمر بهذا المستوى الرائع!`
        });
      }
    }

    // 3. Time management suggestion
    const pendingTasks = dayTasks.filter(t => !t.completed);
    const totalTime = pendingTasks.reduce((sum, t) => sum + (t.estimated_time || 30), 0);
    if (pendingTasks.length > 0 && totalTime > 120) {
      suggestions.push({
        icon: '⏰',
        title: 'إدارة الوقت',
        text: `المهام المتبقية تحتاج تقريباً ${totalTime} دقيقة. قسم وقتك ولا تنس أخذ استراحة قصيرة بين المهام.`
      });
    }

    // 4. Category variety suggestion
    const categories = [...new Set(dayTasks.map(t => t.category))];
    if (categories.length < 2 && dayTasks.length >= 3) {
      suggestions.push({
        icon: '⚖️',
        title: 'نوّع مهامك',
        text: 'يبدو أن مهامك تتركز في تصنيف واحد. حاول توزيع مهامك على تصنيفات مختلفة لتحقيق توازن أفضل.'
      });
    }

    // 5. Early start suggestion
    if (dayTasks.filter(t => !t.completed).length > 3) {
      suggestions.push({
        icon: '🌅',
        title: 'البدء المبكر',
        text: 'لديك عدة مهام متبقية. في الغد، حاول البدء بالمهام الأصعب في الصباح لتحقيق إنتاجية أعلى.'
      });
    }

    // 6. Positive streak
    if (completed >= 5) {
      suggestions.push({
        icon: '🔥',
        title: 'استمرارية رائعة',
        text: `أكملت ${completed} مهام اليوم! حافظ على هذا المستوى لبناء سلسلة إنتاجية قوية.`
      });
    }

    if (suggestions.length === 0) {
      if (dayTasks.length === 0) {
        suggestions.push({
          icon: '📝',
          title: 'ابدأ بإضافة المهام',
          text: 'لم تقم بإضافة أي مهام لليوم. ابدأ بتحديد مهامك لتحقيق أقصى استفادة من يومك.'
        });
      } else {
        suggestions.push({
          icon: '🎉',
          title: 'أحسنت!',
          text: 'أنت على المسار الصحيح. استمر في العمل الجيد وحافظ على تنظيم مهامك.'
        });
      }
    }

    // Sort suggestions: put positive ones after improvement ones
    const prioritySuggestions = suggestions.filter(s => s.icon === '🎯' || s.icon === '💪' || s.icon === '⏰');
    const otherSuggestions = suggestions.filter(s => !prioritySuggestions.includes(s));
    const sorted = [...prioritySuggestions, ...otherSuggestions];

    let html = '';
    sorted.forEach(s => {
      html += `
        <div class="suggestion-card animate-fade-in">
          <div class="suggestion-icon">${s.icon}</div>
          <div class="suggestion-content">
            <div class="suggestion-title">${s.title}</div>
            <div class="suggestion-text">${s.text}</div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p class="empty-state-text" style="color:var(--danger);">حدث خطأ في تحميل الاقتراحات</p></div>`;
  }
}
