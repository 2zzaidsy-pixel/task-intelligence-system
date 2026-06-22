/* ===========================================
   THE SYSTEM - App Utilities
   Shared across all pages
   =========================================== */

const CACHE_KEY = 'tis_cache';
const DAYS_MAP = {
  sunday: 'الأحد', monday: 'الإثنين', tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء', thursday: 'الخميس', friday: 'الجمعة', saturday: 'السبت'
};

function getCached(key) {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    return cache[key] || null;
  } catch { return null; }
}

function setCache(key, data) {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    cache[key] = { data, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

function clearCache() {
  localStorage.removeItem(CACHE_KEY);
}

function formatDate(date) {
  const d = new Date(date);
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return d.toLocaleDateString('ar-SA', options);
}

function formatDateShort(date) {
  const d = new Date(date);
  return d.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
}

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

function getTodayDay() {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
}

function getWeekRange() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - dayOfWeek);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
}

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
}

function getPriorityLabel(p) {
  const map = { 1: 'عالية', 2: 'متوسطة', 3: 'منخفضة' };
  return map[p] || 'متوسطة';
}

function getPriorityColor(p) {
  const map = { 1: 'danger', 2: 'warning', 3: 'success' };
  return map[p] || 'warning';
}

function getCategoryColor(cat) {
  const map = {
    'دراسة': 'primary', 'عمل': 'warning', 'صحة': 'success',
    'تطوير ذاتي': 'primary', 'شخصي': 'warning'
  };
  return map[cat] || 'primary';
}

function getCategoryIcon(cat) {
  const map = {
    'دراسة': '📚', 'عمل': '💼', 'صحة': '🏃',
    'تطوير ذاتي': '🌱', 'شخصي': '🧑'
  };
  return map[cat] || '📌';
}

function getCompletionRateClass(rate) {
  if (rate >= 80) return 'rate-excellent';
  if (rate >= 60) return 'rate-good';
  if (rate >= 40) return 'rate-average';
  return 'rate-poor';
}

function getProgressColor(rate) {
  if (rate >= 80) return 'success';
  if (rate >= 60) return '';
  if (rate >= 40) return 'warning';
  return 'danger';
}

// XSS-Safe Toast notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: '' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const iconSpan = document.createElement('span');
  iconSpan.textContent = icons[type] || '';
  const msgSpan = document.createElement('span');
  msgSpan.textContent = message;
  toast.appendChild(iconSpan);
  toast.appendChild(msgSpan);
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Loading state
function showLoading(container) {
  if (!container) return;
  container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
}

