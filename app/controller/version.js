const attachRoutes = (router) => {
    router.get("/version", (request, response) => {
        response.json({
            /* The current version of the REST API. */
            version: process.env.CURRENT_API_VERSION,
        });
    });
};

module.exports = {
    attachRoutes,
};
