// ==========================================
// NASTY — Auth Module
// Firebase Auth + Email Verification flow
// ==========================================

import { auth, db } from './firebase.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, setDoc, getDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { showToast } from './utils.js';

// ---- State ----
let currentUser = null;
const authCallbacks = [];

// ---- Auth state listener ----
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  authCallbacks.forEach(cb => cb(user));
  updateNavUI(user);
});

export function onAuthChange(cb) { authCallbacks.push(cb); }
export function getUser() { return currentUser; }
export function isLoggedIn() { return !!currentUser; }

// ---- Sign Up ----
export async function signUp(name, email, password) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    await sendEmailVerification(cred.user);

    // Create user doc in Firestore
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid,
      name,
      email,
      role: 'customer',
      avatar: null,
      wishlist: [],
      createdAt: serverTimestamp(),
      verified: false
    });

    return { success: true, user: cred.user, needsVerification: true };
  } catch (err) {
    return { success: false, error: parseAuthError(err.code) };
  }
}

// ---- Sign In ----
export async function signIn(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);

    if (!cred.user.emailVerified) {
      await signOut(auth);
      return { success: false, error: 'Please verify your email before logging in.', needsVerification: true, email };
    }

    // Update Firestore verified flag
    await setDoc(doc(db, 'users', cred.user.uid), { verified: true }, { merge: true });

    return { success: true, user: cred.user };
  } catch (err) {
    return { success: false, error: parseAuthError(err.code) };
  }
}

// ---- Google Sign In ----
export async function signInWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);

    // Upsert user doc
    const ref = doc(db, 'users', cred.user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: cred.user.uid,
        name: cred.user.displayName,
        email: cred.user.email,
        avatar: cred.user.photoURL,
        role: 'customer',
        wishlist: [],
        createdAt: serverTimestamp(),
        verified: true
      });
    }

    return { success: true, user: cred.user };
  } catch (err) {
    return { success: false, error: parseAuthError(err.code) };
  }
}

// ---- Resend Verification Email ----
export async function resendVerification(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(cred.user);
    await signOut(auth);
    return { success: true };
  } catch (err) {
    return { success: false, error: parseAuthError(err.code) };
  }
}

// ---- Password Reset ----
export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (err) {
    return { success: false, error: parseAuthError(err.code) };
  }
}

// ---- Sign Out ----
export async function logOut() {
  try {
    await signOut(auth);
    showToast('Signed out successfully', 'info');
    return { success: true };
  } catch (err) {
    return { success: false };
  }
}

// ---- Get User Profile from Firestore ----
export async function getUserProfile(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid || currentUser?.uid));
    return snap.exists() ? snap.data() : null;
  } catch { return null; }
}

// ---- Update Nav UI based on auth state ----
function updateNavUI(user) {
  const loginBtn = document.getElementById('nav-login-btn');
  const userBtn = document.getElementById('nav-user-btn');
  const userAvatar = document.getElementById('nav-user-avatar');

  if (!loginBtn) return;

  if (user) {
    loginBtn.classList.add('hidden');
    userBtn?.classList.remove('hidden');
    if (userAvatar) {
      userAvatar.textContent = user.displayName?.[0]?.toUpperCase() || '👤';
    }
  } else {
    loginBtn.classList.remove('hidden');
    userBtn?.classList.add('hidden');
  }
}

// ---- Error parser ----
function parseAuthError(code) {
  const map = {
    'auth/email-already-in-use': 'This email is already registered.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
    'auth/invalid-credential': 'Invalid email or password.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}
