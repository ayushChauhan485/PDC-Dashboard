// Firebase Configuration - PUBLIC VERSION FOR DEPLOYMENT
// This file is safe to commit to GitHub
// REPLACE THESE VALUES with your actual Firebase config before deploying

const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.REGION.firebasedatabase.app",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Admin Configuration
const adminEmails = [
  'admin@example.com',
  // Add more admin emails here as needed
];

// Make config available globally
window.firebaseConfig = firebaseConfig;
window.adminEmails = adminEmails;
