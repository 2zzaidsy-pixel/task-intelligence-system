/* ===========================================
   Task Intelligence System - Admin Module
   =========================================== */

let currentUser = null;
let currentProfile = null;

document.addEventListener('DOMContentLoaded', async () => {
  const auth = await checkAuthWithRole();
  if (!auth) return;
  currentUser = auth.user;
  currentProfile = auth.profile;

  if (currentProfile?.role !== 'admin') {
    window.location.href = 'index.html';
    showToast('ليس لديك صلاحية الوصول', 'error');
    return;
  }

  // Set dates
  const today = getTodayStr();
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  document.getElementById('challengeStart').value = today;
  document.getElementById('challengeEnd').value = nextWeek.toISOString().split('T')[0];

  await updateChallengeStatuses();
  await loadAdminDashboard();
  await loadAdminChallenges();
  await loadAdminParticipants();
  await loadAdminSubmissions('pending');
  await loadAdminResults();
});

// ===========================================
// TAB SWITCHING
// ===========================================

function switchAdminTab(tab, btn) {
  document.querySelectorAll('.admin-nav-item').forEach(i => i.classList.remove('active'));
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const section = document.getElementById('admin' + tab.charAt(0).toUpperCase() + tab.slice(1));
  if (section) section.classList.add('active');
}

// ===========================================
// DASHBOARD
// ===========================================

async function loadAdminDashboard() {
  const container = document.getElementById('adminStats');
  try {
    const { data: challenges } = await supabaseClient.from('challenges').select('*');
    const { data: participants } = await supabaseClient.from('challenge_participants').select('*');
    const { data: submissions } = await supabaseClient.from('challenge_submissions').select('*');
    const { data: users } = await supabaseClient.from('profiles').select('*');

    const totalChallenges = challenges?.length || 0;
    const activeChallenges = challenges?.filter(c => c.status === 'active').length || 0;
    const totalParticipants = participants?.length || 0;
    const pendingSubmissions = submissions?.filter(s => s.status === 'pending').length || 0;
    const totalUsers = users?.length || 0;

    container.innerHTML = `
      <div class="admin-stat"><div class="admin-stat-value">${totalChallenges}</div><div class="admin-stat-label">إجمالي التحديات</div></div>
      <div class="admin-stat"><div class="admin-stat-value" style="color:var(--success);">${activeChallenges}</div><div class="admin-stat-label">تحديات نشطة</div></div>
      <div class="admin-stat"><div class="admin-stat-value">${totalParticipants}</div><div class="admin-stat-label">إجمالي المشاركين</div></div>
      <div class="admin-stat"><div class="admin-stat-value" style="color:var(--warning);">${pendingSubmissions}</div><div class="admin-stat-label">توثيقات معلقة</div></div>
      <div class="admin-stat"><div class="admin-stat-value">${totalUsers}</div><div class="admin-stat-label">المستخدمين</div></div>
    `;
  } catch (err) {
    container.innerHTML = '<p style="color:var(--danger);">حدث خطأ</p>';
  }
}

// ===========================================
// CHALLENGES CRUD
// ===========================================

