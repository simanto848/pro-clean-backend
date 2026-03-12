import crypto from 'crypto';

// Use a server-side secret to sign CSRF tokens
// This eliminates the need for cookies entirely
const CSRF_SECRET = process.env.JWT_SECRET || 'csrf-fallback-secret';

/**
 * Generate a signed CSRF token.
 * Format: timestamp.randomBytes.signature
 */
function generateCsrfToken() {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(16).toString('hex');
    const payload = `${timestamp}.${random}`;
    const signature = crypto
        .createHmac('sha256', CSRF_SECRET)
        .update(payload)
        .digest('hex');
    return `${payload}.${signature}`;
}

/**
 * Verify a signed CSRF token.
 * Checks signature validity and token age (max 24 hours).
 */
function verifyCsrfToken(token) {
    if (!token) return false;

    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const [timestamp, random, signature] = parts;
    const payload = `${timestamp}.${random}`;

    // Verify signature
    const expectedSignature = crypto
        .createHmac('sha256', CSRF_SECRET)
        .update(payload)
        .digest('hex');

    if (signature !== expectedSignature) return false;

    // Verify token age (24 hours max)
    const tokenTime = parseInt(timestamp, 36);
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    if (Date.now() - tokenTime > maxAge) return false;

    return true;
}

export const csrfProtection = (req, res, next) => {
    // 1. Always send a fresh CSRF token in the response header
    const newToken = generateCsrfToken();
    res.setHeader('X-CSRF-Token', newToken);

    // 2. Skip verification for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    // 3. Verify token for state-changing methods (POST, PUT, PATCH, DELETE)
    const tokenFromHeader = req.headers['x-xsrf-token'];

    if (!verifyCsrfToken(tokenFromHeader)) {
        return res.status(403).json({
            success: false,
            message: 'Invalid or missing CSRF token. Please refresh the page and try again.',
        });
    }

    next();
};
