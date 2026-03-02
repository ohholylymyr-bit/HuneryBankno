window.addEventListener('DOMContentLoaded', () => {
  if (!window.firebase || !window.HENRY_FIREBASE) return;
  try {
    firebase.initializeApp(window.HENRY_FIREBASE);
    console.log('Firebase initialized');
  } catch (e) {
    console.warn('Firebase init skipped:', e.message);
  }
});
