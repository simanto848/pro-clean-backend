import * as serviceService from '../services/serviceService.js';
import catchAsync from '../utils/catchAsync.js';
import sendResponse from '../utils/sendResponse.js';

export const getAllServices = catchAsync(async (req, res, next) => {
    const pagination = req.pagination || { skip: 0, limit: 20 };
    const result = await serviceService.getAllServices(pagination);

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: 'Services fetched successfully',
        data: result.services,
        pagination: result.pagination,
    });
});

export const getService = catchAsync(async (req, res, next) => {
    const service = await serviceService.getServiceById(req.params.id);

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: 'Service fetched successfully',
        data: service,
    });
});

export const createService = catchAsync(async (req, res, next) => {
    if (req.file) {
        req.body.image = req.file.path;
    }
    const newService = await serviceService.createService(req.body);

    sendResponse(res, {
        success: true,
        statusCode: 201,
        message: 'Service created successfully',
        data: newService,
    });
});

export const updateService = catchAsync(async (req, res, next) => {
    if (req.file) {
        req.body.image = req.file.path;
    }
    const service = await serviceService.updateService(req.params.id, req.body);

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: 'Service updated successfully',
        data: service,
    });
});

export const deleteService = catchAsync(async (req, res, next) => {
    await serviceService.deleteService(req.params.id);

    sendResponse(res, {
        success: true,
        statusCode: 204,
        message: 'Service deleted successfully',
        data: null,
    });
});

