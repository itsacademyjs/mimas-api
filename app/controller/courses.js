const mongoose = require("mongoose");
const joi = require("joi");
const slugify = require("slugify");
const { v4: uuidv4 } = require("uuid");

const asyncMiddleware = require("../middleware/asyncMiddleware");
const constants = require("../util/constants");
const httpStatus = require("../util/httpStatus");
const Course = require("../model/course");

const { Types } = mongoose;

const toExternalSection = (section) => {
    const { creator } = section;
    return {
        title: section.title,
        description: section.description,
        brief: section.brief,
        creator: {
            id: creator._id,
            firstName: creator.firstName,
            lastName: creator.lastName,
            pictureURL: creator.pictureURL,
        },
        slug: section.slug,
        languageCode: section.languageCode,
        status: section.status,
    };
};

const toExternalChapter = (chapter) => {
    const { creator } = chapter;
    return {
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
        languageCode: chapter.languageCode,
        sections: chapter.sections.map(toExternalSection),
        status: chapter.status,
    };
};

const toExternal = (course) => {
    const { creator } = course;
    return {
        id: course._id,
        title: course.title,
        description: course.description,
        brief: course.brief,
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
        chapters: course.chapters.map(toExternalChapter),
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
    title: joi.string().min(16).max(504).required(true),
    description: joi.string().max(1024).required(true),
    brief: joi.string().max(160).required(true),
    imageURL: joi.string(),
    languageCode: joi
        .string()
        .valid(...constants.languageCodes)
        .default("en"),
    linear: joi.boolean().default(false),
    actualPrice: joi.number().integer().default(0),
    discountedPrice: joi.number().integer().default(0),
    requirements: joi.array().items(joi.string().max(512)).default([]),
    objectives: joi.array().items(joi.string().max(512)).default([]),
    chapters: joi
        .array()
        .items(joi.string().regex(constants.identifierPattern))
        .default([]),
    resources: joi
        .array()
        .items(
            joi.object({
                title: joi.string().max(128),
                icon: joi.string().max(40),
            })
        )
        .default([]),
});

const attachRoutes = (router) => {
    router.post(
        "/courses",
        asyncMiddleware(async (request, response) => {
            const { error, value } = courseSchema.validate(request.body);

            if (error) {
                response.status(httpStatus.BAD_REQUEST).json({
                    message: error.message,
                });
                return;
            }

            const slug = `${slugify(value.title, {
                replacement: "-",
                lower: true,
                strict: true,
            })}-${uuidv4()}`;
            const newCourse = new Course({
                ...value,
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

            const articles = await Course.paginate(filters, {
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
                totalRecords: articles.totalDocs,
                totalPages: articles.totalPages,
                previousPage: articles.prevPage ? articles.prevPage - 1 : -1,
                nextPage: articles.nextPage ? articles.nextPage - 1 : -1,
                hasPreviousPage: articles.hasPrevPage,
                hasNextPage: articles.hasNextPage,
                records: articles.docs.map(toExternal),
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

            const articles = await Course.paginate(filters, {
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
                totalRecords: articles.totalDocs,
                totalPages: articles.totalPages,
                previousPage: articles.prevPage ? articles.prevPage - 1 : -1,
                nextPage: articles.nextPage ? articles.nextPage - 1 : -1,
                hasPreviousPage: articles.hasPrevPage,
                hasNextPage: articles.hasNextPage,
                records: articles.docs.map(toExternal),
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

            const filters = { _id: request.params.id };
            const course = await Course.findOne(filters)
                .populate("creator")
                .exec();

            /* We return a 404 error:
             * 1. If we did not find the course.
             * 2. Or, we found the course, but the current user does not own,
             *    and it is unpublished.
             */
            if (
                !course ||
                (!course.status === "public" &&
                    !course.creator._id.equals(request.user._id))
            ) {
                response.status(httpStatus.NOT_FOUND).json({
                    message:
                        "Cannot find an course with the specified identifier.",
                });
                return;
            }

            response.status(httpStatus.OK).json(toExternal(course));
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

            const { error, value } = courseSchema.validate(request.body);
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
