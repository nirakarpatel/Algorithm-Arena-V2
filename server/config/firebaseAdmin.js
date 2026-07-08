const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { env } = require('./env');

const fs = require('fs');
const path = require('path');

let firebaseApp;

const getServiceAccountCredential = () => {
  const keyVal = env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const fileVal = env.FIREBASE_SERVICE_ACCOUNT_KEY_FILE || keyVal;

  if (keyVal) {
    try {
      const parsed = JSON.parse(keyVal);
      if (parsed && typeof parsed === 'object') {
        return cert(parsed);
      }
    } catch (e) {
      // Not raw JSON, fall through to check file path
    }
  }

  if (fileVal) {
    const candidates = [
      path.resolve(process.cwd(), fileVal),
      path.resolve(__dirname, '..', fileVal),
      path.resolve(__dirname, fileVal),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        return cert(p);
      }
    }
    // Also try direct path if absolute or relative
    return cert(fileVal);
  }

  throw new Error('No Firebase Service Account key provided.');
};

if (!env.FIREBASE_SERVICE_ACCOUNT_KEY && !env.FIREBASE_SERVICE_ACCOUNT_KEY_FILE) {
  console.warn('Warning: FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not defined.');
  console.warn('Firebase Auth features will not be available.');
} else {
  try {
    const credential = getServiceAccountCredential();
    firebaseApp = initializeApp({ credential });
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (err) {
    console.error('Firebase Admin SDK initialization failed:', err.message);
    console.warn('Firebase Auth features will not be available.');
  }
}

const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null;

module.exports = { firebaseAuth, firebaseApp };
