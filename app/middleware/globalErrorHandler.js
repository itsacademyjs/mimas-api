const httpStatus = require("../util/httpStatus");

const statusByClassName = {
    BadRequestError: httpStatus.BAD_REQUEST,
    NotFoundError: httpStatus.NOT_FOUND,
};

/* eslint-disable-next-line no-unused-vars */
const globalErrorHandler = (error, request, response, next) => {
    console.log(error.message, error.stack);

    const status = statusByClassName[error.prototype?.constructor?.name];
    if (status) {
        response.status(status).json({
            message: error.message,
        });
        return;
    }

    response.status(httpStatus.INTERNAL_SERVER_ERROR).json({
        message:
            "An internal error occurred. Please try again in a few minutes.",
    });
};

module.exports = globalErrorHandler;
