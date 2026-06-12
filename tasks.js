/* ===========================================
   Task Intelligence System - Tasks Module
   Recurring & Daily Tasks CRUD
   =========================================== */

let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = await checkAuth();
  if (!currentUser) return;
  await generateRecurringForToday();
  await loadRecurringTasks();
  await loadDailyTasks();
});

// ===========================================
// RECURRING TASKS
// ===========================================

async function loadRecurringTasks() {
  const container = document.getElementById('recurringTasksList');
  if (!container) return;

  try {
    const cacheKey = `recurring_${currentUser.id}`;
    showLoading(container);

    const { data: tasks, error } = await supabaseClient
      .from('recurring_tasks')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;

    setCache(cacheKey, tasks);

    if (!tasks || tasks.length === 0) {
      showEmptyState(container, 'لا توجد مهام ثابتة', 'أضف مهامك الثابتة التي تكرر يومياً مثل الصلاة، الرياضة، القراءة...');
      return;
    }

    renderRecurringTasks(container, tasks);
  } catch (err) {
    const cached = getCached(`recurring_${currentUser.id}`);
    if (cached) {
      renderRecurringTasks(container, cached);
      return;
    }
    container.innerHTML = `<div class="empty-state"><p class="empty-state-text" style="color:var(--danger);">حدث خطأ في تحميل المهام</p></div>`;
  }
}

function renderRecurringTasks(container, tasks) {
  let html = '<div class="task-list">';
  tasks.forEach(task => {
    const daysList = (task.days || []).map(d => DAYS_MAP[d] || d).join('، ');
    const priorityClass = getPriorityColor(task.priority);
    const priorityLabel = getPriorityLabel(task.priority);
    const timeDisplay = task.time ? task.time.slice(0, 5) : '';
    html += `
      <div class="task-item priority-${priorityClass}">
        <div class="task-content">
          <div class="task-title">${escapeHtml(task.title)}</div>
          <div class="task-meta">
            <span class="badge badge-${priorityClass}">${priorityLabel}</span>
            <span>📅 ${daysList || 'غير محدد'}</span>
            ${timeDisplay ? `<span>⏰ ${timeDisplay}</span>` : ''}
            ${task.description ? `<span>${escapeHtml(task.description)}</span>` : ''}
          </div>
        </div>
        <div class="task-actions">
          <button class="btn btn-sm btn-outline" onclick="editRecurringTask('${task.id}')">✏️</button>
          <button class="btn btn-sm btn-danger-ghost" onclick="deleteRecurringTask('${task.id}')">🗑️</button>
        </div>
      </div>
    `;
  });
  html += '</div>';
  container.innerHTML = html;
}

function openRecurringModal() {
  document.getElementById('recurringModalTitle').textContent = 'إضافة مهمة ثابتة';
  document.getElementById('recurringForm').reset();
  document.getElementById('recurringEditId').value = '';
  document.querySelectorAll('#recurringDays input').forEach(cb => cb.checked = false);
  openModal('recurringModal');
}

async function editRecurringTask(id) {
  try {
    const { data: task, error } = await supabaseClient
      .from('recurring_tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !task) {
      showToast('حدث خطأ في تحميل المهمة', 'error');
      return;
    }

    document.getElementById('recurringModalTitle').textContent = 'تعديل مهمة ثابتة';
    document.getElementById('recurringEditId').value = task.id;
    document.getElementById('recurringTitle').value = task.title;
    document.getElementById('recurringDesc').value = task.description || '';
    document.getElementById('recurringPriority').value = task.priority;
    if (task.time) document.getElementById('recurringTime').value = task.time.slice(0, 5);

    document.querySelectorAll('#recurringDays input').forEach(cb => {
      cb.checked = (task.days || []).includes(cb.value);
    });

    openModal('recurringModal');
  } catch (err) {
    showToast('حدث خطأ', 'error');
  }
}

