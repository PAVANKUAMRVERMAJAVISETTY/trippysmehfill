import { supabase } from './api.js';

let isSignUpMode = false;
window._pendingRegistration = null;

// --- Global Window Scope Bindings for Auth Drawer ---
window.openDrawer = function(mode) {
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

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  loadActiveDishes();
  initTopSlider();
  loadGalleryHighlights();
  bindAuthHandlers();
});

// Helper: Escape HTML
function escapeHtml(s = '') {
  return s.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// 1. Fetch IP Address
async function getUserIP() {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    return data.ip || '0.0.0.0';
  } catch (e) {
    return '0.0.0.0';
  }
}

// 2. Fetch Active Dishes
async function loadActiveDishes() {
  const container = document.getElementById('dishes-container');
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
          <button type="button" onclick="window.openDrawer('login')" class="bg-swiggy/10 text-swiggy text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-swiggy hover:text-white transition cursor-pointer">
            Sign In to Order
          </button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error("Dishes fetch error:", err);
  }
}

// 3. Top Auto-Slider (5s Interval)
async function initTopSlider() {
  const track = document.getElementById('top-slider-track');
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
    const slidesCount = track.children.length || 1;
    setInterval(() => {
      idx = (idx + 1) % Math.max(1, slidesCount);
      track.style.transform = `translateX(-${idx * 100}%)`;
    }, 5000);
  } catch (err) {
    console.error('Top slider load failed:', err);
  }
}

// 4. Gallery Highlights
async function loadGalleryHighlights() {
  const grid = document.getElementById('gallery-highlights-grid');
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
  const regForm = document.getElementById('register-form');
  const otpForm = document.getElementById('otp-form');
  const loginForm = document.getElementById('login-form');

  // Step 1: Sign Up & OTP Request
  regForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const address = document.getElementById('reg-address').value.trim();
    const password = document.getElementById('reg-password').value;

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

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) return alert("Signup Failed: " + error.message);

    if (data.user && data.session) {
      // Auto-confirmed environment: Insert profile immediately
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
    } else {
      alert("📩 Verification code sent! Please check your email inbox.");
      document.getElementById('register-form').classList.add('hidden');
      document.getElementById('otp-form').classList.remove('hidden');
      document.getElementById('drawer-title').innerText = 'Verify OTP';
    }
  });

  // Step 2: OTP Token Verification
  otpForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = document.getElementById('otp-token').value.trim();
    const pending = window._pendingRegistration;

    if (!pending || !token) return alert('Missing OTP or registration details.');

    const { data, error } = await supabase.auth.verifyOtp({
      email: pending.email,
      token: token,
      type: 'email'
    });

    if (error) return alert("OTP Verification Failed: " + error.message);

    if (data.user) {
      await supabase.from('profiles').upsert([{
        id: data.user.id,
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
    }

    alert("🎉 Email verified! Your request is submitted under Pending Registrations for Admin approval.");
    window._pendingRegistration = null;
    window.closeDrawer();
  });

  // Sign In Handler
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) return alert("⚠️ Login Failed: " + error.message);

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
  });
}