const asyncMiddleware = (callback) => async (request, response, next) => {
    try {
        await callback(request, response, next);
    } catch (error) {
        next(error);
    }
};

module.exports = asyncMiddleware;
