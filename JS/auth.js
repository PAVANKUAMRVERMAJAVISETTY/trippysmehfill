// ==========================================================
// JS/auth.js - CENTRAL SESSION ROUTING & SECURITY
// ==========================================================
import { auth, db } from "./firebase.js";
import { doc, getDoc } from "firebase/firestore";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

// Login staff/admin and route securely based on Firestore records
export async function handleLogin(identifier, password) {
  try {
    let email = identifier.trim();
    
    // Automatically convert plain usernames to email format for Firebase Auth
    if (!email.includes("@")) {
      email = `${email.toLowerCase()}@trippysmehfill.com`;
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Always query the unified "staff" collection for security clearances
    const userDocRef = doc(db, "staff", user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const userRole = (userData.role || "").toLowerCase().trim();

      if (userData.isAdmin === true || userRole === "admin") {
        window.location.href = "/Pages/admin.html";
      } else if (userRole === "staff" || userRole === "kitchen staff") {
        window.location.href = "/Pages/admin-orders.html";
      } else if (userRole === "driver" || userRole === "delivery boy") {
        window.location.href = "/Pages/delivery.html";
      } else {
        throw new Error("Invalid account role assigned.");
      }
    } else {
      await signOut(auth);
      alert("Unauthorized access: No profile found in system settings.");
    }
  } catch (error) {
    console.error("Authentication Error: ", error.message);
    alert(`Login Failed: ${error.message}`);
  }
}

// Global router guard to protect your private pages
export function protectPage(allowedRoles = []) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "/Pages/staff-login.html";
      return;
    }

    try {
      const userDocRef = doc(db, "staff", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        await signOut(auth);
        window.location.href = "/Pages/staff-login.html";
        return;
      }

      const userData = userDoc.data();
      const userRole = (userData.role || "").toLowerCase().trim();
      const isAdmin = userData.isAdmin === true || userRole === "admin";

      if (allowedRoles.length > 0) {
        const isAllowed = allowedRoles.includes(userRole) || isAdmin;
        if (!isAllowed) {
          alert("Access Denied: You do not have permission to view this page.");
          window.location.href = "/Pages/staff-login.html";
        }
      }
    } catch (err) {
      console.error("Session verification error:", err);
      window.location.href = "/Pages/staff-login.html";
    }
  });
}
