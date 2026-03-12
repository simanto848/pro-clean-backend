import * as bookingService from '../services/bookingService.js';
import catchAsync from '../utils/catchAsync.js';
import sendResponse from '../utils/sendResponse.js';
import Stripe from 'stripe';
import Booking from '../models/Booking.js';
import User from '../models/User.js';
import sendEmail from '../services/emailService.js';

export const createBooking = catchAsync(async (req, res, next) => {
    const domain = `${req.protocol}://${req.get('host')}`;
    
    const { checkoutUrl, booking } = await bookingService.createBookingSession(
        req.user.id,
        req.user.email,
        req.body.serviceId,
        req.body.bookingDate,
        req.body.timeSlot,
        domain
    );

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: 'Checkout session created successfully',
        data: {
            checkoutUrl,
            booking,
        },
    });
});

export const getMyBookings = catchAsync(async (req, res, next) => {
    const bookings = await bookingService.getUserBookings(req.user.id);

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: 'Bookings fetched successfully',
        data: bookings,
    });
});

export const getAllBookings = catchAsync(async (req, res, next) => {
    const bookings = await bookingService.getAllBookings();

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: 'All bookings fetched successfully',
        data: bookings,
    });
});

export const updateBookingStatus = catchAsync(async (req, res, next) => {
    const bookingId = req.params.id;
    const { status } = req.body;

    // Ownership check for non-admins
    if (req.user.role !== 'admin') {
        const booking = await bookingService.getBookingById(bookingId);
        if (booking.user.toString() !== req.user.id) {
            return next(new AppError('You do not have permission to update this booking', 403));
        }
        if (status !== 'cancelled') {
            return next(new AppError('Users can only cancel their own bookings', 403));
        }
    }

    const booking = await bookingService.updateBookingStatus(bookingId, status);

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: `Booking status updated to ${status} successfully`,
        data: booking,
    });
});

// Verify Stripe payment, mark as paid, and send confirmation email
export const bookingSuccess = catchAsync(async (req, res, next) => {
    const { bookingId } = req.query;

    if (!bookingId) {
        return sendResponse(res, {
            success: false,
            statusCode: 400,
            message: 'Missing bookingId parameter',
        });
    }

    const booking = await Booking.findById(bookingId).populate('service');

    if (!booking) {
        return sendResponse(res, {
            success: false,
            statusCode: 404,
            message: 'Booking not found',
        });
    }

    // If already paid, skip verification
    if (booking.status === 'paid') {
        return sendResponse(res, {
            success: true,
            statusCode: 200,
            message: 'Booking already marked as paid',
            data: booking,
        });
    }

    // Verify payment with Stripe if session ID exists
    if (booking.stripeSessionId) {
        try {
            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
            const session = await stripe.checkout.sessions.retrieve(booking.stripeSessionId);

            if (session.payment_status === 'paid') {
                booking.status = 'paid';
                await booking.save();

                // Send confirmation email
                const user = await User.findById(booking.user);
                if (user) {
                    try {
                        await sendEmail({
                            email: user.email,
                            subject: 'ProClean — Booking Confirmed! 🎉',
                            html: `
                                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #f8f9fc; border-radius: 16px;">
                                    <div style="text-align: center; margin-bottom: 24px;">
                                        <h1 style="color: #4338ca; margin: 0; font-size: 28px;">✨ ProClean</h1>
                                    </div>
                                    <div style="background: white; padding: 32px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
                                        <h2 style="color: #1e1b4b; margin: 0 0 8px;">Thank you, ${user.name}!</h2>
                                        <p style="color: #64748b; font-size: 14px; margin: 0 0 20px;">Your booking has been confirmed and paid successfully.</p>
                                        <div style="background: #eef2ff; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                                            <p style="margin: 4px 0; font-size: 14px;"><strong>Service:</strong> ${booking.service?.name || 'N/A'}</p>
                                            <p style="margin: 4px 0; font-size: 14px;"><strong>Amount:</strong> $${booking.price}</p>
                                            <p style="margin: 4px 0; font-size: 14px;"><strong>Date:</strong> ${booking.bookingDate || 'TBD'}</p>
                                            <p style="margin: 4px 0; font-size: 14px;"><strong>Time:</strong> ${booking.timeSlot || 'TBD'}</p>
                                            <p style="margin: 4px 0; font-size: 12px; color: #94a3b8;"><strong>ID:</strong> ${booking._id}</p>
                                        </div>
                                        <p style="color: #64748b; font-size: 13px; margin: 0;">We look forward to serving you!</p>
                                    </div>
                                </div>
                            `,
                        });
                    } catch (emailErr) {
                        console.error('Failed to send booking confirmation email:', emailErr.message);
                    }
                }

                return sendResponse(res, {
                    success: true,
                    statusCode: 200,
                    message: 'Payment verified and booking marked as paid',
                    data: booking,
                });
            }
        } catch (err) {
            console.error('Stripe session verification failed:', err.message);
        }
    }

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: 'Booking found but payment not yet confirmed',
        data: booking,
    });
});


