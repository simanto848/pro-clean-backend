import express from 'express';
import { body, validationResult } from 'express-validator';

import {
    signup,
    login,
    getMe,
    logout,
    protect,
    restrictTo,
    createAdmin,
    updateMe,
    changePassword,
    verifyOtp,
    resendOtp,
    requestEmailChange,
    verifyEmailChange,
} from '../app/controllers/authController.js';

const router = express.Router();

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
};

router.post('/signup', [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    validate
], signup);

router.post('/login', [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
    validate
], login);

router.get('/logout', logout);

router.post('/create-admin', protect, restrictTo('admin'), createAdmin);

router.get('/me', protect, getMe);
router.patch('/update-me', protect, updateMe);
router.patch('/change-password', protect, changePassword);

// OTP verification routes
router.post('/verify-otp', protect, verifyOtp);
router.post('/resend-otp', protect, resendOtp);

// Email change with OTP
router.post('/request-email-change', protect, requestEmailChange);
router.post('/verify-email-change', protect, verifyEmailChange);

export default router;
