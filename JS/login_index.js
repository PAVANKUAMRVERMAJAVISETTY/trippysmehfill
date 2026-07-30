import { supabase } from './api.js';

let isSignUpMode = false;

document.addEventListener('DOMContentLoaded', () => {
  loadActiveDishes();
  setupAuthHandlers();
});

// Geolocation Handler
window.getLiveLocation = function() {
  const locInput = document.getElementById('delivery-location');
  if (navigator.geolocation) {
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

// Drawer Toggle Controls
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
};

// Auth Event Handling
function setupAuthHandlers() {
  // Login Submissions
  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    const { data: { user }, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      alert("Login Failed: " + error.message);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_approved')
      .eq('id', user.id)
      .single();

    if (!profile) {
      alert("Profile not found in database.");
      return;
    }

    if (!profile.is_approved) {
      alert("⏳ Account pending approval! Please wait for Admin confirmation.");
      return;
    }

    if (profile.role === 'admin') {
      window.location.href = '/Pages/admin-analytics.html';
    } else if (profile.role === 'staff' || profile.role === 'delivery') {
      window.location.href = '/Pages/staff-login.html';
    } else {
      window.location.href = '/Pages/main_index.html';
    }
  });

  // Registration Submissions
  document.getElementById('register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const address = document.getElementById('reg-address').value.trim();
    const password = document.getElementById('reg-password').value;

    const { data: { user }, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      alert("Registration failed: " + error.message);
      return;
    }

    if (user) {
      await supabase.from('profiles').insert([{
        id: user.id,
        full_name: name,
        email: email,
        phone: phone,
        hostel_address: address,
        role: 'customer',
        is_approved: false
      }]);
    }

    alert("🎉 Account created! Your registration is now under Pending Registrations for Admin approval.");
    closeDrawer();
  });
}