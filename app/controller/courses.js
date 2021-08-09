const mongoose = require("mongoose");
const joi = require("joi");
const slugify = require("slugify");

const asyncMiddleware = require("../middleware/asyncMiddleware");
const constants = require("../util/constants");
const httpStatus = require("../util/httpStatus");
const Course = require("../model/course");

const { Types } = mongoose;

const toExternalSection = (section) => {
    const { creator } = section;
    return {
        id: section._id.toString(),
        title: section.title,
        description: section.description,
        brief: section.brief,
        type: section.type,
        creator: {
            id: creator._id,
            firstName: creator.firstName,
            lastName: creator.lastName,
            pictureURL: creator.pictureURL,
        },
        slug: section.slug,
        status: section.status,
        content: section.content,
        createdAt: section.createdAt.toISOString(),
        updatedAt: section.updatedAt.toISOString(),
    };
};

const toExternalChapter = (chapter) => {
    const { creator } = chapter;
    return {
        id: chapter._id.toString(),
        title: chapter.title,
        description: chapter.description,
        brief: chapter.brief,
        creator: {
            id: creator._id,
            firstName: creator.firstName,
            lastName: creator.lastName,
            pictureURL: creator.pictureURL,
        },
        slug: chapter.slug,
        sections: chapter.sections.map(toExternalSection),
        status: chapter.status,
        createdAt: chapter.createdAt.toISOString(),
        updatedAt: chapter.updatedAt.toISOString(),
    };
};

const toExternal = (course, extended) => {
    const { creator } = course;
    return {
        id: course._id.toString(),
        title: course.title,
        description: course.description,
        brief: course.brief,
        level: course.level,
        creator: {
            id: creator._id,
            firstName: creator.firstName,
            lastName: creator.lastName,
            pictureURL: creator.pictureURL,
        },
        slug: course.slug,
        imageURL: course.imageURL,
        languageCode: course.languageCode,
        linear: course.linear,
        actualPrice: course.actualPrice,
        discountedPrice: course.discountedPrice,
        requirements: course.requirements,
        objectives: course.objectives,
        targets: course.targets,
        chapters: extended
            ? course.chapters.map(toExternalChapter)
            : course.chapters,
        resources: course.resources,
        status: course.status,
        createdAt: course.createdAt.toISOString(),
        updatedAt: course.updatedAt.toISOString(),
    };
};

const filterSchema = joi.object({
    page: joi.number().integer().default(0),
    limit: joi
        .number()
        .integer()
        .min(constants.paginateMinLimit)
        .max(constants.paginateMaxLimit)
        .default(constants.paginateMinLimit),
});

const courseSchema = joi.object({
    title: joi.string().max(504).allow(""),
    description: joi.string().max(1024).allow(""),
    brief: joi.string().max(160).allow(""),
    level: joi.string().valid(...constants.courseLevels),
    imageURL: joi.string().allow(""),
    languageCode: joi.string().valid(...constants.languageCodes),
    linear: joi.boolean(),
    actualPrice: joi.number().integer(),
    discountedPrice: joi.number().integer(),
    requirements: joi.array().items(joi.string().max(512)),
    objectives: joi.array().items(joi.string().max(512)),
    targets: joi.array().items(joi.string().max(512)),
    chapters: joi
        .array()
        .items(joi.string().regex(constants.identifierPattern)),
    resources: joi.array().items(joi.string().max(512)),
});

