import AppError from '../app/utils/AppError.js';

export const notFound = (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
};
