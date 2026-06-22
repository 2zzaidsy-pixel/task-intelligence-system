/* ===========================================
   Task Intelligence System - Challenges Module
   =========================================== */

let currentUser = null;
let currentProfile = null;
let challengesCache = [];
let challengeTimer = null;

document.addEventListener('DOMContentLoaded', async () => {
  const auth = await checkAuthWithRole();
  if (!auth) return;
  currentUser = auth.user;
  currentProfile = auth.profile;
  await updateChallengeStatuses();
  await loadChallenges();
});

async function loadChallenges() {
  try {
    const { data: challenges, error } = await supabaseClient
      .from('challenges')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    challengesCache = challenges || [];
    renderHeroChallenge();
    renderChallenges('active');
  } catch (err) {
    document.getElementById('challengesContainer').innerHTML =
      '<div class="empty-state"><p class="empty-state-text" style="color:var(--danger);">حدث خطأ في تحميل التحديات</p></div>';
  }
}

function renderHeroChallenge() {
  const hero = document.getElementById('challengeHero');
  const active = challengesCache.filter(c => c.status === 'active');
  if (active.length === 0) { hero.style.display = 'none'; return; }

  const challenge = active[0];
  hero.style.display = 'block';
  document.getElementById('heroTitle').textContent = challenge.title;
  document.getElementById('heroDesc').textContent = challenge.description || 'انضم إلى التحدي وابدأ رحلتك';
  document.getElementById('heroParticipants').textContent = challenge.current_participants || 0;
  document.getElementById('heroWinners').textContent = challenge.winners_count || 1;

  const endText = challenge.end_date ? formatDate(challenge.end_date) : '--';
  document.getElementById('heroEnd').textContent = endText;
  document.getElementById('heroBadge').textContent = '🔥 فعال الآن';
  document.getElementById('heroBadge').style.cssText = 'background:var(--success-light);color:var(--success);';

  const isFull = challenge.max_participants > 0 && challenge.current_participants >= challenge.max_participants;
  const remainingSeats = challenge.max_participants > 0 ? Math.max(0, challenge.max_participants - (challenge.current_participants || 0)) : '∞';
  const btn = document.getElementById('heroJoinBtn');
  const seatsEl = document.getElementById('heroSeats');
  if (seatsEl) {
    seatsEl.textContent = `${remainingSeats}`;
    seatsEl.className = remainingSeats <= 3 && remainingSeats !== '∞' ? 'text-danger' : '';
  }

  if (isFull) {
    btn.textContent = '🔴 اكتمل العدد';
    btn.disabled = false;
  } else {
    btn.textContent = '🔥 انضم الآن';
    btn.disabled = false;
  }
  btn.dataset.id = challenge.id;
}

async function renderChallenges(tab) {
  const container = document.getElementById('challengesContainer');
  showLoading(container);

  let filtered = challengesCache.filter(c => c.status === tab);
  if (tab === 'active') filtered = challengesCache.filter(c => c.status === 'active' || c.status === 'full');

  if (filtered.length === 0) {
    const msgs = {
      active: 'لا توجد تحديات نشطة حالياً',
      upcoming: 'لا توجد تحديات قادمة',
      completed: 'لا توجد تحديات منتهية'
    };
    showEmptyState(container, msgs[tab] || 'لا توجد تحديات', 'ترقبوا التحديات القادمة!');
    return;
  }

  let html = '<div class="challenge-grid">';
  for (const c of filtered) {
    const catIcon = getCategoryIcon_Ch(c.category);
    const statusColor = getChallengeStatusColor(c.status);
    const statusLabel = getChallengeStatusLabel(c.status);
    const participants = c.current_participants || 0;
    const max = c.max_participants || 100;
    const percent = max > 0 ? Math.min(100, Math.round((participants / max) * 100)) : 0;
    const remaining = c.end_date ? getTimeRemaining(c.end_date) : null;
    const isFull = c.status === 'full' || (max > 0 && participants >= max);
    const isJoined = await checkJoined(c.id);

    const remainingSeats = max > 0 ? max - participants : 0;
    const waitlistCount = 0; // could be fetched from challenge_waitlist

    html += `
      <div class="challenge-card" onclick="openChallengeDetail('${c.id}')">
        <div class="challenge-card-image" style="background:linear-gradient(135deg,#1e3a5f,#0f172a);">
          ${c.image_url ? `<img src="${escapeHtml(c.image_url)}" alt="${escapeHtml(c.title)}">` : catIcon}
          <span class="challenge-card-status ${statusColor ? 'active' : tab}">${statusLabel}</span>
        </div>
        <div class="challenge-card-body">
          <div class="challenge-card-category">${catIcon} ${c.category}</div>
          <h3 class="challenge-card-title">${escapeHtml(c.title)}</h3>
          <p class="challenge-card-desc">${escapeHtml(c.description || '')}</p>
          <div class="challenge-card-progress">
            <div class="challenge-card-progress-header">
              <span>${participants} / ${max} مشارك</span>
              <span>${percent}%</span>
            </div>
            <div class="challenge-card-progress-bar">
              <div class="challenge-card-progress-fill" style="width:${percent}%;${isFull ? 'background:var(--danger);' : ''}"></div>
            </div>
          </div>
          ${!isFull && !isJoined && remainingSeats > 0 ? `<div class="seats-remaining">المقاعد المتبقية: <strong>${remainingSeats}</strong></div>` : ''}
          ${isFull ? `<div class="waitlist-badge">⏳ قائمة انتظار</div>` : ''}
        </div>
        <div class="challenge-card-footer">
          <span class="challenge-card-time ${remaining && remaining.days <= 3 && !remaining.expired ? 'urgent' : ''}">
            ${remaining && !remaining.expired ? `⏱ ${remaining.days} يوم` : '✅ منتهي'}
          </span>
          ${!isJoined && tab !== 'completed'
            ? `<button class="btn btn-sm ${isFull ? 'btn-outline' : 'btn-primary'}" onclick="event.stopPropagation();joinChallenge('${c.id}')">${isFull ? '⏳ انتظار' : 'انضم'}</button>`
            : isJoined ? '<span class="badge badge-success">✅ منضم</span>' : ''}
        </div>
      </div>`;
  }
  html += '</div>';
  container.innerHTML = html;
}

