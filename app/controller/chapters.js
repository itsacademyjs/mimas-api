const mongoose = require("mongoose");
const joi = require("joi");
const slugify = require("slugify");
const { v4: uuidv4 } = require("uuid");

const asyncMiddleware = require("../middleware/asyncMiddleware");
const constants = require("../util/constants");
const httpStatus = require("../util/httpStatus");
const Chapter = require("../model/chapter");

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

const toExternal = (chapter) => {
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

const chapterSchema = joi.object({
    title: joi.string().min(16).max(504).required(true),
    description: joi.string().max(1024).required(true),
    brief: joi.string().max(160).required(true),
    languageCode: joi
        .string()
        .valid(...constants.languageCodes)
        .default("en"),
    sections: joi
        .array()
        .items(joi.string().regex(constants.identifierPattern))
        .default([]),
});

const attachRoutes = (router) => {
    router.post(
        "/chapters",
        asyncMiddleware(async (request, response) => {
            const { error, value } = chapterSchema.validate(request.body);

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
            const newCourse = new Chapter({
                ...value,
                creator: request.user._id,
                slug,
                status: "private",
            });
            await newCourse.save();

            response.status(httpStatus.CREATED).json(toExternal(newCourse));
        })
    );

    router.get(
        "/chapters/:id",
        asyncMiddleware(async (request, response) => {
            if (!constants.identifierPattern.test(request.params.id)) {
                response.status(httpStatus.BAD_REQUEST).json({
                    message: "The specified chapter identifier is invalid.",
                });
                return;
            }

            const filters = { _id: request.params.id };
            const chapter = await Chapter.findOne(filters)
                .populate("creator")
                .exec();

            /* We return a 404 error:
             * 1. If we did not find the chapter.
             * 2. Or, we found the chapter, but the current user does not own,
             *    and it is unpublished.
             */
            if (
                !chapter ||
                (!chapter.status === "public" &&
                    !chapter.creator._id.equals(request.user._id))
            ) {
                response.status(httpStatus.NOT_FOUND).json({
                    message:
                        "Cannot find an chapter with the specified identifier.",
                });
                return;
            }

            response.status(httpStatus.OK).json(toExternal(chapter));
        })
    );

    // TODO: If there no images and the chapter is published, it needs to unpublished.
    router.patch(
        "/chapters/:courseId",
        asyncMiddleware(async (request, response) => {
            if (!constants.identifierPattern.test(request.params.courseId)) {
                response.status(httpStatus.BAD_REQUEST).json({
                    message: "The specified chapter identifier is invalid.",
                });
                return;
            }

            const { error, value } = chapterSchema.validate(request.body);
            if (error) {
                response.status(httpStatus.BAD_REQUEST).json({
                    message: error.message,
                });
                return;
            }

            const chapter = await Chapter.findOneAndUpdate(
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

            if (!chapter) {
                response.status(httpStatus.NOT_FOUND).json({
                    message:
                        "An chapter with the specified identifier does not exist.",
                });
                return;
            }

            response.status(httpStatus.OK).json(toExternal(chapter));
        })
    );

    router.patch(
        "/chapters/:courseId/public",
        asyncMiddleware(async (request, response) => {
            const { courseId } = request.params;
            if (!constants.identifierPattern.test(courseId)) {
                response.status(httpStatus.BAD_REQUEST).json({
                    message: "The specified chapter identifier is invalid.",
                });
                return;
            }

            const chapter = await Chapter.findOne({
                _id: courseId,
                creator: request.user._id,
            }).exec();
            if (!chapter) {
                response.status(httpStatus.NOT_FOUND).json({
                    message:
                        "An chapter with the specified identifier does not exist.",
                });
                return;
            }

            // TODO: Check if we can make the chapter public.

            chapter.status = "public";
            await chapter.save();

            response.status(httpStatus.OK).json(toExternal(chapter));
        })
    );

    router.patch(
        "/chapters/:courseId/private",
        asyncMiddleware(async (request, response) => {
            const { courseId } = request.params;
            if (!constants.identifierPattern.test(courseId)) {
                response.status(httpStatus.BAD_REQUEST).json({
                    message: "The specified chapter identifier is invalid.",
                });
                return;
            }

            const chapter = await Chapter.findOneAndUpdate(
                { _id: courseId, creator: request.user._id },
                {
                    status: "private",
                },
                {
                    new: true,
                    lean: true,
                }
            );

            if (!chapter) {
                response.status(httpStatus.NOT_FOUND).json({
                    message:
                        "An chapter with the specified identifier does not exist.",
                });
                return;
            }

            response.status(httpStatus.OK).json(toExternal(chapter));
        })
    );
};

module.exports = {
    attachRoutes,
};
