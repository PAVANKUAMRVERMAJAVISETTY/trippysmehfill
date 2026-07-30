import { supabase } from './api.js';

let isSignUpMode = false;
let pendingRegData = null;

document.addEventListener('DOMContentLoaded', () => {
  loadActiveDishes();
  loadTopSlider();
  loadGalleryHighlights();
  setupAuthHandlers();
  initAutoCarousel();
});

// 1. Fetch IP Address
async function getUserIP() {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    return data.ip;
  } catch (e) {
    return '0.0.0.0';
  }
}

// 2. Fetch Active Dishes
async function loadActiveDishes() {
  const container = document.getElementById('dishes-container');
  if (!container) return;

  const { data: dishes, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('is_available', true);

  if (error || !dishes || dishes.length === 0) {
    container.innerHTML = `<p class="text-gray-400 text-xs py-8 col-span-full text-center">No active dishes found.</p>`;
    return;
  }

  container.innerHTML = dishes.map(dish => `
    <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition">
      <div>
        <h3 class="font-extrabold text-gray-900">${dish.name}</h3>
        <p class="text-xs text-gray-500 mt-1 line-clamp-2">${dish.description || ''}</p>
      </div>
      <div class="flex justify-between items-center mt-4 pt-2 border-t border-gray-50">
        <span class="text-sm font-black text-gray-900">₹${dish.price}</span>
        <button onclick="openDrawer('login')" class="bg-swiggy/10 text-swiggy text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-swiggy hover:text-white transition">
          Sign In to Order
        </button>
      </div>
    </div>
  `).join('');
}

// 3. Load Top Slider Images
async function loadTopSlider() {
  const track = document.getElementById('top-slider-track');
  if (!track) return;

  const { data: slides } = await supabase
    .from('gallery_images')
    .select('*')
    .eq('section_type', 'top_slider');

  if (slides && slides.length > 0) {
    track.innerHTML = slides.map(s => `
      <div class="min-w-full h-full relative">
        <img src="${s.image_url}" class="w-full h-full object-cover opacity-80" alt="${s.title}">
        <div class="absolute inset-0 bg-black/40 flex flex-col justify-center items-center text-center p-4">
          <h1 class="text-3xl md:text-5xl font-black text-white">${s.title}</h1>
          <p class="text-amber-300 font-bold text-sm mt-2">${s.description || ''}</p>
        </div>
      </div>
    `).join('');
  }
}

// 4. Load Gallery Highlights
async function loadGalleryHighlights() {
  const grid = document.getElementById('gallery-highlights-grid');
  if (!grid) return;

  const { data: highlights } = await supabase
    .from('gallery_images')
    .select('*')
    .eq('section_type', 'gallery_highlights')
    .limit(6);

  if (!highlights || highlights.length === 0) {
    grid.innerHTML = `<p class="text-gray-400 text-xs py-4 col-span-full text-center">No gallery highlights uploaded yet.</p>`;
    return;
  }

  grid.innerHTML = highlights.map(h => `
    <div class="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition">
      <img src="${h.image_url}" class="w-full h-48 object-cover" alt="${h.title}">
      <div class="p-4">
        <h4 class="font-bold text-gray-900 text-sm">${h.title}</h4>
        <p class="text-xs text-gray-500 mt-1">${h.description || ''}</p>
      </div>
    </div>
  `).join('');
}

// 5. 5-Second Auto-Slider Interval
function initAutoCarousel() {
  let index = 0;
  setInterval(() => {
    const track = document.getElementById('top-slider-track');
    if (track && track.children.length > 1) {
      index = (index + 1) % track.children.length;
      track.style.transform = `translateX(-${index * 100}%)`;
    }
  }, 5000);
}

// Drawer Controls
window.openDrawer = function(mode) {
  document.getElementById('auth-drawer').classList.remove('hidden');
  if (mode === 'signup' && !isSignUpMode) toggleAuthMode();
};

window.closeDrawer = function() {
  document.getElementById('auth-drawer').classList.add('hidden');
};

window.toggleAuthMode = function() {
  isSignUpMode = !isSignUpMode;
  document.getElementById('drawer-title').innerText = isSignUpMode ? 'Sign up' : 'Login';
  document.getElementById('toggle-auth-mode').innerText = isSignUpMode ? 'login to your account' : 'create an account';
  document.getElementById('login-form').classList.toggle('hidden', isSignUpMode);
  document.getElementById('register-form').classList.toggle('hidden', !isSignUpMode);
  document.getElementById('otp-form').classList.add('hidden');
};

// 6. Setup Auth Handlers (OTP & Pending Registration Logic)
function setupAuthHandlers() {
  // Login Submissions
  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    const { data: { user }, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) return alert("⚠️ Login Failed: " + error.message);

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_approved')
      .eq('id', user.id)
      .single();

    if (!profile) return alert("⚠️ Profile not found.");

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

  // Step 1: Request Registration & OTP
  document.getElementById('register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const address = document.getElementById('reg-address').value.trim();
    const password = document.getElementById('reg-password').value;

    // Capture GPS
    let userLat = null, userLng = null;
    if (navigator.geolocation) {
      await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => { userLat = pos.coords.latitude; userLng = pos.coords.longitude; resolve(); },
          () => resolve()
        );
      });
    }

    const ip = await getUserIP();

    pendingRegData = { name, phone, email, address, password, lat: userLat, lng: userLng, ip };

    // Request Supabase OTP
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) return alert("Signup Request Failed: " + error.message);

    alert("📩 OTP Sent! Check your email inbox for the verification token.");
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('otp-form').classList.remove('hidden');
  });

  // Step 2: Verify OTP and Insert Profile as Pending Registration
  document.getElementById('otp-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = document.getElementById('otp-token').value.trim();

    const { data: { user }, error } = await supabase.auth.verifyOtp({
      email: pendingRegData.email,
      token: token,
      type: 'signup'
    });

    if (error) return alert("Invalid OTP: " + error.message);

    if (user) {
      await supabase.from('profiles').insert([{
        id: user.id,
        full_name: pendingRegData.name,
        email: pendingRegData.email,
        phone: pendingRegData.phone,
        hostel_address: pendingRegData.address,
        live_lat: pendingRegData.lat,
        live_lng: pendingRegData.lng,
        ip_address: pendingRegData.ip,
        role: 'customer',
        is_approved: false
      }]);
    }

    alert("🎉 Email verified! Your account is now submitted to Pending Registrations for Admin approval.");
    closeDrawer();
  });
}