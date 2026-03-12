import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import sendEmail from './emailService.js';

const signToken = id => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });
};

export const generateOtp = () => {
    return crypto.randomInt(100000, 999999).toString();
};

export const hashOtp = async (otp) => {
    return await bcrypt.hash(otp, 10);
};

export const verifyOtp = async (otp, hashedOtp) => {
    return await bcrypt.compare(otp, hashedOtp);
};

export const sendOtpEmail = async (email, otp, purpose = 'verify your account') => {
    await sendEmail({
        email,
        subject: 'ProClean — Your Verification Code',
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f8f9fc; border-radius: 16px;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <h1 style="color: #4338ca; margin: 0; font-size: 28px;">✨ ProClean</h1>
                </div>
                <div style="background: white; padding: 32px; border-radius: 12px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
                    <p style="color: #64748b; font-size: 14px; margin: 0 0 8px;">Your verification code to ${purpose}:</p>
                    <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1e1b4b; background: #eef2ff; padding: 16px 24px; border-radius: 12px; display: inline-block; margin: 16px 0;">
                        ${otp}
                    </div>
                    <p style="color: #94a3b8; font-size: 12px; margin: 16px 0 0;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
                </div>
            </div>
        `,
    });
};

export const signupUser = async (data) => {
    const otp = generateOtp();
    const hashedOtp = await hashOtp(otp);
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const newUser = await User.create({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role || 'user',
        isVerified: data.role === 'admin',
        otp: hashedOtp,
        otpExpires,
    });
    
    if (data.role !== 'admin') {
        try {
            await sendOtpEmail(data.email, otp, 'verify your account');
        } catch (err) {
            console.error('Failed to send OTP email:', err.message);
        }
    }

    const token = signToken(newUser._id);
    newUser.password = undefined;
    newUser.otp = undefined;
    newUser.otpExpires = undefined;
    return { user: newUser, token };
};

export const loginUser = async (email, password) => {
    if (!email || !password) {
         throw new AppError('Please provide email and password!', 400);
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.correctPassword(password, user.password))) {
         throw new AppError('Incorrect email or password', 401);
    }
    
    const token = signToken(user._id);
    user.password = undefined;
    return { user, token };
};

export const verifyTokenAndGetUser = async (token) => {
    if (!token) {
        throw new AppError('You are not logged in! Please log in to get access.', 401);
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await User.findById(decoded.id);
    
    if (!currentUser) {
        throw new AppError('The user belonging to this token does no longer exist.', 401);
    }
    
    return currentUser;
};
