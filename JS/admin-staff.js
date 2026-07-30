// ==========================================================
// JS/admin-staff.js - REGISTERING STAFF ACCOUNTS
// ==========================================================
import { db, firebaseConfig } from "./firebase.js"; 
import { initializeApp, getApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

function getSecondaryAuth() {
  let secondaryApp;
  try {
    secondaryApp = getApp("StaffRegistration");
  } catch (error) {
    secondaryApp = initializeApp(firebaseConfig, "StaffRegistration");
  }
  return getAuth(secondaryApp);
}

export async function createStaffMember(name, username, password, role) {
  const staffEmail = `${username.toLowerCase().trim()}@trippysmehfill.com`;
  const secondaryAuth = getSecondaryAuth();

  try {
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, staffEmail, password);
    const staffUid = userCredential.user.uid;

    await signOut(secondaryAuth);

    await setDoc(doc(db, "staff", staffUid), {
      uid: staffUid,
      name: name,
      username: username,
      email: staffEmail,
      role: role, 
      createdAt: new Date()
    });

    alert(`🎉 Success! ${role.toUpperCase()} "${name}" has been registered.`);
  } catch (error) {
    console.error("Staff registration failed:", error.message);
    alert(`Registration Failed: ${error.message}`);
  }
}
