import User from '../models/User.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import sendResponse from '../utils/sendResponse.js';

export const getAllUsers = catchAsync(async (req, res, next) => {
    const users = await User.find().select('-password');
    
    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: 'Users retrieved successfully',
        data: users,
    });
});

export const updateUserRole = catchAsync(async (req, res, next) => {
    const { role } = req.body;
    
    if (!['user', 'admin'].includes(role)) {
        return next(new AppError('Invalid role specified', 400));
    }
    
    const user = await User.findByIdAndUpdate(
        req.params.id,
        { role },
        { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
        return next(new AppError('No user found with that ID', 404));
    }
    
    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: 'User role updated successfully',
        data: user,
    });
});

export const deleteUser = catchAsync(async (req, res, next) => {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
        return next(new AppError('No user found with that ID', 404));
    }
    
    sendResponse(res, {
        success: true,
        statusCode: 204,
        message: 'User deleted successfully',
        data: null,
    });
});
