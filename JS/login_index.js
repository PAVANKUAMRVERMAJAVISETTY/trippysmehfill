// ============================================================================
// FILE: JS/login_index.js
// PURPOSE: Handles Auth Modals, Duplicate Validation & Approval Checks
// ============================================================================

import { supabase } from './api.js';

// DOM Elements
const tabSignIn = document.getElementById('tab-signin');
const tabRegister = document.getElementById('tab-register');
const formSignIn = document.getElementById('form-signin');
const formRegister = document.getElementById('form-register');

// Tab Toggle Handlers
tabSignIn.addEventListener('click', () => {
  tabSignIn.className = 'flex-1 py-2 rounded-xl font-bold text-sm bg-amber-500 text-white shadow-xs';
  tabRegister.className = 'flex-1 py-2 rounded-xl font-bold text-sm text-gray-600 hover:text-gray-900';
  formSignIn.classList.remove('hidden');
  formRegister.classList.add('hidden');
});

tabRegister.addEventListener('click', () => {
  tabRegister.className = 'flex-1 py-2 rounded-xl font-bold text-sm bg-amber-500 text-white shadow-xs';
  tabSignIn.className = 'flex-1 py-2 rounded-xl font-bold text-sm text-gray-600 hover:text-gray-900';
  formRegister.classList.remove('hidden');
  formSignIn.classList.add('hidden');
});

// ============================================================================
// REGISTER HANDLER WITH DUPLICATE PHONE & EMAIL PREVENTION
// ============================================================================
formRegister.addEventListener('submit', async (e) => {
  e.preventDefault();

  const fullName = document.getElementById('reg-name').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;

  try {
    // 1. Call PL/pgSQL function to check for existing Email or Phone
    const { data: dupCheck, error: dupErr } = await supabase
      .rpc('check_duplicate_user', { p_email: email, p_phone: phone });

    if (dupErr) throw dupErr;

    if (dupCheck && dupCheck.length > 0) {
      if (dupCheck[0].email_exists) {
        alert("⚠️ ALERT: This Email Address is already registered! Please Sign In.");
        return;
      }
      if (dupCheck[0].phone_exists) {
        alert("❌ ERROR: This Phone Number is already linked to another account!");
        return;
      }
    }

    // 2. Perform Supabase Sign Up
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone: phone }
      }
    });

    if (error) throw error;

    alert("✅ Registration Submitted! Your account is pending Admin approval. You will be redirected once approved.");
    document.getElementById('auth-modal').classList.add('hidden');

  } catch (err) {
    alert("Registration Failed: " + err.message);
  }
});

// ============================================================================
// SIGN IN HANDLER & GATED ROUTING
// ============================================================================
formSignIn.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // Check approval status in profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_approved, role')
      .eq('id', data.user.id)
      .single();

    if (profile && !profile.is_approved && profile.role !== 'admin') {
      alert("⏳ Your registration is pending Admin Approval. Please check back soon!");
      return;
    }

    // Redirect approved customer to main_index.html
    window.location.href = './main_index.html';

  } catch (err) {
    alert("Sign In Failed: " + err.message);
  }
});