import crypto from 'crypto';

export const csrfProtection = (req, res, next) => {
    // 1. Generate CSRF token if it doesn't exist in cookies
    if (!req.cookies['XSRF-TOKEN']) {
        const csrfToken = crypto.randomBytes(24).toString('hex');
        res.cookie('XSRF-TOKEN', csrfToken, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
        });
        // Also send in header for cross-origin synchronization
        res.setHeader('X-CSRF-Token', csrfToken);
    } else {
        res.setHeader('X-CSRF-Token', req.cookies['XSRF-TOKEN']);
    }

    // 2. Skip verification for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    // 3. Verify token for state-changing methods
    const tokenFromHeader = req.headers['x-xsrf-token'];
    const tokenFromCookie = req.cookies['XSRF-TOKEN'];

    if (!tokenFromHeader || tokenFromHeader !== tokenFromCookie) {
        console.warn(`CSRF Mismatch: Header[${tokenFromHeader}] vs Cookie[${tokenFromCookie}]`);
        return res.status(403).json({
            success: false,
            message: 'Invalid or missing CSRF token. Please refresh the page if the problem persists.',
        });
    }

    next();
};
