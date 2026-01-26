// services/Auth_Service.js
// Firebase authentication utilities

const { admin } = require("../config/firebaseConfig");

// Identity Platform API key (from Firebase project settings)
const IDENTITY_PLATFORM_API_KEY = process.env.IDENTITY_PLATFORM_API_KEY;

/**
 * Send SMS verification code via Identity Platform
 * @param {string} phoneNumber - E.164 format phone number (e.g., +15551234567)
 * @returns {Promise<string>} sessionInfo token for verification
 */
async function sendVerificationCode(phoneNumber) {
    if (!IDENTITY_PLATFORM_API_KEY) {
        throw new Error('IDENTITY_PLATFORM_API_KEY not configured');
    }

    const url = `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${IDENTITY_PLATFORM_API_KEY}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber })
    });

    const data = await response.json();

    if (!response.ok) {
        const errorCode = data?.error?.message || 'UNKNOWN_ERROR';
        console.error('[AUDIT] SMS send failed:', errorCode, 'phone:', phoneNumber.slice(-4));
        throw new Error(errorCode);
    }

    console.log('[AUDIT] SMS verification code sent: phone=XXXX' + phoneNumber.slice(-4));
    return data.sessionInfo;
}

/**
 * Verify SMS code via Identity Platform
 * @param {string} sessionInfo - Session token from sendVerificationCode
 * @param {string} code - 6-digit verification code
 * @returns {Promise<{idToken: string, refreshToken: string, localId: string}>}
 */
async function verifyCode(sessionInfo, code) {
    if (!IDENTITY_PLATFORM_API_KEY) {
        throw new Error('IDENTITY_PLATFORM_API_KEY not configured');
    }

    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=${IDENTITY_PLATFORM_API_KEY}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionInfo, code })
    });

    const data = await response.json();

    if (!response.ok) {
        const errorCode = data?.error?.message || 'UNKNOWN_ERROR';
        console.error('[AUDIT] SMS verification failed:', errorCode);
        throw new Error(errorCode);
    }

    return data;
}

// Verify Firebase ID token (called by authMiddleware)
async function verification(token) {
    try {
        return await admin.auth().verifyIdToken(token);
    } catch (error) {
        console.error('Error verifying token:', error.message);
        throw new Error('Invalid or expired token');
    }
}

// Create custom token for a verified user (called after password verification)
async function createCustomToken(uid) {
    try {
        return await admin.auth().createCustomToken(uid);
    } catch (error) {
        console.error('Error creating custom token:', error.message);
        throw new Error('Failed to create authentication token');
    }
}

module.exports = { verification, createCustomToken, sendVerificationCode, verifyCode };
