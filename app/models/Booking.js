import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: [true, 'Booking must belong to a User!'],
        },
        service: {
            type: mongoose.Schema.ObjectId,
            ref: 'Service',
            required: [true, 'Booking must belong to a Service!'],
        },
        price: {
            type: Number,
            required: [true, 'Booking must have a price.'],
        },
        bookingDate: {
            type: Date,
            required: [true, 'Booking must have a date.'],
        },
        timeSlot: {
            type: String,
            required: [true, 'Booking must have a time slot.'],
        },
        status: {
            type: String,
            enum: ['pending', 'paid', 'completed', 'cancelled'],
            default: 'pending',
        },
        stripeSessionId: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model('Booking', bookingSchema);
