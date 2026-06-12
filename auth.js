/* ===========================================
   Task Intelligence System - Auth Module
   Login, Register, Forgot Password
   =========================================== */

function showForm(formName) {
  const forms = ['login', 'register', 'forgot'];
  forms.forEach(f => {
    const el = document.getElementById(f + 'Form');
    if (el) el.style.display = 'none';
    const err = document.getElementById(f + 'Error');
    if (err) { err.classList.remove('show'); err.textContent = ''; }
    const suc = document.getElementById(f + 'Success');
    if (suc) { suc.classList.remove('show'); suc.textContent = ''; }
  });
  const target = document.getElementById(formName + 'Form');
  if (target) target.style.display = 'block';
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');
  const btn = document.getElementById('loginBtn');
  const btnText = document.getElementById('loginBtnText');
  const spinner = document.getElementById('loginSpinner');

  errorEl.classList.remove('show');
  errorEl.textContent = '';

  if (!email || !password) {
    errorEl.textContent = 'يرجى إدخال البريد الإلكتروني وكلمة المرور';
    errorEl.classList.add('show');
    return;
  }

  btn.disabled = true;
  btnText.style.display = 'none';
  spinner.style.display = 'inline-block';

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email, password
    });

    if (error) {
      errorEl.textContent = error.message === 'Invalid login credentials'
        ? 'بيانات الدخول غير صحيحة. تحقق من بريدك الإلكتروني وكلمة المرور.'
        : error.message;
      errorEl.classList.add('show');
      btn.disabled = false;
      btnText.style.display = 'inline';
      spinner.style.display = 'none';
      return;
    }

    if (data.session) {
      window.location.href = 'index.html';
    }
  } catch (err) {
    errorEl.textContent = 'حدث خطأ في الاتصال. حاول مرة أخرى.';
    errorEl.classList.add('show');
    btn.disabled = false;
    btnText.style.display = 'inline';
    spinner.style.display = 'none';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  const confirm = document.getElementById('registerConfirm').value;
  const errorEl = document.getElementById('registerError');
  const successEl = document.getElementById('registerSuccess');
  const btn = document.getElementById('registerBtn');
  const btnText = document.getElementById('registerBtnText');
  const spinner = document.getElementById('registerSpinner');

  errorEl.classList.remove('show');
  errorEl.textContent = '';
  successEl.classList.remove('show');
  successEl.textContent = '';

  if (!email || !password || !confirm) {
    errorEl.textContent = 'يرجى ملء جميع الحقول';
    errorEl.classList.add('show');
    return;
  }

  if (password.length < 6) {
    errorEl.textContent = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    errorEl.classList.add('show');
    return;
  }

  if (password !== confirm) {
    errorEl.textContent = 'كلمة المرور غير متطابقة';
    errorEl.classList.add('show');
    return;
  }

  btn.disabled = true;
  btnText.style.display = 'none';
  spinner.style.display = 'inline-block';

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin + '/index.html' }
    });

    if (error) {
      errorEl.textContent = error.message;
      errorEl.classList.add('show');
      btn.disabled = false;
      btnText.style.display = 'inline';
      spinner.style.display = 'none';
      return;
    }

    if (data?.user?.identities?.length === 0) {
      errorEl.textContent = 'هذا البريد الإلكتروني مسجل بالفعل';
      errorEl.classList.add('show');
      btn.disabled = false;
      btnText.style.display = 'inline';
      spinner.style.display = 'none';
      return;
    }

    successEl.textContent = 'تم إنشاء الحساب بنجاح! يمكنك تسجيل الدخول الآن.';
    successEl.classList.add('show');
    btn.disabled = false;
    btnText.style.display = 'inline';
    spinner.style.display = 'none';

    setTimeout(() => showForm('login'), 2000);
  } catch (err) {
    errorEl.textContent = 'حدث خطأ في الاتصال. حاول مرة أخرى.';
    errorEl.classList.add('show');
    btn.disabled = false;
    btnText.style.display = 'inline';
    spinner.style.display = 'none';
  }
}

async function handleForgotPassword(e) {
  e.preventDefault();
  const email = document.getElementById('forgotEmail').value.trim();
  const errorEl = document.getElementById('forgotError');
  const successEl = document.getElementById('forgotSuccess');
  const btn = document.getElementById('forgotBtn');
  const btnText = document.getElementById('forgotBtnText');
  const spinner = document.getElementById('forgotSpinner');

  errorEl.classList.remove('show');
  errorEl.textContent = '';
  successEl.classList.remove('show');
  successEl.textContent = '';

  if (!email) {
    errorEl.textContent = 'يرجى إدخال البريد الإلكتروني';
    errorEl.classList.add('show');
    return;
  }

  btn.disabled = true;
  btnText.style.display = 'none';
  spinner.style.display = 'inline-block';

  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/login.html'
    });

    if (error) {
      errorEl.textContent = error.message;
      errorEl.classList.add('show');
      btn.disabled = false;
      btnText.style.display = 'inline';
      spinner.style.display = 'none';
      return;
    }

    successEl.textContent = 'تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني';
    successEl.classList.add('show');
    btn.disabled = false;
    btnText.style.display = 'inline';
    spinner.style.display = 'none';
  } catch (err) {
    errorEl.textContent = 'حدث خطأ في الاتصال. حاول مرة أخرى.';
    errorEl.classList.add('show');
    btn.disabled = false;
    btnText.style.display = 'inline';
    spinner.style.display = 'none';
  }
}

// Auto-redirect if already logged in
(async function initAuth() {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session && window.location.pathname.endsWith('login.html')) {
      window.location.href = 'index.html';
    }
  } catch (err) {}
})();
