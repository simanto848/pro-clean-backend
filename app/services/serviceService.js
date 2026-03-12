import Service from '../models/Service.js';
import AppError from '../utils/AppError.js';

export const getAllServices = async (pagination) => {
    const { skip, limit } = pagination;
    const [services, total] = await Promise.all([
        Service.find().skip(skip).limit(limit),
        Service.countDocuments()
    ]);

    return {
        services,
        pagination: {
            total,
            page: Math.ceil(skip / limit) + 1,
            limit,
            pages: Math.ceil(total / limit),
        }
    };
};

export const getServiceById = async (id) => {
    const service = await Service.findById(id);
    if (!service) {
        throw new AppError('No service found with that ID', 404);
    }
    return service;
};

export const createService = async (data) => {
    return await Service.create(data);
};

export const updateService = async (id, data) => {
    const service = await Service.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true,
    });
    if (!service) {
        throw new AppError('No service found with that ID', 404);
    }
    return service;
};

export const deleteService = async (id) => {
    const service = await Service.findByIdAndDelete(id);
    if (!service) {
        throw new AppError('No service found with that ID', 404);
    }
    return service;
};