function switchChallengeTab(tab, btn) {
  document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderChallenges(tab);
}

function scrollToChallenges() {
  document.querySelector('.tabs')?.scrollIntoView({ behavior: 'smooth' });
}

async function checkJoined(challengeId) {
  if (!currentUser) return false;
  try {
    const { data } = await supabaseClient
      .from('challenge_participants')
      .select('id')
      .eq('challenge_id', challengeId)
      .eq('user_id', currentUser.id)
      .maybeSingle();
    return !!data;
  } catch { return false; }
}

async function joinWaitlist(challengeId) {
  if (!currentUser) { showToast('يجب تسجيل الدخول أولاً', 'error'); return; }
  try {
    const { data: existing } = await supabaseClient
      .from('challenge_waitlist')
      .select('id')
      .eq('challenge_id', challengeId)
      .eq('user_id', currentUser.id)
      .maybeSingle();
    if (existing) { showToast('أنت في قائمة الانتظار بالفعل', 'warning'); return; }

    await supabaseClient.from('challenge_waitlist').insert({
      challenge_id: challengeId,
      user_id: currentUser.id
    });
    showToast('✅ تم الانضمام إلى قائمة الانتظار! سيتم إعلامك عند توفر مقعد', 'success');
    await loadChallenges();
  } catch (err) {
    showToast('حدث خطأ', 'error');
  }
}

async function joinChallenge(challengeId) {
  if (!currentUser) { showToast('يجب تسجيل الدخول أولاً', 'error'); return; }

  try {
    const { data: challenge } = await supabaseClient
      .from('challenges')
      .select('*')
      .eq('id', challengeId)
      .single();

    if (!challenge) { showToast('التحدي غير موجود', 'error'); return; }

    if (challenge.max_participants > 0 && challenge.current_participants >= challenge.max_participants) {
      const wantsWaitlist = confirm('⚠️ اكتمل العدد! هل تريد الانضمام إلى قائمة الانتظار؟');
      if (wantsWaitlist) {
        await joinWaitlist(challengeId);
      }
      await supabaseClient.from('challenges').update({ status: 'full' }).eq('id', challengeId);
      await loadChallenges();
      return;
    }

    const alreadyJoined = await checkJoined(challengeId);
    if (alreadyJoined) { showToast('أنت منضم بالفعل', 'warning'); return; }

    const { error } = await supabaseClient
      .from('challenge_participants')
      .insert({
        challenge_id: challengeId,
        user_id: currentUser.id,
        username: currentProfile?.username || currentUser.email.split('@')[0],
        email: currentUser.email
      });

    if (error) { showToast('حدث خطأ في الانضمام', 'error'); return; }

    const newCount = (challenge.current_participants || 0) + 1;
    const updates = { current_participants: newCount };
    if (challenge.max_participants > 0 && newCount >= challenge.max_participants) {
      updates.status = 'full';
    }
    await supabaseClient.from('challenges').update(updates).eq('id', challengeId);

    // XP reward for joining
    try {
      if (typeof addXp === 'function') {
        await addXp(currentUser.id, 50, 'join_challenge', challengeId, 'المشاركة في تحدي');
      }
    } catch (xpErr) {}

    await checkAndAwardBadges(currentUser.id);
    showToast('🎉 تم الانضمام إلى التحدي بنجاح! +50 XP', 'success');
    await loadChallenges();
  } catch (err) {
    showToast('حدث خطأ', 'error');
  }
}

