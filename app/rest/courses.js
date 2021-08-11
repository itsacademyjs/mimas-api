const { asyncMiddleware } = require("../middleware");
const { httpStatus } = require("../util");
const { courses } = require("../controller");

const attachRoutes = (router) => {
    router.post(
        "/courses",
        asyncMiddleware(async (request, response) => {
            const newCourse = await courses.create(request, request.body);
            response.status(httpStatus.CREATED).json(newCourse);
        })
    );

    router.get(
        "/courses",
        asyncMiddleware(async (request, response) => {
            const result = await courses.list(request, request.query, false);
            response.status(httpStatus.OK).json(result);
        })
    );

    router.get(
        "/courses/public",
        asyncMiddleware(async (request, response) => {
            const result = await courses.list(request, request.query, true);
            response.status(httpStatus.OK).json(result);
        })
    );

    router.get(
        "/courses/:courseId",
        asyncMiddleware(async (request, response) => {
            const course = await courses.getById(
                request,
                request.params.courseId,
                false
            );
            response.status(httpStatus.OK).json(course);
        })
    );

    router.get(
        "/courses/:courseId/public",
        asyncMiddleware(async (request, response) => {
            const course = await courses.getById(
                request,
                request.params.courseId,
                true
            );
            response.status(httpStatus.OK).json(course);
        })
    );

    // TODO: If there no images and the course is published, it needs to unpublished.
    router.patch(
        "/courses/:courseId",
        asyncMiddleware(async (request, response) => {
            const course = await courses.update(
                request,
                request.params.courseId,
                request.body
            );
            response.status(httpStatus.OK).json(course);
        })
    );

    router.patch(
        "/courses/:courseId/public",
        asyncMiddleware(async (request, response) => {
            const course = await courses.publish(
                request,
                request.params.courseId
            );
            response.status(httpStatus.OK).json(course);
        })
    );

    router.patch(
        "/courses/:courseId/private",
        asyncMiddleware(async (request, response) => {
            const course = await courses.unpublish(
                request,
                request.params.courseid
            );
            response.status(httpStatus.OK).json(course);
        })
    );
};

module.exports = {
    attachRoutes,
};
