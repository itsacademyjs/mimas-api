const { asyncMiddleware } = require("../middleware");
const { httpStatus } = require("../util");
const { sections } = require("../controller");

const attachRoutes = (router) => {
    router.post(
        "/sections",
        asyncMiddleware(async (request, response) => {
            const result = await sections.create(request, request.body);
            response.status(httpStatus.CREATED).json(result);
        })
    );

    router.get(
        "/sections/:id",
        asyncMiddleware(async (request, response) => {
            const result = await sections.getById(
                request,
                request.params.id,
                true
            );
            response.status(httpStatus.OK).json(result);
        })
    );

    // TODO: If there no images and the section is published, it needs to unpublished.
    router.patch(
        "/sections/:sectionId",
        asyncMiddleware(async (request, response) => {
            const result = await sections.update(
                request,
                request.params.sectionId,
                request.body
            );
            response.status(httpStatus.OK).json(result);
        })
    );

    router.patch(
        "/sections/:sectionId/public",
        asyncMiddleware(async (request, response) => {
            const result = await sections.publish(
                request,
                request.params.sectionId
            );
            response.status(httpStatus.OK).json(result);
        })
    );

    router.patch(
        "/sections/:sectionId/private",
        asyncMiddleware(async (request, response) => {
            const result = await sections.unpublish(
                request,
                request.params.sectionId
            );
            response.status(httpStatus.OK).json(result);
        })
    );

    router.delete(
        "/sections/:sectionId",
        asyncMiddleware(async (request, response) => {
            await sections.delete(request, request.params.sectionId);
            response.status(httpStatus.OK).json({
                success: true,
            });
        })
    );
};

module.exports = {
    attachRoutes,
};
