import express from 'express';
import Stripe from 'stripe';
import Booking from '../app/models/Booking.js';
import User from '../app/models/User.js';
import Service from '../app/models/Service.js';
import sendEmail from '../app/services/emailService.js';

const router = express.Router();

const fulfillBooking = async (session) => {
    const bookingId = session.client_reference_id;
    const userEmail = session.customer_email;

    // Update booking status
    const booking = await Booking.findByIdAndUpdate(
        bookingId,
        { status: 'paid' },
        { new: true }
    ).populate('service', 'name');

    // Fetch user for name (optional but good for email)
    const user = await User.findById(booking.user);

    // Send confirmation email
    if (booking && userEmail) {
        const emailOptions = {
            email: userEmail,
            subject: 'Service Maker - Booking Confirmation',
            html: `
                <h1>Thank you for your booking, ${user ? user.name : 'Customer'}!</h1>
                <p>Your booking for <strong>${booking.service.name}</strong> has been confirmed and paid successfully.</p>
                <p>Booking ID: ${booking._id}</p>
                <br/>
                <p>We look forward to serving you!</p>
            `,
        };

        try {
            await sendEmail(emailOptions);
            console.log('Confirmation email sent successfully.');
        } catch (err) {
            console.error('Error sending confirmation email:', err);
        }
    }
};

// Webhook endpoint
// NOTE: Must use raw body for Signature Verification, so the global express.json() shouldn't apply here.
router.post(
    '/',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
        const sig = req.headers['stripe-signature'];
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

        let event;

        try {
            event = stripe.webhooks.constructEvent(
                req.body,
                sig,
                process.env.STRIPE_WEBHOOK_SECRET // Optional but recommended security measure, user needs to set this
            );
        } catch (err) {
            console.error(`Webhook signature verification failed: ${err.message}`);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        // Handle the event
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            
            try {
               await fulfillBooking(session);
            } catch(error) {
               console.error('Error fulfilling booking:', error);
            }
        }

        res.status(200).json({ received: true });
    }
);

export default router;