async function loadAdminChallenges() {
  const container = document.getElementById('adminChallengesList');
  showLoading(container);
  try {
    const { data: challenges } = await supabaseClient
      .from('challenges')
      .select('*')
      .order('created_at', { ascending: false });

    if (!challenges || challenges.length === 0) {
      showEmptyState(container, 'لا توجد تحديات', 'قم بإنشاء أول تحد الآن');
      return;
    }

    let html = '<div class="task-list">';
    challenges.forEach(c => {
      const statusLabel = getChallengeStatusLabel(c.status);
      const statusColor = getChallengeStatusColor(c.status);
      html += `
        <div class="task-item">
          <div class="task-content">
            <div class="task-title">${escapeHtml(c.title)}</div>
            <div class="task-meta">
              <span class="badge badge-${statusColor || 'primary'}">${statusLabel}</span>
              <span>${c.current_participants || 0}/${c.max_participants || 100} مشارك</span>
              <span>${c.category || 'عام'}</span>
            </div>
          </div>
          <div class="task-actions">
            <button class="btn btn-sm btn-outline" onclick="editChallenge('${c.id}')">✏️</button>
            <button class="btn btn-sm btn-outline" onclick="toggleChallengeRegistration('${c.id}')">${c.registration_open ? '🔒 إغلاق' : '🔓 فتح'}</button>
            <button class="btn btn-sm btn-danger-ghost" onclick="deleteChallenge('${c.id}')">🗑️</button>
          </div>
        </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = '<p style="color:var(--danger);">حدث خطأ</p>';
  }
}

function showCreateChallenge() {
  document.getElementById('challengeFormTitle').textContent = 'إنشاء تحدي جديد';
  document.getElementById('challengeForm').reset();
  document.getElementById('challengeEditId').value = '';
  const today = getTodayStr();
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  document.getElementById('challengeStart').value = today;
  document.getElementById('challengeEnd').value = nextWeek.toISOString().split('T')[0];
  switchAdminTab('challengeForm', null);
}

function hideChallengeForm() {
  switchAdminTab('challenges', document.querySelectorAll('.admin-nav-item')[1]);
}

async function editChallenge(id) {
  try {
    const { data: c } = await supabaseClient.from('challenges').select('*').eq('id', id).single();
    if (!c) { showToast('التحدي غير موجود', 'error'); return; }

    document.getElementById('challengeFormTitle').textContent = 'تعديل التحدي';
    document.getElementById('challengeEditId').value = c.id;
    document.getElementById('challengeTitle').value = c.title;
    document.getElementById('challengeDesc').value = c.description || '';
    document.getElementById('challengeImage').value = c.image_url || '';
    document.getElementById('challengeCategory').value = c.category || 'Fitness';
    document.getElementById('challengeStart').value = c.start_date || '';
    document.getElementById('challengeEnd').value = c.end_date || '';
    document.getElementById('challengeWinners').value = c.winners_count || 1;
    document.getElementById('challengeMax').value = c.max_participants || 100;
    document.getElementById('challengeRequirements').value = c.success_requirements || '';
    document.getElementById('challengeVerification').value = c.verification_instructions || '';
    document.getElementById('challengeRules').value = c.rules || '';

    switchAdminTab('challengeForm', document.querySelectorAll('.admin-nav-item')[1]);
  } catch (err) {
    showToast('حدث خطأ', 'error');
  }
}

async function saveChallenge(e) {
  e.preventDefault();
  const id = document.getElementById('challengeEditId').value;
  const title = document.getElementById('challengeTitle').value.trim();
  if (!title) { showToast('يرجى إدخال عنوان التحدي', 'warning'); return; }

  const data = {
    title,
    description: document.getElementById('challengeDesc').value.trim(),
    image_url: document.getElementById('challengeImage').value.trim() || null,
    category: document.getElementById('challengeCategory').value,
    start_date: document.getElementById('challengeStart').value || null,
    end_date: document.getElementById('challengeEnd').value || null,
    winners_count: parseInt(document.getElementById('challengeWinners').value) || 1,
    max_participants: parseInt(document.getElementById('challengeMax').value) || 100,
    success_requirements: document.getElementById('challengeRequirements').value.trim(),
    verification_instructions: document.getElementById('challengeVerification').value.trim(),
    rules: document.getElementById('challengeRules').value.trim()
  };

  const btn = document.getElementById('challengeSaveBtn');
  btn.disabled = true;
  btn.textContent = 'جاري الحفظ...';

  try {
    if (id) {
      await supabaseClient.from('challenges').update(data).eq('id', id);
      showToast('✅ تم تحديث التحدي', 'success');
    } else {
      const now = getTodayStr();
      const status = (data.start_date && data.start_date <= now) ? 'active' : 'upcoming';
      data.status = status;
      data.created_by = currentUser.id;
      data.current_participants = 0;
      data.registration_open = true;
      await supabaseClient.from('challenges').insert(data);
      showToast('✅ تم إنشاء التحدي', 'success');
    }

    hideChallengeForm();
    await loadAdminChallenges();
    await loadAdminDashboard();
  } catch (err) {
    showToast('حدث خطأ في الحفظ', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = id ? 'تحديث التحدي' : 'إنشاء التحدي';
  }
}

async function toggleChallengeRegistration(id) {
  try {
    const { data: c } = await supabaseClient.from('challenges').select('registration_open').eq('id', id).single();
    const newVal = !c?.registration_open;
    await supabaseClient.from('challenges').update({ registration_open: newVal }).eq('id', id);
    showToast(newVal ? '🔓 تم فتح التسجيل' : '🔒 تم إغلاق التسجيل', 'success');
    await loadAdminChallenges();
  } catch (err) { showToast('حدث خطأ', 'error'); }
}

async function deleteChallenge(id) {
  if (!confirm('هل أنت متأكد من حذف هذا التحدي؟')) return;
  try {
    await supabaseClient.from('challenges').delete().eq('id', id);
    showToast('تم حذف التحدي', 'success');
    await loadAdminChallenges();
    await loadAdminDashboard();
  } catch (err) { showToast('حدث خطأ في الحذف', 'error'); }
}

// ===========================================
// PARTICIPANTS
// ===========================================

async function loadAdminParticipants() {
  const container = document.getElementById('adminParticipantsList');
  showLoading(container);
  try {
    const { data: participants } = await supabaseClient
      .from('challenge_participants')
      .select('*, challenges(title)')
      .order('created_at', { ascending: false });

    if (!participants || participants.length === 0) {
      showEmptyState(container, 'لا يوجد مشاركون', 'لم ينضم أحد للتحديات بعد');
      return;
    }

    let html = '<div class="task-list">';
    participants.forEach(p => {
      html += `
        <div class="task-item">
          <div class="task-content">
            <div class="task-title">${escapeHtml(p.username || 'مستخدم')}</div>
            <div class="task-meta">
              <span>📋 ${p.challenges?.title || 'تحدي'}</span>
              <span>⭐ ${p.points || 0} نقطة</span>
              <span class="stat-badge ${p.status === 'active' ? 'approved' : 'rejected'}">${p.status}</span>
            </div>
          </div>
          <div class="task-actions">
            <button class="btn btn-sm btn-danger-ghost" onclick="removeParticipant('${p.id}')">إزالة</button>
          </div>
        </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = '<p style="color:var(--danger);">حدث خطأ</p>';
  }
}

async function removeParticipant(id) {
  if (!confirm('إزالة هذا المشارك؟')) return;
  try {
    await supabaseClient.from('challenge_participants').delete().eq('id', id);
    showToast('تمت إزالة المشارك', 'success');
    await loadAdminParticipants();
  } catch (err) { showToast('حدث خطأ', 'error'); }
}

// ===========================================
// SUBMISSIONS REVIEW
// ===========================================

async function loadAdminSubmissions(filter = 'pending') {
  const container = document.getElementById('submissionsList');
  showLoading(container);

  try {
    let query = supabaseClient
      .from('challenge_submissions')
      .select('*, challenges(title)')
      .order('created_at', { ascending: false });

    if (filter !== 'all') query = query.eq('status', filter);

    const { data: submissions } = await query;

    if (!submissions || submissions.length === 0) {
      showEmptyState(container, 'لا توجد توثيقات', 'لا توجد توثيقات ' + (filter === 'pending' ? 'معلقة' : filter === 'approved' ? 'مقبولة' : 'مرفوضة'));
      return;
    }

    let html = '';
    submissions.forEach(s => {
      const statusIcon = s.status === 'pending' ? '🟡' : s.status === 'approved' ? '✅' : '❌';
      html += `
        <div class="submission-card">
          <div class="submission-header">
            <div>
              <span class="submission-user">${escapeHtml(s.telegram_username || 'مستخدم')}</span>
              <span class="submission-challenge">📋 ${s.challenges?.title || 'تحدي'}</span>
            </div>
            <span class="submission-day">اليوم ${s.day_number || 1}</span>
          </div>
          <div class="submission-desc">${escapeHtml(s.description || '')}</div>
          <div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
            ${s.google_email ? `<span style="font-size:0.75rem;color:var(--text-muted);">📧 ${escapeHtml(s.google_email)}</span>` : ''}
            <span class="stat-badge ${s.status}">${statusIcon} ${s.status === 'pending' ? 'قيد المراجعة' : s.status === 'approved' ? 'مقبول' : 'مرفوض'}</span>
          </div>
          ${s.status === 'pending' ? `
          <div class="submission-actions">
            <input class="form-input" type="number" id="pointsInput_${s.id}" placeholder="النقاط" value="10" min="0" style="width:80px;">
            <button class="btn btn-sm btn-success" onclick="approveSubmission('${s.id}')">✅ قبول</button>
            <button class="btn btn-sm btn-danger" onclick="rejectSubmission('${s.id}')">❌ رفض</button>
          </div>` : `
          <div class="submission-actions">
            ${s.notes ? `<span style="font-size:0.8rem;color:var(--text-secondary);">📝 ملاحظات: ${escapeHtml(s.notes)}</span>` : ''}
            <span style="font-size:0.8rem;color:var(--primary);font-weight:600;">⭐ ${s.points_awarded || 0} نقطة</span>
          </div>`}
        </div>`;
    });

    container.innerHTML = html;

    // Filter buttons
    document.querySelectorAll('#submissionFilters .admin-filter-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.filter === filter) btn.classList.add('active');
    });
  } catch (err) {
    container.innerHTML = '<p style="color:var(--danger);">حدث خطأ</p>';
  }
}

// Submission filter switching (delegation)
document.addEventListener('click', function(e) {
  const filterBtn = e.target.closest('#submissionFilters .admin-filter-btn');
  if (filterBtn) {
    const filter = filterBtn.dataset.filter;
    loadAdminSubmissions(filter);
  }
});

async function approveSubmission(id) {
  const pointsInput = document.getElementById('pointsInput_' + id);
  const points = parseInt(pointsInput?.value) || 10;
  if (points < 0) { showToast('النقاط يجب أن تكون 0 أو أكثر', 'warning'); return; }
  if (!confirm(`قبول التوثيق ومنح ${points} نقطة؟`)) return;

  try {
    const { data: sub } = await supabaseClient.from('challenge_submissions').select('*, challenges(title)').eq('id', id).single();
    if (!sub) { showToast('التوثيق غير موجود', 'error'); return; }

    await supabaseClient.from('challenge_submissions').update({
      status: 'approved',
      points_awarded: points,
      reviewed_by: currentUser.id,
      reviewed_at: new Date().toISOString(),
      notes: ''
    }).eq('id', id);

    // Update participant points
    const { data: participant } = await supabaseClient
      .from('challenge_participants')
      .select('*')
      .eq('challenge_id', sub.challenge_id)
      .eq('user_id', sub.user_id)
      .single();

    if (participant) {
      await supabaseClient.from('challenge_participants').update({
        points: (participant.points || 0) + points
      }).eq('id', participant.id);
    }

    await checkAndAwardBadges(sub.user_id);
    showToast(`✅ تم قبول التوثيق ومنح ${points} نقطة`, 'success');
    await loadAdminSubmissions(document.querySelector('#submissionFilters .admin-filter-btn.active')?.dataset?.filter || 'pending');
  } catch (err) {
    showToast('حدث خطأ', 'error');
  }
}

async function rejectSubmission(id) {
  const notes = prompt('أضف ملاحظات الرفض (اختياري):');
  try {
    await supabaseClient.from('challenge_submissions').update({
      status: 'rejected',
      reviewed_by: currentUser.id,
      reviewed_at: new Date().toISOString(),
      notes: notes || ''
    }).eq('id', id);

    showToast('تم رفض التوثيق', 'warning');
    await loadAdminSubmissions(document.querySelector('#submissionFilters .admin-filter-btn.active')?.dataset?.filter || 'pending');
  } catch (err) { showToast('حدث خطأ', 'error'); }
}

// ===========================================
// RESULTS MANAGEMENT
// ===========================================

async function loadAdminResults() {
  const container = document.getElementById('adminResultsList');
  showLoading(container);
  try {
    const { data: challenges } = await supabaseClient
      .from('challenges')
      .select('*')
      .in('status', ['active', 'completed'])
      .order('created_at', { ascending: false });

    if (!challenges || challenges.length === 0) {
      showEmptyState(container, 'لا توجد نتائج', 'لا توجد تحديات منتهية أو نشطة');
      return;
    }

    let html = '';
    for (const c of challenges) {
      const { data: participants } = await supabaseClient
        .from('challenge_participants')
        .select('*')
        .eq('challenge_id', c.id)
        .order('points', { ascending: false });

      const { data: winners } = await supabaseClient
        .from('challenge_winners')
        .select('*')
        .eq('challenge_id', c.id);

      html += `
        <div class="card mb-16">
          <div class="flex-between mb-16">
            <h4>${escapeHtml(c.title)}</h4>
            <span class="badge badge-${c.status === 'completed' ? 'success' : 'primary'}">${c.status === 'completed' ? 'منتهي' : 'نشط'}</span>
          </div>
          ${participants && participants.length > 0 ? `
          <div class="leaderboard mb-16">
            ${participants.slice(0, 10).map((p, i) => `
              <div class="leaderboard-item ${i < 3 ? ['top-1','top-2','top-3'][i] : ''}">
                <div class="leaderboard-rank">${i + 1}</div>
                <div class="leaderboard-user">${escapeHtml(p.username || 'مستخدم')}</div>
                <div class="leaderboard-points">${p.points || 0} نقطة</div>
              </div>`).join('')}
          </div>` : '<p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:12px;">لا يوجد مشاركون</p>'}

          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${c.status === 'active' ? `<button class="btn btn-sm btn-primary" onclick="endChallengeAndSelectWinners('${c.id}')">🏆 إنهاء واختيار الفائزين</button>` : ''}
            ${winners && winners.length > 0 ? `<button class="btn btn-sm btn-outline" onclick="publishResults('${c.id}')">📢 نشر النتائج</button>
            <button class="btn btn-sm btn-danger-ghost" onclick="resetResults('${c.id}')">🔄 إعادة تعيين</button>` : ''}
          </div>
        </div>`;
    }

    container.innerHTML = html || '<p style="color:var(--text-muted);text-align:center;">لا توجد بيانات</p>';
  } catch (err) {
    container.innerHTML = '<p style="color:var(--danger);">حدث خطأ</p>';
  }
}

async function endChallengeAndSelectWinners(challengeId) {
  if (!confirm('إنهاء التحدي واختيار الفائزين؟')) return;

  try {
    const { data: challenge } = await supabaseClient.from('challenges').select('*').eq('id', challengeId).single();
    const { data: participants } = await supabaseClient
      .from('challenge_participants')
      .select('*')
      .eq('challenge_id', challengeId)
      .eq('status', 'active')
      .order('points', { ascending: false });

    const winnersCount = challenge.winners_count || 3;
    const topParticipants = (participants || []).slice(0, winnersCount);

    // Clear old winners
    await supabaseClient.from('challenge_winners').delete().eq('challenge_id', challengeId);

    // Insert winners
    for (let i = 0; i < topParticipants.length; i++) {
      await supabaseClient.from('challenge_winners').insert({
        challenge_id: challengeId,
        user_id: topParticipants[i].user_id,
        rank: i + 1,
        points: topParticipants[i].points || 0
      });
    }

    await supabaseClient.from('challenges').update({ status: 'completed' }).eq('id', challengeId);

    // Award badges to winners
    for (const w of topParticipants) {
      await checkAndAwardBadges(w.user_id);
    }

    showToast('✅ تم إنهاء التحدي واختيار الفائزين', 'success');
    await loadAdminResults();
  } catch (err) {
    showToast('حدث خطأ', 'error');
  }
}

async function publishResults(challengeId) {
  if (!confirm('نشر النتائج النهائية؟')) return;
  try {
    await supabaseClient.from('challenges').update({ status: 'completed' }).eq('id', challengeId);
    showToast('📢 تم نشر النتائج', 'success');
    await loadAdminResults();
  } catch (err) { showToast('حدث خطأ', 'error'); }
}

async function resetResults(challengeId) {
  if (!confirm('إعادة تعيين نتائج التحدي؟')) return;
  try {
    await supabaseClient.from('challenge_winners').delete().eq('challenge_id', challengeId);
    await supabaseClient.from('challenges').update({ status: 'active' }).eq('id', challengeId);
    showToast('🔄 تم إعادة تعيين النتائج', 'success');
    await loadAdminResults();
  } catch (err) { showToast('حدث خطأ', 'error'); }
}
