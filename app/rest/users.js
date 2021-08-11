const { httpStatus } = require("../util");
const { asyncMiddleware } = require("../middleware");
const { users } = require("../controller");

const attachRoutes = (router) => {
    // TODO: Should we implement a transaction here?
    router.post(
        "/users/session",
        asyncMiddleware(async (request, response) => {
            const result = await users.create(request, request.payload);
            response.status(httpStatus.CREATED).json(result);
        })
    );

    router.patch(
        "/users/:userId",
        asyncMiddleware(async (request, response) => {
            const result = await users.update(
                request,
                request.params.userId,
                request.body
            );
            response.status(httpStatus.OK).json(result);
        })
    );

    router.get("/users", async (request, response) => {
        const result = await users.list(request, request.query);
        response.status(httpStatus.OK).json(result);
    });
};

module.exports = {
    attachRoutes,
};
