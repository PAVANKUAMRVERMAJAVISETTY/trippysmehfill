import { supabase } from './api.js';

let isSignUpMode = false;
window._pendingRegistration = null;

// --- Global Window Scope Bindings for Auth Drawer ---
window.openDrawer = function(mode = 'login') {
  const drawer = document.getElementById('auth-drawer');
  if (drawer) {
    drawer.classList.remove('hidden');
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
  if (drawer) drawer.classList.add('hidden');
};

window.toggleAuthMode = function(forceMode) {
  // Accept optional explicit mode: 'signup' or 'login'
  if (typeof forceMode === 'string') {
    isSignUpMode = (forceMode === 'signup');
  } else {
    isSignUpMode = !isSignUpMode;
  }

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

// Defensive helper to get element and warn once
function $id(id) {
  const el = document.getElementById(id);
  if (!el) console.warn(`Element #${id} not found in DOM`);
  return el;
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  loadActiveDishes();
  initTopSlider();
  loadGalleryHighlights();
  bindAuthHandlers();

  // Defensive: ensure sign-in buttons have type button and attach a console test handler
  const signButtons = document.querySelectorAll('button');
  signButtons.forEach(btn => {
    if (!btn.hasAttribute('type')) btn.setAttribute('type', 'button');
  });
});

// Helper: Escape HTML
function escapeHtml(s = '') {
  return String(s).replace(/[&<>\"']+/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// 1. Fetch IP Address
async function getUserIP() {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    return data.ip || '0.0.0.0';
  } catch (e) {
    console.warn('IP fetch failed', e);
    return '0.0.0.0';
  }
}

// 2. Fetch Active Dishes
async function loadActiveDishes() {
  const container = $id('dishes-container');
  if (!container) return;

  try {
    const { data: dishes, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('is_available', true);

    if (error) throw error;

    if (!dishes || dishes.length === 0) {
      container.innerHTML = `<p class="text-gray-400 text-xs py-8 col-span-full text-center">No active dishes found.</p>`;
      return;
    }

    container.innerHTML = dishes.map(dish => `
      <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition">
        <div>
          <h3 class="font-extrabold text-gray-900">${escapeHtml(dish.name)}</h3>
          <p class="text-xs text-gray-500 mt-1 line-clamp-2">${escapeHtml(dish.description || '')}</p>
        </div>
        <div class="flex justify-between items-center mt-4 pt-2 border-t border-gray-50">
          <span class="text-sm font-black text-gray-900">₹${dish.price}</span>
          <button type="button" onclick="window.openDrawer('login')" class="bg-swiggy/10 text-swiggy text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-swiggy hover:text-white transition">
            Sign In to Order
          </button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error("Dishes fetch error:", err);
    container.innerHTML = `<p class="text-gray-400 text-xs py-8 col-span-full text-center">Failed to load dishes.</p>`;
  }
}

// 3. Top Auto-Slider (5s Interval)
async function initTopSlider() {
  const track = $id('top-slider-track');
  if (!track) return;

  try {
    const { data: slides } = await supabase
      .from('gallery_images')
      .select('*')
      .eq('section_type', 'top_slider')
      .order('created_at', { ascending: false });

    if (slides && slides.length > 0) {
      track.innerHTML = slides.map(s => `
        <div class="min-w-full h-full relative">
          <img src="${s.image_url}" class="w-full h-full object-cover opacity-80" alt="${escapeHtml(s.title)}">
          <div class="absolute inset-0 bg-black/40 flex flex-col justify-center items-center text-center p-4">
            <h1 class="text-3xl md:text-5xl font-black text-white">Order food you love.</h1>
            <p class="text-amber-300 font-bold text-sm mt-2">${escapeHtml(s.title)}</p>
          </div>
        </div>
      `).join('');
    }

    let idx = 0;
    const updateCount = () => track.children.length || 1;
    setInterval(() => {
      idx = (idx + 1) % Math.max(1, updateCount());
      track.style.transform = `translateX(-${idx * 100}%)`;
    }, 5000);
  } catch (err) {
    console.error('Top slider load failed:', err);
  }
}

// 4. Gallery Highlights
async function loadGalleryHighlights() {
  const grid = $id('gallery-highlights-grid');
  if (!grid) return;

  try {
    const { data: highlights } = await supabase
      .from('gallery_images')
      .select('*')
      .eq('section_type', 'gallery_highlights')
      .order('created_at', { ascending: false })
      .limit(6);

    if (!highlights || highlights.length === 0) {
      grid.innerHTML = `<p class="text-gray-400 text-xs py-4 col-span-full text-center">No gallery highlights uploaded yet.</p>`;
      return;
    }

    grid.innerHTML = highlights.map(h => `
      <div class="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition">
        <img src="${h.image_url}" class="w-full h-48 object-cover" alt="${escapeHtml(h.title)}">
        <div class="p-4">
          <h4 class="font-bold text-gray-900 text-sm">${escapeHtml(h.title)}</h4>
          <p class="text-xs text-gray-500 mt-1">${escapeHtml(h.description || '')}</p>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Gallery highlights load error:', err);
  }
}

// 5. Auth Handlers (OTP Registration + Profile Creation)
function bindAuthHandlers() {
  const regForm = $id('register-form');
  const otpForm = $id('otp-form');
  const loginForm = $id('login-form');

  // Step 1: Sign Up & OTP Request
  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const nameEl = $id('reg-name');
        const phoneEl = $id('reg-phone');
        const emailEl = $id('reg-email');
        const addressEl = $id('reg-address');
        const passwordEl = $id('reg-password');

        if (!nameEl || !phoneEl || !emailEl || !addressEl || !passwordEl) {
          return alert('Registration form is missing fields. See console.');
        }

        const name = nameEl.value.trim();
        const phone = phoneEl.value.trim();
        const email = emailEl.value.trim();
        const address = addressEl.value.trim();
        const password = passwordEl.value;

        let userLat = null, userLng = null;
        if (navigator.geolocation) {
          await new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => { userLat = pos.coords.latitude; userLng = pos.coords.longitude; resolve(); },
              () => resolve(),
              { timeout: 5000 }
            );
          });
        }

        const ip = await getUserIP();
        window._pendingRegistration = { name, phone, email, address, password, lat: userLat, lng: userLng, ip };

        // Try to use the modern signUp flow if available
        if (supabase.auth && typeof supabase.auth.signUp === 'function') {
          const { data, error } = await supabase.auth.signUp({ email, password });
          if (error) {
            // If signUp failed due to provider or OTP requirement, attempt OTP send fallback
            console.warn('signUp error, attempting OTP fallback:', error);
            await sendOtpFallback(email);
            showOtpUI();
            return;
          }

          // If user is returned with session -> immediate create profile
          if (data && data.user && data.session) {
            await supabase.from('profiles').insert([{
              id: data.user.id,
              full_name: name,
              email: email,
              phone: phone,
              hostel_address: address,
              live_lat: userLat,
              live_lng: userLng,
              ip_address: ip,
              role: 'customer',
              is_approved: false
            }]);
            alert("🎉 Account created! Your account is submitted to Pending Registrations for Admin approval.");
            window.closeDrawer();
            return;
          } else {
            // signUp succeeded but requires verification (magic link / OTP). Show OTP UI for a code-based flow.
            await sendOtpFallback(email); // ensure an OTP/magic-link was sent
            showOtpUI();
            return;
          }
        } else {
          // If signUp isn't available on this client, attempt OTP send for passwordless flow
          await sendOtpFallback(email);
          showOtpUI();
          return;
        }
      } catch (err) {
        console.error('Registration failed:', err);
        alert('Registration failed: ' + (err.message || err));
      }
    });
  } else {
    console.warn('#register-form not found; registration disabled.');
  }

  // Step 2: OTP Token Verification
  if (otpForm) {
    otpForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const tokenEl = $id('otp-token');
        const pending = window._pendingRegistration;
        if (!tokenEl || !pending) return alert('Missing OTP or registration details.');

        const token = tokenEl.value.trim();

        // Prefer verifyOtp if present (legacy); otherwise try signInWithOtp verify patterns
        if (supabase.auth && typeof supabase.auth.verifyOtp === 'function') {
          const { data, error } = await supabase.auth.verifyOtp({
            email: pending.email,
            token: token,
            type: 'email'
          });
          if (error) throw error;
          handlePostVerification(data?.user, pending);
        } else if (supabase.auth && typeof supabase.auth.signInWithOtp === 'function') {
          // Modern clients: signInWithOtp usually sends OTP; some SDKs accept token to verify.
          // We'll attempt a verify step using signInWithOtp with the token if accepted by the SDK.
          try {
            const maybe = await supabase.auth.signInWithOtp({ email: pending.email, token });
            // if it returned a user, proceed
            if (maybe?.data?.user) {
              handlePostVerification(maybe.data.user, pending);
            } else {
              // If SDK does not support token verify, ask user to use magic link
              alert('OTP verification not supported by this client SDK. Please click the magic link sent to your email to complete verification.');
            }
          } catch (err) {
            console.warn('signInWithOtp verify attempt failed:', err);
            alert('OTP verification failed: ' + (err.message || err));
          }
        } else {
          alert('OTP verification is not supported by the installed supabase client. Please use the magic link that was sent to your email.');
        }
      } catch (err) {
        console.error('OTP verification error:', err);
        alert('OTP verification failed: ' + (err.message || err));
      }
    });
  } else {
    console.warn('#otp-form not found; OTP verify disabled.');
  }

  // Sign In Handler
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const emailEl = $id('login-email');
        const passwordEl = $id('login-password');
        if (!emailEl || !passwordEl) return alert('Login form fields missing.');

        const email = emailEl.value.trim();
        const password = passwordEl.value;

        if (!email || !password) return alert('Please enter email and password.');

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
          console.error('Login failed:', error);
          return alert("⚠️ Login Failed: " + error.message);
        }

        if (!data || !data.user) {
          return alert('Login did not return a user. Please try again.');
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, is_approved')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profileError || !profile) {
          alert("⚠️ Profile record not found. Please contact Admin.");
          return;
        }

        if (!profile.is_approved) {
          alert("⏳ Your account is listed under Pending Registrations! Please wait for Admin approval.");
          return;
        }

        if (profile.role === 'admin') {
          window.location.href = '/Pages/admin.html';
        } else if (profile.role === 'staff' || profile.role === 'delivery') {
          window.location.href = '/Pages/staff-login.html';
        } else {
          window.location.href = '/Pages/main_index.html';
        }
      } catch (err) {
        console.error('Login handler error:', err);
        alert('Login error: ' + (err.message || err));
      }
    });
  } else {
    console.warn('#login-form not found; login disabled.');
  }
}

