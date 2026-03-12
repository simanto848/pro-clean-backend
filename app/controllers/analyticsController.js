import Booking from '../models/Booking.js';
import Service from '../models/Service.js';
import catchAsync from '../utils/catchAsync.js';
import sendResponse from '../utils/sendResponse.js';

export const getDashboardAnalytics = catchAsync(async (req, res, next) => {
    const totalBookings = await Booking.countDocuments();
    
    // Calculate total revenue from completed/paid bookings
    const revenueQuery = await Booking.aggregate([
        { $match: { status: { $in: ['paid', 'completed'] } } },
        { $group: { _id: null, totalRevenue: { $sum: '$price' } } }
    ]);
    const totalRevenue = revenueQuery.length > 0 ? revenueQuery[0].totalRevenue : 0;

    // Calculate revenue trend over last 6 months (mock-friendly)
    // For this demonstration, we'll aggregate by month based on createdAt
    const monthlyRevenue = await Booking.aggregate([
        { $match: { status: { $in: ['paid', 'completed'] } } },
        { 
            $group: { 
                _id: { $month: "$createdAt" }, 
                revenue: { $sum: "$price" } 
            } 
        },
        { $sort: { _id: 1 } }
    ]);

    // Popular services
    const popularServices = await Booking.aggregate([
        { $group: { _id: "$service", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 4 },
        { $lookup: { from: 'services', localField: '_id', foreignField: '_id', as: 'serviceDetails' } },
        { $unwind: "$serviceDetails" },
        { $project: { _id: 0, name: "$serviceDetails.name", bookings: "$count" } }
    ]);

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: 'Analytics fetched successfully',
        data: {
            totalBookings,
            totalRevenue,
            monthlyRevenue: monthlyRevenue.map(m => ({ month: m._id, revenue: m.revenue })),
            popularServices
        },
    });
});