async function heroJoinChallenge() {
  const btn = document.getElementById('heroJoinBtn');
  const id = btn?.dataset?.id;
  if (id) await joinChallenge(id);
}

// ===========================================
// CHALLENGE DETAIL MODAL
// ===========================================

async function openChallengeDetail(challengeId) {
  const modal = document.getElementById('challengeDetailModal');
  const body = document.getElementById('detailBody');
  openModal('challengeDetailModal');
  body.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  try {
    const { data: challenge } = await supabaseClient
      .from('challenges')
      .select('*')
      .eq('id', challengeId)
      .single();

    if (!challenge) { body.innerHTML = '<p class="empty-state-text">التحدي غير موجود</p>'; return; }

    const { data: participants } = await supabaseClient
      .from('challenge_participants')
      .select('*')
      .eq('challenge_id', challengeId)
      .order('points', { ascending: false });

    const { data: winners } = await supabaseClient
      .from('challenge_winners')
      .select('*')
      .eq('challenge_id', challengeId)
      .order('rank', { ascending: true });

    const isJoined = await checkJoined(challengeId);
    const catIcon = getCategoryIcon_Ch(challenge.category);
    const isFull = challenge.max_participants > 0 && challenge.current_participants >= challenge.max_participants;
    const remaining = challenge.end_date ? getTimeRemaining(challenge.end_date) : null;

    document.getElementById('detailTitle').textContent = challenge.title;

    let html = `
      <div class="challenge-detail-hero">
        <div class="challenge-detail-icon">${catIcon}</div>
        <h2 class="challenge-detail-title">${escapeHtml(challenge.title)}</h2>
        <div class="challenge-detail-meta">
          <div class="challenge-detail-meta-item">
            <div class="challenge-detail-meta-value">${challenge.current_participants || 0}</div>
            <div class="challenge-detail-meta-label">مشارك</div>
          </div>
          <div class="challenge-detail-meta-item">
            <div class="challenge-detail-meta-value">${challenge.winners_count || 1}</div>
            <div class="challenge-detail-meta-label">فائز</div>
          </div>
          <div class="challenge-detail-meta-item">
            <div class="challenge-detail-meta-value">${remaining && !remaining.expired ? remaining.days : 0}</div>
            <div class="challenge-detail-meta-label">يوم متبقي</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
          ${!isJoined && challenge.status !== 'completed' && challenge.status !== 'cancelled'
            ? `<button class="btn btn-primary btn-lg" onclick="joinChallengeDetail('${challenge.id}')" ${isFull ? 'disabled' : ''}>${isFull ? '🔴 اكتمل العدد' : '🔥 انضم الآن'}</button>`
            : isJoined ? '<span class="badge badge-success" style="padding:8px 20px;font-size:1rem;">✅ أنت منضم</span>' : ''}
          ${isJoined && challenge.status !== 'completed'
            ? `<button class="btn btn-warning btn-lg" onclick="openVerification('${challenge.id}')">📤 إرسال توثيق</button>`
            : ''}
        </div>
      </div>`;

    // Description
    if (challenge.description) {
      html += `<div class="card mb-16"><h4 style="margin-bottom:8px;">📝 الوصف</h4><p style="color:var(--text-secondary);font-size:0.9rem;">${escapeHtml(challenge.description)}</p></div>`;
    }

    // Requirements & Verification
    if (challenge.success_requirements) {
      html += `<div class="card mb-16"><h4 style="margin-bottom:8px;">✅ متطلبات النجاح</h4><p style="color:var(--text-secondary);font-size:0.9rem;">${escapeHtml(challenge.success_requirements)}</p></div>`;
    }
    if (challenge.verification_instructions) {
      html += `<div class="card mb-16"><h4 style="margin-bottom:8px;">📋 تعليمات التوثيق</h4><p style="color:var(--text-secondary);font-size:0.9rem;">${escapeHtml(challenge.verification_instructions)}</p></div>`;
    }
    if (challenge.rules) {
      html += `<div class="card mb-16"><h4 style="margin-bottom:8px;">⚖️ القوانين</h4><p style="color:var(--text-secondary);font-size:0.9rem;">${escapeHtml(challenge.rules)}</p></div>`;
    }

    // Leaderboard
    if (participants && participants.length > 0) {
      html += `<div class="card"><h4 style="margin-bottom:12px;">🏆 لوحة المتصدرين</h4><div class="leaderboard">`;
      participants.forEach((p, i) => {
        const rankClass = i === 0 ? 'top-1' : i === 1 ? 'top-2' : i === 2 ? 'top-3' : '';
        html += `
          <div class="leaderboard-item ${rankClass}">
            <div class="leaderboard-rank">${i + 1}</div>
            <div class="leaderboard-user">${escapeHtml(p.username || 'مستخدم')}</div>
            <div class="leaderboard-points">${p.points || 0} نقطة</div>
          </div>`;
      });
      html += `</div></div>`;
    } else {
      html += `<div class="card"><div class="empty-state"><p class="empty-state-text">لا يوجد مشاركون بعد</p></div></div>`;
    }

    // Winners
    if (winners && winners.length > 0) {
      html += `<div class="card mt-16"><h4 style="margin-bottom:12px;">🥇 الفائزون</h4><div class="leaderboard">`;
      winners.forEach(w => {
        html += `
          <div class="leaderboard-item top-1">
            <div class="leaderboard-rank">${w.rank}</div>
            <div class="leaderboard-user">${escapeHtml(w.user_id)}</div>
            <div class="leaderboard-points">${w.points || 0} نقطة</div>
          </div>`;
      });
      html += `</div></div>`;
    }

    body.innerHTML = html;
  } catch (err) {
    body.innerHTML = '<p class="empty-state-text" style="color:var(--danger);">حدث خطأ</p>';
  }
}

