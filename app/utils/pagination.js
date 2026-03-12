export const pagination = (defaultLimit = 10) => {
    return (req, res, next) => {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || defaultLimit;
        const skip = (page - 1) * limit;

        req.pagination = {
            page,
            limit,
            skip,
        };

        next();
    };
};

export const paginateResults = (model, query, pagination) => {
    return {
        documents: query.skip(pagination.skip).limit(pagination.limit),
        total: model.countDocuments(query),
    };
};
