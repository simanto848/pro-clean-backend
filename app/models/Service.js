import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'A service must have a name'],
            unique: true,
            trim: true,
        },
        description: {
            type: String,
            required: [true, 'A service must have a description'],
        },
        price: {
            type: Number,
            required: [true, 'A service must have a price'],
        },
        duration: {
            type: Number, // In minutes
            required: [true, 'A service must have a duration (in minutes)'],
        },
        category: {
            type: String,
            enum: ['Standard Cleaning', 'Deep Cleaning', 'Move-In/Move-Out', 'Post-Construction', 'Other'],
            default: 'Standard Cleaning',
        },
        image: {
            type: String,
            default: 'default-service.jpg'
        }
    },
    {
        timestamps: true,
    }
);

export default mongoose.model('Service', serviceSchema);
