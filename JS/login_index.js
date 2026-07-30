// Global Window Scope Binding for Drawer Controls
window.openDrawer = function(mode) {
  const drawer = document.getElementById('auth-drawer');
  if (drawer) {
    drawer.classList.remove('hidden');
    
    // Toggle signup mode if requested
    if (mode === 'signup' && !isSignUpMode) {
      window.toggleAuthMode();
    } else if (mode === 'login' && isSignUpMode) {
      window.toggleAuthMode();
    }
  } else {
    console.error("Auth drawer element #auth-drawer not found in DOM!");
  }
};

window.closeDrawer = function() {
  const drawer = document.getElementById('auth-drawer');
  if (drawer) {
    drawer.classList.add('hidden');
  }
};

window.toggleAuthMode = function() {
  isSignUpMode = !isSignUpMode;
  const title = document.getElementById('drawer-title');
  const toggleBtn = document.getElementById('toggle-auth-mode');
  const loginForm = document.getElementById('login-form');
  const regForm = document.getElementById('register-form');
  const otpForm = document.getElementById('otp-form');

  if (title) title.innerText = isSignUpMode ? 'Sign up' : 'Login';
  if (toggleBtn) toggleBtn.innerText = isSignUpMode ? 'login to your account' : 'create an account';
  if (loginForm) loginForm.classList.toggle('hidden', isSignUpMode);
  if (regForm) regForm.classList.toggle('hidden', !isSignUpMode);
  if (otpForm) otpForm.classList.add('hidden');
};