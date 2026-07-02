const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { env } = require('./env');

let firebaseApp;

if (!env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  console.warn('Warning: FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not defined.');
  console.warn('Firebase Auth features will not be available.');
} else {
  try {
    const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_KEY);
    firebaseApp = initializeApp({
      credential: cert(serviceAccount),
    });
  } catch (err) {
    console.log(err);
    // If parsing fails, try using it as a file path
    try {
      firebaseApp = initializeApp({
        credential: cert(env.FIREBASE_SERVICE_ACCOUNT_KEY_FILE),
      });
    } catch (err2) {
      console.error('Firebase Admin SDK initialization failed:', err2.message);
      console.warn('Firebase Auth features will not be available.');
    }
  }
}

const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null;

module.exports = { firebaseAuth, firebaseApp };