async function saveRecurringTask(e) {
  e.preventDefault();
  const id = document.getElementById('recurringEditId').value;
  const title = document.getElementById('recurringTitle').value.trim();
  const description = document.getElementById('recurringDesc').value.trim();
  const priority = parseInt(document.getElementById('recurringPriority').value);
  const time = document.getElementById('recurringTime').value || null;
  const days = Array.from(document.querySelectorAll('#recurringDays input:checked')).map(cb => cb.value);

  if (!title) {
    showToast('يرجى إدخال عنوان المهمة', 'warning');
    return;
  }

  if (days.length === 0) {
    showToast('يرجى اختيار يوم تكرار واحد على الأقل', 'warning');
    return;
  }

  const btn = document.getElementById('recurringSaveBtn');
  btn.disabled = true;
  btn.textContent = 'جاري الحفظ...';

  try {
    if (id) {
      const { error } = await supabaseClient
        .from('recurring_tasks')
        .update({ title, description, priority, days, time })
        .eq('id', id);

      if (error) throw error;
      showToast('تم تحديث المهمة بنجاح', 'success');
    } else {
      const { error } = await supabaseClient
        .from('recurring_tasks')
        .insert({ user_id: currentUser.id, title, description, priority, days, time });

      if (error) throw error;
      showToast('تم إضافة المهمة بنجاح', 'success');
    }

    closeModal('recurringModal');
    await loadRecurringTasks();
    await generateRecurringForToday();
  } catch (err) {
    showToast(err.message || 'حدث خطأ في الحفظ', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = id ? 'تحديث المهمة' : 'حفظ المهمة';
  }
}

async function deleteRecurringTask(id) {
  if (!confirm('هل أنت متأكد من حذف هذه المهمة؟')) return;

  try {
    const { error } = await supabaseClient
      .from('recurring_tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;
    showToast('تم حذف المهمة بنجاح', 'success');
    await loadRecurringTasks();
  } catch (err) {
    showToast('حدث خطأ في الحذف', 'error');
  }
}

// ===========================================
// DAILY TASKS
// ===========================================

async function loadDailyTasks(filterDate = null) {
  const container = document.getElementById('dailyTasksList');
  if (!container) return;

  try {
    showLoading(container);
    const date = filterDate || getTodayStr();
    let query = supabaseClient
      .from('daily_tasks')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('due_date', date)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true });

    if (filterDate) {
      query = query.eq('due_date', filterDate);
    } else {
      query = query.eq('due_date', getTodayStr());
    }

    const { data: tasks, error } = await query;

    if (error) throw error;

    if (!tasks || tasks.length === 0) {
      showEmptyState(container, 'لا توجد مهام لليوم', 'لم يتم إضافة مهام لهذا اليوم. أضف مهامك الجديدة أو تأكد من تفعيل المهام الثابتة.');
      return;
    }

    renderDailyTasks(container, tasks);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p class="empty-state-text" style="color:var(--danger);">حدث خطأ في تحميل المهام</p></div>`;
  }
}

function renderDailyTasks(container, tasks) {
  const sorted = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return a.priority - b.priority;
  });

  let html = '<div class="task-list">';
  sorted.forEach(task => {
    const priorityClass = getPriorityColor(task.priority);
    const priorityLabel = getPriorityLabel(task.priority);
    const categoryColor = getCategoryColor(task.category);
    const categoryIcon = getCategoryIcon(task.category);
    html += `
      <div class="task-item ${task.completed ? 'completed' : ''} priority-${priorityClass}">
        <div class="task-check ${task.completed ? 'checked' : ''}" onclick="toggleDailyTask('${task.id}', ${task.completed})">
          ${task.completed ? '✓' : ''}
        </div>
        <div class="task-content">
          <div class="task-title">${escapeHtml(task.title)}</div>
          <div class="task-meta">
            <span class="badge badge-${priorityClass}">${priorityLabel}</span>
            <span class="badge badge-${categoryColor}">${categoryIcon} ${task.category}</span>
            ${task.estimated_time ? `<span>⏱ ${task.estimated_time} د</span>` : ''}
            ${task.description ? `<span>${escapeHtml(task.description)}</span>` : ''}
          </div>
        </div>
        <div class="task-actions">
          <button class="btn btn-sm btn-outline" onclick="editDailyTask('${task.id}')">✏️</button>
          <button class="btn btn-sm btn-danger-ghost" onclick="deleteDailyTask('${task.id}')">🗑️</button>
        </div>
      </div>
    `;
  });
  html += '</div>';
  container.innerHTML = html;
}

function openDailyModal() {
  document.getElementById('dailyModalTitle').textContent = 'إضافة مهمة يومية';
  document.getElementById('dailyForm').reset();
  document.getElementById('dailyEditId').value = '';
  document.getElementById('dailyDate').value = getTodayStr();
  openModal('dailyModal');
}

async function editDailyTask(id) {
  try {
    const { data: task, error } = await supabaseClient
      .from('daily_tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !task) {
      showToast('حدث خطأ في تحميل المهمة', 'error');
      return;
    }

    document.getElementById('dailyModalTitle').textContent = 'تعديل مهمة يومية';
    document.getElementById('dailyEditId').value = task.id;
    document.getElementById('dailyTitle').value = task.title;
    document.getElementById('dailyDesc').value = task.description || '';
    document.getElementById('dailyCategory').value = task.category;
    document.getElementById('dailyPriority').value = task.priority;
    document.getElementById('dailyTime').value = task.estimated_time || 30;
    document.getElementById('dailyDate').value = task.due_date;

    openModal('dailyModal');
  } catch (err) {
    showToast('حدث خطأ', 'error');
  }
}

async function saveDailyTask(e) {
  e.preventDefault();
  const id = document.getElementById('dailyEditId').value;
  const title = document.getElementById('dailyTitle').value.trim();
  const description = document.getElementById('dailyDesc').value.trim();
  const category = document.getElementById('dailyCategory').value;
  const priority = parseInt(document.getElementById('dailyPriority').value);
  const estimated_time = parseInt(document.getElementById('dailyTime').value) || 30;
  const due_date = document.getElementById('dailyDate').value || getTodayStr();

  if (!title) {
    showToast('يرجى إدخال عنوان المهمة', 'warning');
    return;
  }

  if (estimated_time < 5 || estimated_time > 480) {
    showToast('الوقت المتوقع يجب أن يكون بين 5 و 480 دقيقة', 'warning');
    return;
  }

  const btn = document.getElementById('dailySaveBtn');
  btn.disabled = true;
  btn.textContent = 'جاري الحفظ...';

  try {
    if (id) {
      const { error } = await supabaseClient
        .from('daily_tasks')
        .update({ title, description, category, priority, estimated_time, due_date })
        .eq('id', id);

      if (error) throw error;
      showToast('تم تحديث المهمة بنجاح', 'success');
    } else {
      const { error } = await supabaseClient
        .from('daily_tasks')
        .insert({ user_id: currentUser.id, title, description, category, priority, estimated_time, due_date, completed: false });

      if (error) throw error;
      showToast('تم إضافة المهمة بنجاح', 'success');
    }

    closeModal('dailyModal');
    await loadDailyTasks();
  } catch (err) {
    showToast(err.message || 'حدث خطأ في الحفظ', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = id ? 'تحديث المهمة' : 'حفظ المهمة';
  }
}

async function toggleDailyTask(id, currentStatus) {
  try {
    const now = currentStatus ? null : new Date().toISOString();
    const { error } = await supabaseClient
      .from('daily_tasks')
      .update({ completed: !currentStatus, completed_at: now })
      .eq('id', id);

    if (error) throw error;
    showToast(currentStatus ? 'تم إلغاء إكمال المهمة' : '🎉 تم إكمال المهمة!', currentStatus ? 'warning' : 'success');
    await loadDailyTasks();
    await updateProductivityStats();
  } catch (err) {
    showToast('حدث خطأ', 'error');
  }
}

async function deleteDailyTask(id) {
  if (!confirm('هل أنت متأكد من حذف هذه المهمة؟')) return;

  try {
    const { error } = await supabaseClient
      .from('daily_tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;
    showToast('تم حذف المهمة بنجاح', 'success');
    await loadDailyTasks();
    await updateProductivityStats();
  } catch (err) {
    showToast('حدث خطأ في الحذف', 'error');
  }
}

// ===========================================
// PRODUCTIVITY STATS
// ===========================================

async function updateProductivityStats() {
  try {
    const today = getTodayStr();
    const { data: tasks, error } = await supabaseClient
      .from('daily_tasks')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('due_date', today);

    if (error) throw error;

    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Calculate productivity score
    const commitment = rate;
    const consistency = await calculateConsistency();
    const score = Math.round(commitment * 0.5 + consistency * 0.5);

    // Upsert stats
    const { error: upsertError } = await supabaseClient
      .from('productivity_stats')
      .upsert({
        user_id: currentUser.id,
        date: today,
        completion_rate: rate,
        productivity_score: score,
        tasks_completed: completed,
        tasks_total: total
      }, { onConflict: 'user_id, date' });

    if (upsertError) throw upsertError;

  } catch (err) {
    console.error('Stats update error:', err);
  }
}

async function calculateConsistency() {
  try {
    const weekRange = getWeekRange();
    const { data: weekTasks, error } = await supabaseClient
      .from('daily_tasks')
      .select('due_date, completed')
      .eq('user_id', currentUser.id)
      .gte('due_date', weekRange.start)
      .lte('due_date', weekRange.end);

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


