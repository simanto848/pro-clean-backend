import Stripe from 'stripe';
import Booking from '../models/Booking.js';
import Service from '../models/Service.js';
import AppError from '../utils/AppError.js';

export const createBookingSession = async (userId, userEmail, serviceId, bookingDate, timeSlot, domain) => {
    const service = await Service.findById(serviceId);
    if (!service) {
        throw new AppError('No service found with that ID', 404);
    }

    const booking = await Booking.create({
        user: userId,
        service: service.id,
        price: service.price,
        bookingDate,
        timeSlot,
        status: 'pending',
    });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    
    console.log(`Creating stripe session for booking ${booking.id}`);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

    const session = await stripe.checkout.sessions.create({
        success_url: `${frontendUrl}/bookings/success?bookingId=${booking.id}`,
        cancel_url: `${frontendUrl}/bookings/cancel`,
        customer_email: userEmail,
        client_reference_id: booking.id,
        mode: 'payment',
        line_items: [
            {
                price_data: {
                    currency: 'usd',
                    unit_amount: service.price * 100,
                    product_data: {
                        name: `${service.name} Booking`,
                        description: service.description,
                    },
                },
                quantity: 1,
            },
        ],
    });

    booking.stripeSessionId = session.id;
    await booking.save();
    
    return { checkoutUrl: session.url, booking };
};

export const getBookingById = async (id) => {
    const booking = await Booking.findById(id);
    if (!booking) {
        throw new AppError('No booking found with that ID', 404);
    }
    return booking;
};

export const getUserBookings = async (userId) => {
    return await Booking.find({ user: userId }).populate('service', 'name price image');
};

export const getAllBookings = async () => {
    return await Booking.find()
        .populate('user', 'name email')
        .populate('service', 'name price image');
};

export const updateBookingStatus = async (id, status) => {
    const booking = await Booking.findByIdAndUpdate(
        id,
        { status },
        { new: true, runValidators: true }
    );

    if (!booking) {
        throw new AppError('No booking found with that ID', 404);
    }
    return booking;
};
