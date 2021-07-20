const Sentry = require("@sentry/node");
const User = require("../model/user");
const httpStatus = require("../util/httpStatus");

const hasRole = (user, roles) => {
    // eslint-disable-next-line no-restricted-syntax
    for (const role of roles) {
        if (user.roles.includes(role)) {
            return true;
        }
    }
    return false;
};

const requireRole = (roles) => async (request, response, next) => {
    try {
        const { emailAddress } = request.payload;
        const user = await User.findOne({ emailAddress }).lean().exec();
        if (!user || !hasRole(user, roles)) {
            response.status(httpStatus.FORBIDDEN).json({
                message: "The requested resource is forbidden.",
            });
            return;
        }

        Sentry.setUser({
            id: user._id,
            email: emailAddress,
            username: user.userName,
            ip_address: "{{auto}}",
        });
        request.user = user;
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = requireRole;