// XSS-Safe empty state
function showEmptyState(container, title, text) {
  if (!container) return;
  const safeTitle = escapeHtml(title || 'لا توجد مهام');
  const safeText = escapeHtml(text || 'لم تقم بإضافة أي مهام بعد. ابدأ بإضافة مهامك الآن!');
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">📭</div>
      <h3 class="empty-state-title">${safeTitle}</h3>
      <p class="empty-state-text">${safeText}</p>
    </div>
  `;
}

// Bottom Navigation
function initBottomNav() {
  const navItems = document.querySelectorAll('.bottom-nav-item');
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';

  navItems.forEach(item => {
    const href = item.getAttribute('href');
    if (href === currentPath) {
      item.classList.add('active');
    }
    item.addEventListener('click', function(e) {
      navItems.forEach(n => n.classList.remove('active'));
      this.classList.add('active');
    });
  });
}

// User dropdown
function toggleDropdown(e) {
  e.stopPropagation();
  const dd = document.getElementById('userDropdown');
  if (dd) {
    dd.classList.toggle('show');
    const rect = e.currentTarget.getBoundingClientRect();
    dd.style.top = (rect.bottom + 4) + 'px';
    dd.style.left = '0';
  }
}

document.addEventListener('click', function(e) {
  const dd = document.getElementById('userDropdown');
  const avatar = document.querySelector('.user-avatar');
  if (dd && avatar && !avatar.contains(e.target) && !dd.contains(e.target)) {
    dd.classList.remove('show');
  }
});

async function handleLogout() {
  try {
    await supabaseClient.auth.signOut();
    clearCache();
    window.location.href = 'login.html';
  } catch (err) {
    showToast('حدث خطأ أثناء تسجيل الخروج', 'error');
  }
}

// Auth check - called on every page except login
async function checkAuth() {
  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error || !session) {
      window.location.href = 'login.html';
      return null;
    }
    const user = session.user;
    const avatar = document.getElementById('avatarLetter');
    const emailEl = document.getElementById('userEmail');
    if (avatar) avatar.textContent = user.email.charAt(0).toUpperCase();
    if (emailEl) emailEl.textContent = user.email;
    const dateEl = document.getElementById('currentDate');
    if (dateEl) dateEl.textContent = formatDate(new Date());

    // Check profile for admin nav visibility
    try {
      const { data: prof } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      if (prof?.role === 'admin') showAdminNav();
    } catch {}

    // Auto-create user_progress record on every page load
    try {
      if (typeof ensureUserProgress === 'function') {
        await ensureUserProgress(user.id);
      }
    } catch (e) {}

    // Init bottom nav active state
    initBottomNav();

    // Show admin nav item for admin users
    try {
      const { data: prof } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      if (prof?.role === 'admin') {
        showAdminNav();
        // Add admin item to bottom nav if not admin page
        const bottomNavInner = document.querySelector('.bottom-nav-inner');
        if (bottomNavInner && !document.querySelector('.bottom-nav-item[data-page="admin"]')) {
          const adminItem = document.createElement('a');
          adminItem.href = 'admin.html';
          adminItem.className = 'bottom-nav-item';
          adminItem.dataset.page = 'admin';
          adminItem.innerHTML = '<span class="bnav-icon">⚙️</span><span class="bnav-label">المشرف</span>';
          adminItem.addEventListener('click', function(e) {
            document.querySelectorAll('.bottom-nav-item').forEach(n => n.classList.remove('active'));
            this.classList.add('active');
          });
          bottomNavInner.appendChild(adminItem);
          // Re-check active state
          const currentPath = window.location.pathname.split('/').pop() || 'index.html';
          if (adminItem.getAttribute('href') === currentPath) {
            adminItem.classList.add('active');
          }
        }
      }
    } catch (e) {}

    return user;
  } catch (err) {
    window.location.href = 'login.html';
    return null;
  }
}

// Modal helpers
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('show');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('show');
}

function switchTab(tabName, btn) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const tab = document.getElementById('tab' + tabName.charAt(0).toUpperCase() + tabName.slice(1));
  if (tab) tab.classList.add('active');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Consistency calculation for productivity score
async function calculateConsistency(userId) {
  try {
    const weekRange = getWeekRange();
    let query = supabaseClient
      .from('daily_tasks')
      .select('due_date, completed')
      .gte('due_date', weekRange.start)
      .lte('due_date', weekRange.end);
    if (userId) query = query.eq('user_id', userId);
    const { data: weekTasks, error } = await query;
    if (error) throw error;
    if (!weekTasks || weekTasks.length === 0) return 0;
    const daysWithTasks = {};
    weekTasks.forEach(t => {
      if (!daysWithTasks[t.due_date]) daysWithTasks[t.due_date] = { total: 0, completed: 0 };
      daysWithTasks[t.due_date].total++;
      if (t.completed) daysWithTasks[t.due_date].completed++;
    });
    const days = Object.values(daysWithTasks);
    if (days.length === 0) return 0;
    const avgRate = days.reduce((sum, d) => sum + (d.completed / d.total * 100), 0) / days.length;
    return Math.round(avgRate);
  } catch (err) {
    return 0;
  }
}

// Generate today's recurring tasks
async function generateRecurringForToday() {
  try {
    const user = await checkAuth();
    if (!user) return;
    const today = getTodayDay();
    const { data: tasks, error } = await supabaseClient
      .from('recurring_tasks')
      .select('*')
      .eq('user_id', user.id);
    if (error) return;
    const todayStr = getTodayStr();
    for (const task of tasks) {
      if (task.days && task.days.includes(today)) {
        const { data: existing } = await supabaseClient
          .from('daily_tasks')
          .select('id')
          .eq('user_id', user.id)
          .eq('title', task.title)
          .eq('due_date', todayStr)
          .maybeSingle();
        if (!existing) {
          await supabaseClient.from('daily_tasks').insert({
            user_id: user.id,
            title: task.title,
            description: task.description || '',
            priority: task.priority,
            category: 'شخصي',
            due_date: todayStr,
            estimated_time: 30,
            completed: false
          });
        }
      }
    }
  } catch (err) {}
}

// ===========================================
// PROFILES & ROLES
// ===========================================

async function getProfile(userId) {
  try {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) return null;
    return data;
  } catch { return null; }
}

async function ensureProfile(user) {
  try {
    let profile = await getProfile(user.id);
    if (!profile) {
      const { data, error } = await supabaseClient
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          username: user.email.split('@')[0],
          role: 'user'
        })
        .select()
        .single();
      if (error) throw error;
      profile = data;
    }
    return profile;
  } catch (err) {
    return null;
  }
}

async function isAdmin(userId) {
  const profile = await getProfile(userId);
  return profile?.role === 'admin';
}

function showAdminNav() {
  const section = document.getElementById('adminNav');
  if (section) section.style.display = 'block';
  const section2 = document.getElementById('adminNavSection');
  if (section2) section2.style.display = 'block';
}

// ===========================================
// CHALLENGES HELPERS
// ===========================================

function getCategoryIcon_Ch(cat) {
  const map = {
    'Fitness': '🏃', 'Reading': '📚', 'Study': '📖',
    'Programming': '💻', 'Languages': '🌐',
    'Self Development': '🌱', 'Business': '💼',
    'Quran Memorization': '📿'
  };
  return map[cat] || '🏆';
}

function getChallengeStatusColor(status) {
  const map = { active: 'success', upcoming: 'primary', completed: '', full: 'danger', cancelled: 'danger' };
  return map[status] || '';
}

function getChallengeStatusLabel(status) {
  const map = {
    active: '🔥 نشط', upcoming: '📅 قادم', completed: '✅ منتهي',
    full: '🔴 مكتمل', cancelled: '❌ ملغي'
  };
  return map[status] || status;
}

function getTimeRemaining(endDate) {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end - now;
  if (diff <= 0) return { days: 0, hours: 0, mins: 0, expired: true };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { days, hours, mins, expired: false };
}

// ===========================================
// BADGE AUTO-AWARDING
// ===========================================

async function awardBadgeIfNotOwned(userId, badgeName) {
  try {
    const { data: badge } = await supabaseClient
      .from('badges')
      .select('id')
      .eq('name', badgeName)
      .maybeSingle();
    if (!badge) return;
    const { data: existing } = await supabaseClient
      .from('user_badges')
      .select('id')
      .eq('user_id', userId)
      .eq('badge_id', badge.id)
      .maybeSingle();
    if (existing) return;
    await supabaseClient.from('user_badges').insert({ user_id: userId, badge_id: badge.id });
  } catch {}
}

async function checkAndAwardBadges(userId) {
  try {
    const { data: participantCount, count: pCount } = await supabaseClient
      .from('challenge_participants')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    if (pCount && pCount > 0) {
      await awardBadgeIfNotOwned(userId, 'First Challenge');
    }
    const { data: wins, count: wCount } = await supabaseClient
      .from('challenge_winners')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    if (wCount && wCount > 0) {
      await awardBadgeIfNotOwned(userId, 'Challenge Winner');
    }
    const { data: topPerf } = await supabaseClient
      .from('challenge_participants')
      .select('points')
      .eq('user_id', userId)
      .gte('points', 50)
      .limit(1);
    if (topPerf && topPerf.length > 0) {
      await awardBadgeIfNotOwned(userId, 'Top Performer');
    }
    const { data: weekChamp } = await supabaseClient
      .from('challenge_winners')
      .select('id')
      .eq('user_id', userId)
      .eq('rank', 1)
      .limit(1);
    if (weekChamp && weekChamp.length > 0) {
      await awardBadgeIfNotOwned(userId, 'Weekly Champion');
      await awardBadgeIfNotOwned(userId, 'Monthly Champion');
    }
  } catch {}
}

// ===========================================
// AUTO-UPDATE CHALLENGE STATUSES
// ===========================================

async function updateChallengeStatuses() {
  try {
    const today = getTodayStr();
    const { data: challenges } = await supabaseClient
      .from('challenges')
      .select('id, status, start_date, end_date, current_participants, max_participants');

    if (!challenges) return;

    for (const c of challenges) {
      let newStatus = c.status;

      if (c.status === 'upcoming' && c.start_date && c.start_date <= today) {
        newStatus = 'active';
      }
      if ((c.status === 'active' || c.status === 'upcoming') && c.end_date && c.end_date < today) {
        newStatus = 'completed';
      }
      if (c.status !== 'full' && c.status !== 'completed' && c.status !== 'cancelled' &&
          c.max_participants > 0 && c.current_participants >= c.max_participants) {
        newStatus = 'full';
      }
      if (c.status === 'full' && c.current_participants < c.max_participants && c.end_date && c.end_date >= today && c.start_date && c.start_date <= today) {
        newStatus = 'active';
      }

      if (newStatus !== c.status) {
        await supabaseClient.from('challenges').update({ status: newStatus }).eq('id', c.id);
      }
    }
  } catch (err) {}
}

// ===========================================
// ENHANCED AUTH CHECK (with role)
// ===========================================

async function checkAuthWithRole() {
  const user = await checkAuth();
  if (!user) return null;
  const profile = await ensureProfile(user);
  if (profile?.role === 'admin') showAdminNav();
  return { user, profile };
}

// ===========================================
// AUTO-IMPORT XP SYSTEM (lazy)
// ===========================================
if (!window.addXp) {
  window.loadXpSystem = async function() {
    try {
      if (!document.querySelector('script[src*="xp-system"]')) {
        await import('./xp-system.js');
      }
    } catch (e) {
      // xp-system loaded separately when needed
    }
  };
}
