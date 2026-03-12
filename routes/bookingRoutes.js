import express from 'express';
import {
    createBooking,
    getMyBookings,
    getAllBookings,
    updateBookingStatus,
    bookingSuccess
} from '../app/controllers/bookingController.js';
import { protect, restrictTo, requireVerified } from '../app/controllers/authController.js';

const router = express.Router();

// A public or auth-less route for stripe success redirect
router.get('/success', bookingSuccess);

// Protect all routes below
router.use(protect);

router.post('/', requireVerified, createBooking);
router.get('/my-bookings', getMyBookings);
router.patch('/:id/cancel', updateBookingStatus); // Users can also use this if they own it, but I'll make a more specific one for clarity or just use the same controller with logic.

// Admin only
router.use(restrictTo('admin'));
router.get('/', getAllBookings);
router.patch('/:id/status', updateBookingStatus);

export default router;
