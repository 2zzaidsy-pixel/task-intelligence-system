/* ===========================================
   THE SYSTEM - Profile Module
   =========================================== */

let currentUser = null;
let currentProfile = null;

document.addEventListener('DOMContentLoaded', async () => {
  const auth = await checkAuthWithRole();
  if (!auth) return;
  currentUser = auth.user;
  currentProfile = auth.profile;
  await checkAndAwardBadges(currentUser.id);
  await loadProfile();
  await loadBadges();
});

async function loadProfile() {
  const container = document.getElementById('profileContent');
  showLoading(container);

  try {
    const { data: allParticipants } = await supabaseClient
      .from('challenge_participants')
      .select('*')
      .eq('user_id', currentUser.id);

    const { data: allSubmissions } = await supabaseClient
      .from('challenge_submissions')
      .select('*')
      .eq('user_id', currentUser.id);

    const { data: allBadges } = await supabaseClient
      .from('user_badges')
      .select('*, badges(*)')
      .eq('user_id', currentUser.id);

    const challengesCount = allParticipants?.length || 0;
    const submissionsCount = allSubmissions?.length || 0;
    const approvedCount = allSubmissions?.filter(s => s.status === 'approved').length || 0;
    const totalPoints = allParticipants?.reduce((sum, p) => sum + (p.points || 0), 0) || 0;
    const badgesCount = allBadges?.length || 0;
    const roleLabel = currentProfile?.role === 'admin' ? 'مدير' : 'مستخدم';

    const avatarLetter = (currentProfile?.username || currentUser.email).charAt(0).toUpperCase();

    // Get XP progress
    let xpHtml = '';
    if (typeof ensureUserProgress === 'function') {
      const progress = await ensureUserProgress(currentUser.id);
      const rankInfo = getRankInfo(progress.current_rank || 'E');
      const { xpInLevel, xpForNext } = calculateLevel(progress.total_xp || 0);
      const percent = xpForNext > 0 ? Math.min(100, Math.round((xpInLevel / xpForNext) * 100)) : 0;

      xpHtml = `
        <div class="card mb-16">
          <div style="display:flex;align-items:center;gap:16px;">
            <div class="level-badge level-badge-lg">${progress.current_level || 1}</div>
            <div style="flex:1;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <span class="rank-badge rank-${progress.current_rank}"><span>${rankInfo.icon} ${progress.current_rank} Rank</span></span>
                  <span style="font-size:0.8rem;color:var(--text-muted);margin-right:8px;">${rankInfo.title}</span>
                </div>
                <div style="font-size:0.85rem;color:var(--warning);font-weight:600;">${progress.total_xp || 0} XP</div>
              </div>
              <div class="xp-bar-wrapper mt-8">
                <div class="xp-bar-fill" style="width:${percent}%;"></div>
              </div>
              <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;">
                المستوى ${progress.current_level || 1} • ${xpInLevel} / ${xpForNext} XP
              </div>
            </div>
          </div>
        </div>`;
    }

    container.innerHTML = `
      <div class="profile-header-card">
        <div class="profile-avatar">${avatarLetter}</div>
        <div class="profile-info">
          <h2 class="profile-name">${escapeHtml(currentProfile?.username || 'مستخدم')}</h2>
          <div class="profile-email">${escapeHtml(currentUser.email)}</div>
          <span class="profile-role-badge ${currentProfile?.role}">
            ${currentProfile?.role === 'admin' ? '⚙️' : '👤'} ${roleLabel}
          </span>
        </div>
      </div>

      ${xpHtml}

      <div class="profile-stats">
        <div class="profile-stat">
          <div class="profile-stat-value" style="color:var(--primary);">${challengesCount}</div>
          <div class="profile-stat-label">التحديات</div>
        </div>
        <div class="profile-stat">
          <div class="profile-stat-value" style="color:var(--success);">${approvedCount}</div>
          <div class="profile-stat-label">تم إكمالها</div>
        </div>
        <div class="profile-stat">
          <div class="profile-stat-value" style="color:var(--warning);">${submissionsCount}</div>
          <div class="profile-stat-label">إجمالي التوثيقات</div>
        </div>
        <div class="profile-stat">
          <div class="profile-stat-value" style="color:var(--primary);">${totalPoints}</div>
          <div class="profile-stat-label">إجمالي النقاط</div>
        </div>
        <div class="profile-stat">
          <div class="profile-stat-value">${badgesCount}</div>
          <div class="profile-stat-label">الأوسمة</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">🏅 الأوسمة</h3>
        </div>
        <div id="badgesGrid" class="badges-grid">
          <div class="loading"><div class="spinner"></div></div>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = '<div class="empty-state"><p style="color:var(--danger);">حدث خطأ في تحميل الملف الشخصي</p></div>';
  }
}

async function loadBadges() {
  const container = document.getElementById('badgesGrid');
  if (!container) return;

  try {
    const { data: allBadges } = await supabaseClient.from('badges').select('*').order('category');
    const { data: earnedBadges } = await supabaseClient
      .from('user_badges')
      .select('badge_id')
      .eq('user_id', currentUser.id);

    const earnedIds = new Set((earnedBadges || []).map(b => b.badge_id));
    const badges = allBadges || [];

    if (badges.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:20px;">لا توجد أوسمة متاحة</p>';
      return;
    }

    let html = '';
    badges.forEach(badge => {
      const earned = earnedIds.has(badge.id);
      const rarity = badge.rarity || 'common';
      const rarityColors = { common: '', rare: 'rarity-border rare', epic: 'rarity-border epic', legendary: 'rarity-border legendary', mythic: 'rarity-border mythic' };
      html += `
        <div class="badge-item ${earned ? '' : 'locked'} ${earned ? rarityColors[rarity] || '' : ''}">
          <span class="badge-icon">${badge.icon || '🏅'}</span>
          <div class="badge-name">${escapeHtml(badge.name)}</div>
          <div class="badge-desc">${escapeHtml(badge.description || '')}</div>
          ${rarity !== 'common' ? `<div class="badge-rarity ${rarity}">${rarity}</div>` : ''}
          ${earned ? '<div style="font-size:0.6rem;color:var(--success);margin-top:4px;">✅ مكتسب</div>' : '<div style="font-size:0.6rem;color:var(--text-muted);margin-top:4px;">🔒 مقفل</div>'}
        </div>`;
    });

    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = '<p style="color:var(--danger);">حدث خطأ</p>';
  }
}
