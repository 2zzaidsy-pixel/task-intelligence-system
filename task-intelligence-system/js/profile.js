/* ===========================================
   THE SYSTEM - Profile Module
   =========================================== */

let currentUser = null;
let currentProfile = null;

const RANK_DEFINITIONS = [
  {
    rank: 'E', icon: '🟢', title: 'مبتدئ', color: '#22c55e',
    description: 'بداية الرحلة. كل عظيم بدأ من هنا.',
    requirements: { xp: 0, tasksCompleted: 0, streakDays: 0 },
    rewards: ['فتح لوحة المهام', 'لقب "مبتدئ"'],
    motivation: 'كل رحلة تبدأ بخطوة. أنت الآن في البداية، والعالم مليء بالفرص.'
  },
  {
    rank: 'D', icon: '🔵', title: 'متدرب', color: '#3b82f6',
    description: 'بدأت تتعلم أساسيات النظام. الاستمرارية هي المفتاح.',
    requirements: { xp: 500, tasksCompleted: 20, streakDays: 7 },
    rewards: ['فتح قسم التحديات', 'شارة "متدرب"'],
    motivation: 'الانضباط هو الجسر بين الأهداف والإنجازات. استمر في البناء.'
  },
  {
    rank: 'C', icon: '🟣', title: 'محارب', color: '#a855f7',
    description: 'أثبت أنك قادر على المواجهة. الآن تبدأ المعركة الحقيقية.',
    requirements: { xp: 1500, tasksCompleted: 50, streakDays: 14 },
    rewards: ['فتح التحليلات', 'شريط إنجاز متقدم'],
    motivation: 'المحارب الحقيقي لا يستسلم. كل مهمة تكملها تقربك من القمة.'
  },
  {
    rank: 'B', icon: '🟡', title: 'فارس', color: '#f59e0b',
    description: 'أصبحت فارساً في النظام. مهاراتك بدأت تتبلور.',
    requirements: { xp: 4000, tasksCompleted: 100, streakDays: 21 },
    rewards: ['شارة "فارس"', 'مضاعف XP أسبوعي'],
    motivation: 'الفارس لا يركض خلف أهدافه، بل يواجهها. أنت في منتصف الرحلة، والأفضل لم يأت بعد.'
  },
  {
    rank: 'A', icon: '🔴', title: 'نخبة', color: '#ef4444',
    description: 'أنت ضمن النخبة. القلة القليلة تصل إلى هنا.',
    requirements: { xp: 10000, tasksCompleted: 200, streakDays: 30 },
    rewards: ['شعار "نخبة"', 'تحديات حصرية', 'ظهور في لوحة الشرف'],
    motivation: 'النخبة لا تتنافس مع الآخرين، بل تتحدى نفسها. كل يوم فرصة لتكون أفضل.'
  },
  {
    rank: 'S', icon: '💎', title: 'أسطورة', color: '#06b6d4',
    description: 'أسطورة حية. قصتك تلهم الآخرين.',
    requirements: { xp: 25000, tasksCompleted: 350, streakDays: 45 },
    rewards: ['لقب "أسطورة"', 'رمز S متألق', 'مضاعف XP ×2'],
    motivation: 'الأساطير لا تولد، بل تُصنع عبر آلاف الساعات من العمل الجاد. أنت الآن جزء من التاريخ.'
  },
  {
    rank: 'SS', icon: '👑', title: 'ملك', color: '#f97316',
    description: 'أنت ملك في مملكتك. القليل من يصل إلى هذا المستوى.',
    requirements: { xp: 50000, tasksCompleted: 500, streakDays: 60 },
    rewards: ['تاج ملكي 🫅', 'رتبة خاصة في التحديات', 'الوصول إلى النظام المتقدم'],
    motivation: 'الملك الحقيقي لا يحكم الآخرين، بل يحكم نفسه. أنت الآن قدوة.'
  },
  {
    rank: 'SSS', icon: '🌌', title: 'إمبراطور', color: '#8b5cf6',
    description: 'إمبراطور لا يُقهَر. حدودك الوحيدة هي السماء.',
    requirements: { xp: 75000, tasksCompleted: 750, streakDays: 75 },
    rewards: ['تاج إمبراطوري', 'شارة "أسطورة حية"', 'الوصول لمجلس القادة'],
    motivation: 'الإمبراطور يرى ما لا يراه الآخرون. أنت تتجاوز الحدود التي يعتقد الناس أنها مستحيلة.'
  },
  {
    rank: 'National', icon: '🌍', title: 'وطني', color: 'linear-gradient(90deg, #f59e0b, #ef4444, #a855f7)',
    description: 'أنت تمثل الأمة. إنجازك يتجاوز الفرد.',
    requirements: { xp: 100000, tasksCompleted: 1000, streakDays: 90 },
    rewards: ['تاج وطني', 'ظهور وطني', 'لقب "بطل الأمة"'],
    motivation: 'الأبطال الوطنيون لا يُصنعون بين ليلة وضحاها. أنت الآن مصدر إلهام لأمة بأكملها.'
  },
  {
    rank: 'Monarch', icon: '👁️', title: 'سيّد', color: '#f59e0b',
    description: 'القمة. لا يوجد أعلى من هذا. أنت السيّد المطلق.',
    requirements: { xp: 200000, tasksCompleted: 2000, streakDays: 100 },
    rewards: ['تاج السيادة المطلقة', 'خلود في سجل الشرف', 'جميع الميزات مفتوحة'],
    motivation: 'السيّد المطلق لا يبحث عن القوة، لأنه أصبح القوة نفسها. أنت الآن في ذروة الرحلة.'
  }
];

