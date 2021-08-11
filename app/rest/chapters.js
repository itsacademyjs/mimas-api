const { asyncMiddleware } = require("../middleware");
const { httpStatus } = require("../util");
const { chapters } = require("../controller");

const attachRoutes = (router) => {
    router.post(
        "/chapters",
        asyncMiddleware(async (request, response) => {
            const newChapter = await chapters.create(request, request.body);
            response.status(httpStatus.CREATED).json(newChapter);
        })
    );

    router.get(
        "/chapters/:chapterId",
        asyncMiddleware(async (request, response) => {
            const chapter = await chapters.getById(
                request,
                request.params.id,
                false
            );
            response.status(httpStatus.OK).json(chapter);
        })
    );

    // TODO: If there no images and the chapter is published, it needs to unpublished.
    router.patch(
        "/chapters/:chapterId",
        asyncMiddleware(async (request, response) => {
            const chapter = await chapters.update(
                request,
                request.params.chapterId,
                request.body
            );
            response.status(httpStatus.OK).json(chapter);
        })
    );

    router.patch(
        "/chapters/:chapterId/public",
        asyncMiddleware(async (request, response) => {
            const chapter = await chapters.publish(
                request,
                request.params.chapterId
            );
            response.status(httpStatus.OK).json(chapter);
        })
    );

    router.patch(
        "/chapters/:chapterId/private",
        asyncMiddleware(async (request, response) => {
            const chapter = await chapters.unpublish(
                request,
                request.params.chapterId
            );
            response.status(httpStatus.OK).json(chapter);
        })
    );
};

module.exports = {
    attachRoutes,
};
