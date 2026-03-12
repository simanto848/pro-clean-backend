import * as authService from '../services/authService.js';
import { generateOtp, sendOtpEmail, verifyOtp as verifyOtpHash, hashOtp } from '../services/authService.js';
import User from '../models/User.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import sendResponse from '../utils/sendResponse.js';

const sendTokenCookie = (res, token) => {
    const cookieOptions = {
        expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
    };

    res.cookie('jwt', token, cookieOptions);
};

export const signup = catchAsync(async (req, res, next) => {
    const sanitizedBody = {
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        role: 'user',
    };
    const { user, token } = await authService.signupUser(sanitizedBody);
    sendTokenCookie(res, token);

    sendResponse(res, {
        success: true,
        statusCode: 201,
        message: 'Account created. Please verify your email with the OTP sent to your inbox.',
        data: { token, user },
    });
});

export const createAdmin = catchAsync(async (req, res, next) => {
    const adminBody = {
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        role: 'admin',
    };
    
    const { user } = await authService.signupUser(adminBody);
    
    sendResponse(res, {
        success: true,
        statusCode: 201,
        message: 'Admin created successfully',
        data: { user },
    });
});

export const login = catchAsync(async (req, res, next) => {
    const { user, token } = await authService.loginUser(req.body.email, req.body.password);
    sendTokenCookie(res, token);
    
    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: 'Token generated successfully',
        data: { token, user },
    });
});

export const logout = (req, res) => {
    res.cookie('jwt', 'loggedout', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
    });
    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: 'Successfully logged out',
        data: null,
    });
};

export const getMe = (req, res) => {
    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: 'Current user retrieved mapped from cookie',
        data: { user: req.user },
    });
};

// ---- OTP Verification ----

export const verifyOtp = catchAsync(async (req, res, next) => {
    const { otp } = req.body;

    if (!otp) {
        return next(new AppError('Please provide the OTP', 400));
    }

    const user = await User.findById(req.user.id).select('+otp +otpExpires');

    if (!user) {
        return next(new AppError('User not found', 404));
    }

    if (user.isVerified) {
        return sendResponse(res, {
            success: true,
            statusCode: 200,
            message: 'Account is already verified',
            data: { user },
        });
    }

    if (!user.otp || !user.otpExpires) {
        return next(new AppError('No OTP found. Please request a new one.', 400));
    }

    if (user.otpExpires < Date.now()) {
        return next(new AppError('OTP has expired. Please request a new one.', 400));
    }

    const isValid = await verifyOtpHash(otp, user.otp);
    if (!isValid) {
        return next(new AppError('Invalid OTP. Please try again.', 400));
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save({ validateBeforeSave: false });

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: 'Account verified successfully!',
        data: { user },
    });
});

export const resendOtp = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.user.id);

    if (!user) {
        return next(new AppError('User not found', 404));
    }

    if (user.isVerified) {
        return sendResponse(res, {
            success: true,
            statusCode: 200,
            message: 'Account is already verified',
        });
    }

    const otp = generateOtp();
    const hashedOtp = await hashOtp(otp);
    user.otp = hashedOtp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    try {
        await sendOtpEmail(user.email, otp, 'verify your account');
    } catch (err) {
        return next(new AppError('Failed to send OTP email. Please try again later.', 500));
    }

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: 'New OTP sent to your email',
    });
});

// ---- Email Change with OTP ----

export const requestEmailChange = catchAsync(async (req, res, next) => {
    const { newEmail } = req.body;

    if (!newEmail) {
        return next(new AppError('Please provide the new email address', 400));
    }

    // Check if email is already in use
    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser) {
        return next(new AppError('This email is already in use', 400));
    }

    const otp = generateOtp();
    const hashedOtp = await hashOtp(otp);
    const user = await User.findById(req.user.id);

    user.pendingEmail = newEmail;
    user.pendingEmailOtp = hashedOtp;
    user.pendingEmailOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    try {
        await sendOtpEmail(newEmail, otp, 'change your email address');
    } catch (err) {
        return next(new AppError('Failed to send OTP email. Please try again later.', 500));
    }

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: `OTP sent to ${newEmail}`,
    });
});

export const verifyEmailChange = catchAsync(async (req, res, next) => {
    const { otp } = req.body;

    if (!otp) {
        return next(new AppError('Please provide the OTP', 400));
    }

    const user = await User.findById(req.user.id).select('+pendingEmailOtp +pendingEmailOtpExpires');

    if (!user.pendingEmail || !user.pendingEmailOtp) {
        return next(new AppError('No email change request found. Please request one first.', 400));
    }

    if (user.pendingEmailOtpExpires < Date.now()) {
        return next(new AppError('OTP has expired. Please request a new one.', 400));
    }

    const isValid = await verifyOtpHash(otp, user.pendingEmailOtp);
    if (!isValid) {
        return next(new AppError('Invalid OTP. Please try again.', 400));
    }

    user.email = user.pendingEmail;
    user.pendingEmail = undefined;
    user.pendingEmailOtp = undefined;
    user.pendingEmailOtpExpires = undefined;
    await user.save({ validateBeforeSave: false });

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: 'Email updated successfully!',
        data: { user },
    });
});

// ---- Profile Update (name only, email requires OTP) ----

export const updateMe = catchAsync(async (req, res, next) => {
    const { name } = req.body;

    if (!name) {
        return next(new AppError('Please provide a name to update', 400));
    }

    const updatedUser = await User.findByIdAndUpdate(req.user.id, { name }, {
        new: true,
        runValidators: true,
    }).select('-password');

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: 'Profile updated successfully',
        data: { user: updatedUser },
    });
});

export const changePassword = catchAsync(async (req, res, next) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
        return next(new AppError('Please provide current password, new password, and confirmation', 400));
    }

    if (newPassword !== confirmPassword) {
        return next(new AppError('New password and confirmation do not match', 400));
    }

    if (newPassword.length < 6) {
        return next(new AppError('New password must be at least 6 characters', 400));
    }

    const user = await User.findById(req.user.id).select('+password');

    if (!(await user.correctPassword(currentPassword, user.password))) {
        return next(new AppError('Your current password is incorrect', 401));
    }

    user.password = newPassword;
    await user.save();

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: 'Password changed successfully',
    });
});

// ---- Middlewares ----

export const protect = catchAsync(async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
        token = req.cookies.jwt;
    }

    const currentUser = await authService.verifyTokenAndGetUser(token);
    req.user = currentUser;
    next();
});

export const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(new AppError('You do not have permission to perform this action', 403));
        }
        next();
    };
};

export const requireVerified = (req, res, next) => {
    if (!req.user.isVerified) {
        return next(new AppError('Please verify your email before performing this action.', 403));
    }
    next();
};