async function sendOtpFallback(email) {
  // Send OTP / magic link using whichever method exists
  if (supabase.auth && typeof supabase.auth.signInWithOtp === 'function') {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) throw error;
    return;
  }

  // Legacy SDKs: attempt signUp fallback that triggers an email
  if (supabase.auth && typeof supabase.auth.signUp === 'function') {
    const { error } = await supabase.auth.signUp({ email });
    if (error) throw error;
    return;
  }

  throw new Error('No supported OTP/magic-link method found on the Supabase client.');
}

function showOtpUI() {
  const regForm = $id('register-form');
  const otpForm = $id('otp-form');
  const title = $id('drawer-title');
  if (regForm) regForm.classList.add('hidden');
  if (otpForm) otpForm.classList.remove('hidden');
  if (title) title.innerText = 'Verify OTP';
  alert('📩 Verification code / magic link sent. Please check your email (and SPAM) to complete verification.');
}

async function handlePostVerification(user, pending) {
  try {
    if (!user || !pending) {
      console.warn('Post verification missing user/pending', user, pending);
      return;
    }

    await supabase.from('profiles').upsert([{
      id: user.id,
      full_name: pending.name,
      email: pending.email,
      phone: pending.phone,
      hostel_address: pending.address,
      live_lat: pending.lat,
      live_lng: pending.lng,
      ip_address: pending.ip,
      role: 'customer',
      is_approved: false
    }]);

    alert("🎉 Email verified! Your request is submitted under Pending Registrations for Admin approval.");
    window._pendingRegistration = null;
    window.closeDrawer();
  } catch (err) {
    console.error('Failed to save profile after verification:', err);
    alert('Failed to finalize registration: ' + (err.message || err));
  }
}
