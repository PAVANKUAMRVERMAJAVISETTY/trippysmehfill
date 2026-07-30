import { supabase } from './api.js';

let isSignUpMode = false;

document.addEventListener('DOMContentLoaded', () => {
  loadActiveDishes();
  setupAuthHandlers();
});

// Location Handler
window.getLiveLocation = function() {
  const locInput = document.getElementById('delivery-location');
  if (navigator.geolocation && locInput) {
    locInput.placeholder = "Detecting location...";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        locInput.value = `Lat: ${pos.coords.latitude.toFixed(4)}, Lon: ${pos.coords.longitude.toFixed(4)}`;
      },
      (err) => {
        alert("GPS Error: " + err.message);
        locInput.placeholder = "Enter location manually";
      }
    );
  }
};

// Fetch Active Menu Items
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
      container.innerHTML = `<p class="text-gray-400 text-xs py-8 col-span-full text-center">No active dishes currently listed.</p>`;
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
  } catch (err) {
    container.innerHTML = `<p class="text-red-500 text-xs py-8 col-span-full text-center">${err.message}</p>`;
  }
}

// Drawer Controls
window.openDrawer = function(mode) {
  const drawer = document.getElementById('auth-drawer');
  if (drawer) drawer.classList.remove('hidden');
  if (mode === 'signup' && !isSignUpMode) toggleAuthMode();
};

window.closeDrawer = function() {
  const drawer = document.getElementById('auth-drawer');
  if (drawer) drawer.classList.add('hidden');
};

window.toggleAuthMode = function() {
  isSignUpMode = !isSignUpMode;
  const title = document.getElementById('drawer-title');
  const toggleBtn = document.getElementById('toggle-auth-mode');
  const loginForm = document.getElementById('login-form');
  const regForm = document.getElementById('register-form');

  if (title) title.innerText = isSignUpMode ? 'Sign up' : 'Login';
  if (toggleBtn) toggleBtn.innerText = isSignUpMode ? 'login to your account' : 'create an account';
  if (loginForm) loginForm.classList.toggle('hidden', isSignUpMode);
  if (regForm) regForm.classList.toggle('hidden', !isSignUpMode);
};

// Setup Auth Submissions
function setupAuthHandlers() {
  // Login Form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        alert("⚠️ Login Failed: " + error.message);
        return;
      }

      // Query Profile Role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, is_approved')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile) {
        alert("⚠️ Profile record not found. Please contact Admin.");
        return;
      }

      if (!profile.is_approved) {
        alert("⏳ Your registration is pending approval! Admin will approve your account shortly.");
        return;
      }

      // Route by Role
      if (profile.role === 'admin') {
        window.location.href = '/Pages/admin-analytics.html';
      } else if (profile.role === 'staff' || profile.role === 'delivery') {
        window.location.href = '/Pages/staff-login.html';
      } else {
        window.location.href = '/Pages/main_index.html';
      }
    });
  }

  // Registration Form
  const regForm = document.getElementById('register-form');
  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('reg-name').value.trim();
      const phone = document.getElementById('reg-phone').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const address = document.getElementById('reg-address').value.trim();
      const password = document.getElementById('reg-password').value;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name, phone: phone, address: address }
        }
      });

      if (error) {
        alert("⚠️ Signup Failed: " + error.message);
        return;
      }

      if (data.user) {
        const { error: dbError } = await supabase.from('profiles').insert([{
          id: data.user.id,
          full_name: name,
          email: email,
          phone: phone,
          hostel_address: address,
          role: 'customer',
          is_approved: false
        }]);

        if (dbError) {
          console.error("Profile creation error:", dbError);
        }
      }

      alert("🎉 Account created successfully! Your request is now listed under Pending Registrations for Admin approval.");
      closeDrawer();
    });
  }
}