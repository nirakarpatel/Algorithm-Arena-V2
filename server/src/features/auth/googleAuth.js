const axios = require('axios');

/**
 * Verifies a Google ID token by calling Google's tokeninfo API.
 * @param {string} idToken The JWT credential token from Google.
 * @returns {Promise<object>} The decoded Google user profile payload.
 */
async function verifyGoogleToken({ credential, accessToken }) {
  try {
    let url;
    if (credential) {
      url = `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`;
    } else if (accessToken) {
      url = `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`;
    } else {
      throw new Error('No Google token provided');
    }

    const response = await axios.get(url);
    const payload = response.data;

    // Verify audience/client ID matches for ID tokens
    if (credential) {
      const expectedClientId = process.env.GOOGLE_CLIENT_ID;
      if (expectedClientId && expectedClientId !== 'placeholder' && payload.aud !== expectedClientId) {
        throw new Error('Google token audience mismatch');
      }
      if (!payload.email_verified || payload.email_verified === 'false') {
        throw new Error('Google email is not verified');
      }
    }

    return {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      googleId: payload.sub
    };
  } catch (error) {
    console.error('Google token verification failed:', error.message);
    throw new Error('Failed to verify Google credentials');
  }
}

module.exports = { verifyGoogleToken };