async function joinChallengeDetail(challengeId) {
  closeModal('challengeDetailModal');
  await joinChallenge(challengeId);
}

// ===========================================
// VERIFICATION SYSTEM (Telegram)
// ===========================================

function openVerification(challengeId) {
  const challenge = challengesCache.find(c => c.id === challengeId);
  if (!challenge) return;
  document.getElementById('verifyChallengeId').value = challengeId;
  document.getElementById('verifyChallengeName').value = challenge.title;
  document.getElementById('verifyTelegram').value = currentProfile?.username || '';
  document.getElementById('verifyEmail').value = currentUser?.email || '';
  document.getElementById('verifyDay').value = 1;
  document.getElementById('verifyDesc').value = '';
  updateTelegramPreview();
  openModal('verificationModal');
}

function updateTelegramPreview() {
  const username = document.getElementById('verifyTelegram').value || '@username';
  const email = document.getElementById('verifyEmail').value || 'email@gmail.com';
  const challenge = document.getElementById('verifyChallengeName').value || 'Challenge';
  const day = document.getElementById('verifyDay').value || '1';
  const desc = document.getElementById('verifyDesc').value || 'Description...';

  const preview = `
Username: ${username}
Email: ${email}
Challenge: ${challenge}
Day: ${day}
Description: ${desc}
  `.trim();

  document.getElementById('telegramPreview').textContent = preview;
}

// Live update preview
document.addEventListener('input', function(e) {
  const previewEl = document.getElementById('telegramPreview');
  if (previewEl && (e.target.id === 'verifyTelegram' || e.target.id === 'verifyEmail' ||
      e.target.id === 'verifyDay' || e.target.id === 'verifyDesc')) {
    updateTelegramPreview();
  }
});

async function submitVerification(e) {
  e.preventDefault();
  const challengeId = document.getElementById('verifyChallengeId').value;
  const telegram = document.getElementById('verifyTelegram').value.trim();
  const email = document.getElementById('verifyEmail').value.trim();
  const day = parseInt(document.getElementById('verifyDay').value);
  const desc = document.getElementById('verifyDesc').value.trim();

  if (!telegram || !email || !desc) {
    showToast('يرجى ملء جميع الحقول', 'warning');
    return;
  }

  const btn = document.getElementById('verifySubmitBtn');
  btn.disabled = true;
  btn.textContent = 'جاري...';

  try {
    const message = `Username: ${telegram}\nEmail: ${email}\nChallenge: ${document.getElementById('verifyChallengeName').value}\nDay: ${day}\nDescription: ${desc}`;

    // Save submission to DB
    await supabaseClient.from('challenge_submissions').insert({
      challenge_id: challengeId,
      user_id: currentUser.id,
      day_number: day,
      description: desc,
      telegram_username: telegram,
      google_email: email,
      status: 'pending'
    });

    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(message);
      showToast('✅ تم نسخ الرسالة! الصقها في Telegram مع إرفاق الإثبات', 'success');
    } catch {
      showToast('✅ تم إرسال التوثيق! انسخ الرسالة وأرسلها في Telegram', 'success');
    }

    closeModal('verificationModal');

    // Try to open Telegram
    const encoded = encodeURIComponent(message);
    const tgApp = `tg://msg?text=${encoded}`;
    const tgWeb = `https://t.me/share/url?url=${encoded}&text=${encoded}`;
    const tgWindow = window.open(tgApp, '_blank');
    setTimeout(() => {
      if (!tgWindow || tgWindow.closed) window.open(tgWeb, '_blank');
    }, 500);
  } catch (err) {
    showToast('حدث خطأ في إرسال التوثيق', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'فتح Telegram';
  }
}