const attachRoutes = (router) => {
    router.post(
        "/courses",
        asyncMiddleware(async (request, response) => {
            const { error, value } = courseSchema.validate(request.body, {
                stripUnknown: true,
            });

            if (error) {
                response.status(httpStatus.BAD_REQUEST).json({
                    message: error.message,
                });
                return;
            }

            const id = new Types.ObjectId();
            const slug = value.title
                ? `${slugify(value.title, {
                      replacement: "-",
                      lower: true,
                      strict: true,
                  })}-${id.toString()}`
                : id.toString();
            const newCourse = new Course({
                ...value,
                _id: id,
                creator: request.user._id,
                slug,
                status: "private",
            });
            await newCourse.save();
            console.log(` ✅ New course with slug ${slug} saved to database.`);

            response.status(httpStatus.CREATED).json(toExternal(newCourse));
        })
    );

    router.get(
        "/courses",
        asyncMiddleware(async (request, response) => {
            const { query } = request;
            const parameters = {
                page: query.page,
                limit: query.limit,
            };
            const { error, value } = filterSchema.validate(parameters);
            if (error) {
                response.status(httpStatus.BAD_REQUEST).json({
                    message: error.message,
                });
                return;
            }

            const filters = {
                creator: request.user._id,
            };
            const { page, limit } = value;

            const courses = await Course.paginate(filters, {
                limit,
                page: page + 1,
                lean: true,
                leanWithId: true,
                pagination: true,
                sort: {
                    updatedAt: -1,
                },
                populate: ["creator"],
            });

            response.status(httpStatus.OK).json({
                totalRecords: courses.totalDocs,
                totalPages: courses.totalPages,
                previousPage: courses.prevPage ? courses.prevPage - 1 : -1,
                nextPage: courses.nextPage ? courses.nextPage - 1 : -1,
                hasPreviousPage: courses.hasPrevPage,
                hasNextPage: courses.hasNextPage,
                records: courses.docs.map((item) => toExternal(item, false)),
            });
        })
    );

    router.get(
        "/courses/public",
        asyncMiddleware(async (request, response) => {
            const { query } = request;
            const parameters = {
                page: query.page,
                limit: query.limit,
            };
            const { error, value } = filterSchema.validate(parameters);
            if (error) {
                response.status(httpStatus.BAD_REQUEST).json({
                    message: error.message,
                });
                return;
            }

            const filters = {
                status: "public",
            };
            const { page, limit } = value;

            const courses = await Course.paginate(filters, {
                limit,
                page: page + 1,
                lean: true,
                leanWithId: true,
                pagination: true,
                sort: {
                    updatedAt: -1,
                },
                populate: ["creator", "chapters"],
            });

            response.status(httpStatus.OK).json({
                totalRecords: courses.totalDocs,
                totalPages: courses.totalPages,
                previousPage: courses.prevPage ? courses.prevPage - 1 : -1,
                nextPage: courses.nextPage ? courses.nextPage - 1 : -1,
                hasPreviousPage: courses.hasPrevPage,
                hasNextPage: courses.hasNextPage,
                records: courses.docs.map((course) =>
                    toExternal(course, false)
                ),
            });
        })
    );

    router.get(
        "/courses/:id",
        asyncMiddleware(async (request, response) => {
            if (!constants.identifierPattern.test(request.params.id)) {
                response.status(httpStatus.BAD_REQUEST).json({
                    message: "The specified course identifier is invalid.",
                });
                return;
            }

            const filters = {
                _id: request.params.id,
                creator: request.user._id,
            };
            const course = await Course.findOne(filters)
                .populate("creator")
                .populate({
                    path: "chapters",
                    populate: {
                        path: "sections",
                    },
                })
                .exec();

            /* We return a 404 error:
             * 1. If we did not find the course.
             * 2. Or, we found the course, but the current user does not own,
             *    and it is unpublished.
             */
            if (!course) {
                response.status(httpStatus.NOT_FOUND).json({
                    message:
                        "Cannot find an course with the specified identifier.",
                });
                return;
            }

            response.status(httpStatus.OK).json(toExternal(course, true));
        })
    );

    router.get(
        "/courses/:id/public",
        asyncMiddleware(async (request, response) => {
            if (!constants.identifierPattern.test(request.params.id)) {
                response.status(httpStatus.BAD_REQUEST).json({
                    message: "The specified course identifier is invalid.",
                });
                return;
            }

            const filters = { _id: request.params.id, status: "public" };
            const course = await Course.findOne(filters)
                .populate("creator")
                .populate({
                    path: "chapters",
                    populate: {
                        path: "sections",
                    },
                })
                .exec();

            /* We return a 404 error:
             * 1. If we did not find the course.
             * 2. Or, we found the course, but the current user does not own,
             *    and it is unpublished.
             */
            if (!course) {
                response.status(httpStatus.NOT_FOUND).json({
                    message:
                        "Cannot find an course with the specified identifier.",
                });
                return;
            }

            response.status(httpStatus.OK).json(toExternal(course, true));
        })
    );

    // TODO: If there no images and the course is published, it needs to unpublished.
    router.patch(
        "/courses/:courseId",
        asyncMiddleware(async (request, response) => {
            if (!constants.identifierPattern.test(request.params.courseId)) {
                response.status(httpStatus.BAD_REQUEST).json({
                    message: "The specified course identifier is invalid.",
                });
                return;
            }

            const { error, value } = courseSchema.validate(request.body, {
                stripUnknown: true,
            });
            if (error) {
                response.status(httpStatus.BAD_REQUEST).json({
                    message: error.message,
                });
                return;
            }

            const course = await Course.findOneAndUpdate(
                {
                    _id: new Types.ObjectId(request.params.courseId),
                    creator: request.user._id,
                },
                value,
                {
                    new: true,
                    lean: true,
                }
            )
                .populate("creator")
                .populate("chapters")
                .exec();

            if (!course) {
                response.status(httpStatus.NOT_FOUND).json({
                    message:
                        "An course with the specified identifier does not exist.",
                });
                return;
            }

            response.status(httpStatus.OK).json(toExternal(course));
        })
    );

    router.patch(
        "/courses/:courseId/public",
        asyncMiddleware(async (request, response) => {
            const { courseId } = request.params;
            if (!constants.identifierPattern.test(courseId)) {
                response.status(httpStatus.BAD_REQUEST).json({
                    message: "The specified course identifier is invalid.",
                });
                return;
            }

            const course = await Course.findOne({
                _id: courseId,
                creator: request.user._id,
            }).exec();
            if (!course) {
                response.status(httpStatus.NOT_FOUND).json({
                    message:
                        "An course with the specified identifier does not exist.",
                });
                return;
            }

            // TODO: Check if we can make the course public.

            course.status = "public";
            await course.save();

            response.status(httpStatus.OK).json(toExternal(course));
        })
    );

    router.patch(
        "/courses/:courseId/private",
        asyncMiddleware(async (request, response) => {
            const { courseId } = request.params;
            if (!constants.identifierPattern.test(courseId)) {
                response.status(httpStatus.BAD_REQUEST).json({
                    message: "The specified course identifier is invalid.",
                });
                return;
            }

            const course = await Course.findOneAndUpdate(
                { _id: courseId, creator: request.user._id },
                {
                    status: "private",
                },
                {
                    new: true,
                    lean: true,
                }
            );

            if (!course) {
                response.status(httpStatus.NOT_FOUND).json({
                    message:
                        "An course with the specified identifier does not exist.",
                });
                return;
            }

            response.status(httpStatus.OK).json(toExternal(course));
        })
    );
};

module.exports = {
    attachRoutes,
};
