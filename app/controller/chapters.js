const mongoose = require("mongoose");
const joi = require("joi");
const slugify = require("slugify");

const asyncMiddleware = require("../middleware/asyncMiddleware");
const constants = require("../util/constants");
const httpStatus = require("../util/httpStatus");
const Chapter = require("../model/chapter");
const Course = require("../model/course");
const { runAsTransaction } = require("../util");

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
    };
};

const toExternal = (chapter, extended) => ({
    id: chapter._id,
    title: chapter.title,
    description: chapter.description,
    brief: chapter.brief,
    course: chapter.course,
    creator: chapter.creator,
    slug: chapter.slug,
    sections: extended
        ? chapter.sections.map(toExternalSection)
        : chapter.sections,
    status: chapter.status,
});

const createSchema = joi.object({
    title: joi.string().min(16).max(504).required(true),
    course: joi.string().regex(constants.identifierPattern).required(true),
    description: joi.string().allow("").max(1024),
    brief: joi.string().allow("").max(160),
    sections: joi
        .array()
        .items(joi.string().regex(constants.identifierPattern)),
});

const updateSchema = joi.object({
    title: joi.string().min(16).max(504),
    description: joi.string().allow("").max(1024),
    brief: joi.string().allow("").max(160),
    sections: joi
        .array()
        .items(joi.string().regex(constants.identifierPattern)),
});

const attachRoutes = (router) => {
    router.post(
        "/chapters",
        asyncMiddleware(async (request, response) => {
            const { error, value } = createSchema.validate(request.body, {
                stripUnknown: true,
            });

            if (error) {
                response.status(httpStatus.BAD_REQUEST).json({
                    message: error.message,
                });
                return;
            }

            const id = new Types.ObjectId();
            const slug = `${slugify(value.title, {
                replacement: "-",
                lower: true,
                strict: true,
            })}-${id.toString()}`;
            const newChapter = new Chapter({
                _id: id,
                ...value,
                creator: request.user._id,
                slug,
                status: "private",
            });

            await runAsTransaction(async () => {
                await newChapter.save();
                await Course.findByIdAndUpdate(value.course, {
                    $push: {
                        chapters: id,
                    },
                }).exec();
            });

            response.status(httpStatus.CREATED).json(toExternal(newChapter));
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
        "/chapters/:chapterId",
        asyncMiddleware(async (request, response) => {
            if (!constants.identifierPattern.test(request.params.chapterId)) {
                response.status(httpStatus.BAD_REQUEST).json({
                    message: "The specified chapter identifier is invalid.",
                });
                return;
            }

            const { error, value } = updateSchema.validate(request.body, {
                stripUnknown: true,
            });
            if (error) {
                response.status(httpStatus.BAD_REQUEST).json({
                    message: error.message,
                });
                return;
            }

            const chapter = await Chapter.findOneAndUpdate(
                {
                    _id: new Types.ObjectId(request.params.chapterId),
                    creator: request.user._id,
                },
                value,
                {
                    new: true,
                    lean: true,
                }
            )
                .populate("creator")
                .populate({
                    path: "sections",
                    populate: {
                        path: "creator",
                    },
                })
                .exec();

            if (!chapter) {
                response.status(httpStatus.NOT_FOUND).json({
                    message:
                        "An chapter with the specified identifier does not exist.",
                });
                return;
            }

            response.status(httpStatus.OK).json(toExternal(chapter, true));
        })
    );

    router.patch(
        "/chapters/:chapterId/public",
        asyncMiddleware(async (request, response) => {
            const { chapterId } = request.params;
            if (!constants.identifierPattern.test(chapterId)) {
                response.status(httpStatus.BAD_REQUEST).json({
                    message: "The specified chapter identifier is invalid.",
                });
                return;
            }

            const chapter = await Chapter.findOne({
                _id: chapterId,
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
        "/chapters/:chapterId/private",
        asyncMiddleware(async (request, response) => {
            const { chapterId } = request.params;
            if (!constants.identifierPattern.test(chapterId)) {
                response.status(httpStatus.BAD_REQUEST).json({
                    message: "The specified chapter identifier is invalid.",
                });
                return;
            }

            const chapter = await Chapter.findOneAndUpdate(
                { _id: chapterId, creator: request.user._id },
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