const RANK_ORDER = RANK_DEFINITIONS.map(r => r.rank);

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

    let xpHtml = '';
    if (typeof ensureUserProgress === 'function') {
      const progress = await ensureUserProgress(currentUser.id);
      const rankInfo = getRankInfo(progress.current_rank || 'E');
      const { xpInLevel, xpForNext } = calculateLevel(progress.total_xp || 0);
      const percent = xpForNext > 0 ? Math.min(100, Math.round((xpInLevel / xpForNext) * 100)) : 0;

      xpHtml = `
        <div class="card mb-16 profile-level-card" onclick="openRoadmap()">
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

/* ===========================================
   PROGRESSION ROADMAP
   =========================================== */

function getOrdinalSuffix(num) {
  if (num === 0) return 'الأول';
  if (num === 1) return 'الثاني';
  if (num === 2) return 'الثالث';
  return 'ال' + (num + 1);
}

async function openRoadmap() {
  const overlay = document.getElementById('roadmapOverlay');
  if (!overlay) return;

  try {
    let progress = { total_xp: 0, current_level: 1, current_rank: 'E', streak_days: 0, completed_quests: 0, completed_challenges: 0 };
    if (typeof ensureUserProgress === 'function') {
      progress = await ensureUserProgress(currentUser.id);
    }

    const body = document.getElementById('roadmapBody');
    let html = '';

    // Next Rank Preview
    const currentRankIndex = RANK_ORDER.indexOf(progress.current_rank);
    const nextRank = currentRankIndex < RANK_DEFINITIONS.length - 1 ? RANK_DEFINITIONS[currentRankIndex + 1] : null;

    if (nextRank) {
      const req = nextRank.requirements;
      const xpProgress = Math.min(req.xp, progress.total_xp || 0);
      const xpPercent = req.xp > 0 ? Math.round((xpProgress / req.xp) * 100) : 0;
      const tasksPercent = req.tasksCompleted > 0 ? Math.min(100, Math.round(((progress.completed_quests || 0) / req.tasksCompleted) * 100)) : 100;
      const streakPercent = req.streakDays > 0 ? Math.min(100, Math.round(((progress.streak_days || 0) / req.streakDays) * 100)) : 100;

      html += `
        <div class="next-rank-card">
          <div class="next-rank-header">
            <div>
              <div class="next-rank-label">الرتبة القادمة</div>
              <div class="next-rank-name" style="color:${nextRank.color}">${nextRank.icon} ${nextRank.rank} Rank — ${nextRank.title}</div>
            </div>
            <div style="text-align:left;">
              <div style="font-size:0.75rem;color:var(--text-muted);">المتبقي</div>
              <div style="font-size:1.1rem;font-weight:700;">${Math.max(0, req.xp - (progress.total_xp || 0)).toLocaleString()} XP</div>
            </div>
          </div>
          <div class="next-rank-progress">
            <div style="display:flex;justify-content:space-between;font-size:0.7rem;color:var(--text-muted);margin-bottom:4px;">
              <span>التقدم</span>
              <span>${(progress.total_xp || 0).toLocaleString()} / ${req.xp.toLocaleString()} XP</span>
            </div>
            <div class="xp-bar-wrapper">
              <div class="xp-bar-fill" style="width:${xpPercent}%;background:linear-gradient(90deg,var(--primary),${nextRank.color});"></div>
            </div>
          </div>
          <div class="next-rank-stats">
            <div class="next-rank-stat">
              <div class="next-rank-stat-value" style="color:${xpPercent >= 100 ? 'var(--success)' : 'var(--text-primary)'};">${Math.min(req.xp, progress.total_xp || 0).toLocaleString()}</div>
              <div class="next-rank-stat-label">XP</div>
            </div>
            <div class="next-rank-stat">
              <div class="next-rank-stat-value" style="color:${tasksPercent >= 100 ? 'var(--success)' : 'var(--text-primary)'};">${progress.completed_quests || 0}</div>
              <div class="next-rank-stat-label">المهام</div>
            </div>
            <div class="next-rank-stat">
              <div class="next-rank-stat-value" style="color:${streakPercent >= 100 ? 'var(--success)' : 'var(--text-primary)'};">${progress.streak_days || 0}</div>
              <div class="next-rank-stat-label">الاستمرارية</div>
            </div>
          </div>
        </div>`;
    }

    // Timeline
    html += `<div class="roadmap-timeline">`;
    RANK_DEFINITIONS.forEach((rankDef, i) => {
      const isCompleted = i < currentRankIndex;
      const isCurrent = i === currentRankIndex;
      const isLocked = i > currentRankIndex;
      const statusClass = isCompleted ? 'completed' : isCurrent ? 'current' : 'locked';
      const rankLevel = i + 1;

      const requirements = rankDef.requirements;
      const xpMet = (progress.total_xp || 0) >= requirements.xp;
      const tasksMet = (progress.completed_quests || 0) >= requirements.tasksCompleted;
      const streakMet = (progress.streak_days || 0) >= requirements.streakDays;

      const allMet = i === 0 || (xpMet && tasksMet && streakMet);
      const showMet = i > 0; // hide reqs for E rank since it's auto

      const rankStyle = rankDef.rank === 'National'
        ? `style="background:${rankDef.color};-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-weight:700;"`
        : `style="color:${rankDef.color};font-weight:700;"`;

      const nodeStyle = rankDef.rank === 'National'
        ? `style="background:linear-gradient(135deg,${rankDef.color.replace('90deg','135deg')});border:none;"`
        : `style="border-color:${rankDef.color};color:${rankDef.color};"`;

      html += `
        <div class="roadmap-node ${statusClass}">
          <div class="roadmap-node-icon" ${nodeStyle}>
            ${isLocked ? '🔒' : rankDef.icon}
          </div>
          <div class="node-line"></div>
          <div class="roadmap-node-content">
            <div class="roadmap-node-header">
              <div>
                <div class="roadmap-node-rank" ${rankStyle}>${rankDef.rank} Rank</div>
                <div class="roadmap-node-title">${rankDef.title}</div>
              </div>
              ${isCurrent ? '<div class="roadmap-node-status-tag current">🌟 الرتبة الحالية</div>' : ''}
              ${isCompleted ? '<div class="roadmap-node-status-tag completed">✅ مكتمل</div>' : ''}
              ${isLocked ? '<div class="roadmap-node-status-tag locked">🔒 مقفل</div>' : ''}
            </div>

            <div class="roadmap-node-desc">${rankDef.description}</div>

            ${showMet ? `
            <div class="roadmap-reqs">
              <span class="roadmap-req ${xpMet ? 'met' : ''}">${xpMet ? '✅' : ''} ${requirements.xp.toLocaleString()} XP</span>
              <span class="roadmap-req ${tasksMet ? 'met' : ''}">${tasksMet ? '✅' : ''} ${requirements.tasksCompleted} مهمة</span>
              <span class="roadmap-req ${streakMet ? 'met' : ''}">${streakMet ? '✅' : ''} ${requirements.streakDays} يوم استمرارية</span>
            </div>` : ''}

            <div class="roadmap-rewards">
              ${rankDef.rewards.map(r => `<span class="roadmap-reward-tag">🎁 ${r}</span>`).join('')}
            </div>

            <div class="roadmap-motivation">${rankDef.motivation}</div>
          </div>
        </div>`;
    });
    html += `</div>`;

    // Rank Info Section
    html += `
      <div class="rank-info-section">
        <button class="rank-info-toggle" onclick="toggleRankInfo(this)">
          <span>📖 دليل الرتب والتطور</span>
          <span class="toggle-icon">▼</span>
        </button>
        <div class="rank-info-body">
          <div class="rank-info-item">
            <h4>⚡ ما هو XP؟</h4>
            <p>XP (نقاط الخبرة) هي عملة التطور في النظام. كلما أنجزت مهاماً وشاركت في تحديات، تربح XP يرفع مستواك ورتبتك.</p>
          </div>
          <div class="rank-info-item">
            <h4>📊 كيف يتم احتساب XP؟</h4>
            <p>كل مهمة يومية تمنحك <strong>+10 XP</strong>، والمهام المتكررة <strong>+15 XP</strong>. المشاركة في تحدي تمنح <strong>+50 XP</strong>، وإكماله <strong>+200 XP</strong>. استمرارية 7 أيام تمنح مكافأة <strong>+100 XP</strong>.</p>
          </div>
          <div class="rank-info-item">
            <h4>⬆️ كيف تتم الترقية؟</h4>
            <p>الترقية تعتمد على <strong>إجمالي XP</strong> ومستواك. كلما جمعت XP كافياً ووصلت للمستوى المطلوب، تترقى رتبتك تلقائياً. مثال: رتبة D تتطلب 500 XP ومستوى 5.</p>
          </div>
          <div class="rank-info-item">
            <h4>📋 كيف تؤثر المهام اليومية؟</h4>
            <p>المهام اليومية هي المصدر الرئيسي لـ XP. إكمال مهمة يومية يمنح +10 XP ويساهم في استمراريتك. الاستمرارية تمنح مكافآت إضافية عند 7 و 30 يوماً.</p>
          </div>
          <div class="rank-info-item">
            <h4>🏆 كيف تؤثر التحديات؟</h4>
            <p>التحديات تمنح XP أعلى من المهام العادية. المشاركة تمنح +50 XP، وإكمال التحدي يمنح +200 XP مع نقاط إضافية في لوحة المتصدرين.</p>
          </div>
          <div class="rank-info-item">
            <h4>🎖️ كيف تؤثر الإنجازات والأوسمة؟</h4>
            <p>الإنجازات تُفتح تلقائياً عند تحقيق متطلبات معينة (عدد مهام، XP، استمرارية، رتبة). الأوسمة لها ندرة مختلفة (عادي → نادر → ملحمي → أسطوري → أسطوري خرافي).</p>
          </div>
        </div>
      </div>`;

    // Estimated Progress
    const paceXpPerDay = 100;
    if (nextRank) {
      const xpNeeded = Math.max(0, nextRank.requirements.xp - (progress.total_xp || 0));
      const estimatedDays = paceXpPerDay > 0 ? Math.ceil(xpNeeded / paceXpPerDay) : '—';

      html += `
        <div class="estimated-card">
          <div class="estimated-icon-wrap">⏳</div>
          <div class="estimated-content">
            <div class="estimated-title">بمعدلك الحالي، الوقت المتوقع للرتبة القادمة</div>
            <div class="estimated-value">${typeof estimatedDays === 'number' ? `~ ${estimatedDays} يوم` : '—'}</div>
            <div class="estimated-sub">بمعدل ${paceXpPerDay} XP في اليوم • ${xpNeeded.toLocaleString()} XP متبقية</div>
          </div>
        </div>`;
    }

    body.innerHTML = html;
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  } catch (err) {
    showToast('حدث خطأ في تحميل مسار التطور', 'error');
  }
}

function closeRoadmap() {
  const overlay = document.getElementById('roadmapOverlay');
  if (!overlay) return;
  overlay.classList.remove('show');
  document.body.style.overflow = '';
}

function toggleRankInfo(btn) {
  btn.classList.toggle('open');
  const body = btn.nextElementSibling;
  if (body) body.classList.toggle('open');
}

// Close on overlay click
document.addEventListener('click', function(e) {
  const overlay = document.getElementById('roadmapOverlay');
  if (overlay && overlay.classList.contains('show') && e.target === overlay) {
    closeRoadmap();
  }
});

// Close on Escape
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeRoadmap();
});
