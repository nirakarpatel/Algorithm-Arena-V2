const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { env } = require('./env');

let firebaseApp;

try {
  const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_KEY);

  firebaseApp = initializeApp({
    credential: cert(serviceAccount),
  });
} catch (err) {
  // If parsing fails, try using it as a file path
  if (env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      firebaseApp = initializeApp({
        credential: cert(env.FIREBASE_SERVICE_ACCOUNT_KEY),
      });
    } catch (err2) {
      console.error('Firebase Admin SDK initialization failed:', err2.message);
      console.warn('Firebase Auth features will not be available.');
    }
  } else {
    console.error('Firebase Admin SDK initialization failed:', err.message);
    console.warn('Firebase Auth features will not be available.');
  }
}

const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null;

module.exports = { firebaseAuth, firebaseApp };
