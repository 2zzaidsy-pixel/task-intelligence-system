/* ===========================================
   Task Intelligence System - App Utilities
   Shared across all pages
   =========================================== */

const CACHE_KEY = 'tis_cache';
const DAYS_MAP = {
  sunday: 'الأحد', monday: 'الإثنين', tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء', thursday: 'الخميس', friday: 'الجمعة', saturday: 'السبت'
};
const DAYS_ARABIC_SHORT = { ح: 'sunday', ن: 'monday', ث: 'tuesday', ر: 'wednesday', خ: 'thursday', ج: 'friday', س: 'saturday' };

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

// Toast notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `${icons[type] || ''} ${message}`;
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

function showEmptyState(container, title, text) {
  if (!container) return;
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">📭</div>
      <h3 class="empty-state-title">${title || 'لا توجد مهام'}</h3>
      <p class="empty-state-text">${text || 'لم تقم بإضافة أي مهام بعد. ابدأ بإضافة مهامك الآن!'}</p>
    </div>
  `;
}

// Sidebar
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (!sidebar) return;
  sidebar.classList.toggle('open');
  if (overlay) overlay.classList.toggle('show');
}

function toggleUserDropdown() {
  const dd = document.getElementById('userDropdown');
  if (dd) dd.classList.toggle('show');
}

// Close dropdown on outside click
document.addEventListener('click', function(e) {
  const dd = document.getElementById('userDropdown');
  const avatar = document.querySelector('.user-avatar');
  if (dd && avatar && !avatar.contains(e.target)) {
    dd.classList.remove('show');
  }
});

// Logout
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

// Tab switching
function switchTab(tabName, btn) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const tab = document.getElementById('tab' + tabName.charAt(0).toUpperCase() + tabName.slice(1));
  if (tab) tab.classList.add('active');
}

// Utility
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Recurring task: generate today's instances
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
