const mongoose = require("mongoose");
const joi = require("joi");
const slugify = require("slugify");

const asyncMiddleware = require("../middleware/asyncMiddleware");
const constants = require("../util/constants");
const httpStatus = require("../util/httpStatus");
const Section = require("../model/section");
const Chapter = require("../model/chapter");
const { runAsTransaction } = require("../util");

const { Types } = mongoose;

const toExternal = (section) => {
    const { creator } = section;
    return {
        id: section._id.toString(),
        title: section.title,
        type: section.type,
        description: section.description,
        brief: section.brief,
        chapter: section.chapter,
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

const createSchema = joi.object({
    title: joi.string().min(8).max(504).required(true),
    type: joi
        .string()
        .valid(...constants.sectionTypes)
        .required(true),
    chapter: joi.string().regex(constants.identifierPattern).required(true),
    description: joi.string().allow("").max(1024),
    brief: joi.string().allow("").max(160),
});

// NOTE: The section type cannot be updated once created.
// NOTE: As of now, a section cannot be moved to a different chapter.
const updateSchema = joi.object({
    title: joi.string().min(8).max(504),
    description: joi.string().allow("").max(1024),
    brief: joi.string().allow("").max(160),
    content: joi.string().allow("").max(10240),
});

const attachRoutes = (router) => {
    router.post(
        "/sections",
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
            const newSection = new Section({
                ...value,
                _id: id,
                creator: request.user._id,
                slug,
                status: "private",
            });
            await runAsTransaction(async () => {
                await newSection.save();
                await Chapter.findByIdAndUpdate(value.chapter, {
                    $push: {
                        sections: id,
                    },
                }).exec();
            });

            response.status(httpStatus.CREATED).json(toExternal(newSection));
        })
    );

    router.get(
        "/sections/:id",
        asyncMiddleware(async (request, response) => {
            if (!constants.identifierPattern.test(request.params.id)) {
                response.status(httpStatus.BAD_REQUEST).json({
                    message: "The specified section identifier is invalid.",
                });
                return;
            }

            const filters = { _id: request.params.id };
            const section = await Section.findOne(filters)
                .populate("creator")
                .exec();

            /* We return a 404 error:
             * 1. If we did not find the section.
             * 2. Or, we found the section, but the current user does not own,
             *    and it is unpublished.
             */
            if (
                !section ||
                (!section.status === "public" &&
                    !section.creator._id.equals(request.user._id))
            ) {
                response.status(httpStatus.NOT_FOUND).json({
                    message:
                        "Cannot find an section with the specified identifier.",
                });
                return;
            }

            response.status(httpStatus.OK).json(toExternal(section));
        })
    );

    // TODO: If there no images and the section is published, it needs to unpublished.
    router.patch(
        "/sections/:sectionId",
        asyncMiddleware(async (request, response) => {
            if (!constants.identifierPattern.test(request.params.sectionId)) {
                response.status(httpStatus.BAD_REQUEST).json({
                    message: "The specified section identifier is invalid.",
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

            const section = await Section.findOneAndUpdate(
                {
                    _id: new Types.ObjectId(request.params.sectionId),
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
            console.log(value);

            if (!section) {
                response.status(httpStatus.NOT_FOUND).json({
                    message:
                        "A section with the specified identifier does not exist.",
                });
                return;
            }

            response.status(httpStatus.OK).json(toExternal(section));
        })
    );

    router.patch(
        "/sections/:sectionId/public",
        asyncMiddleware(async (request, response) => {
            const { sectionId } = request.params;
            if (!constants.identifierPattern.test(sectionId)) {
                response.status(httpStatus.BAD_REQUEST).json({
                    message: "The specified section identifier is invalid.",
                });
                return;
            }

            const section = await Section.findOne({
                _id: sectionId,
                creator: request.user._id,
            }).exec();
            if (!section) {
                response.status(httpStatus.NOT_FOUND).json({
                    message:
                        "An section with the specified identifier does not exist.",
                });
                return;
            }

            // TODO: Check if we can make the section public.

            section.status = "public";
            await section.save();

            response.status(httpStatus.OK).json(toExternal(section));
        })
    );

    router.patch(
        "/sections/:sectionId/private",
        asyncMiddleware(async (request, response) => {
            const { sectionId } = request.params;
            if (!constants.identifierPattern.test(sectionId)) {
                response.status(httpStatus.BAD_REQUEST).json({
                    message: "The specified section identifier is invalid.",
                });
                return;
            }

            const section = await Section.findOneAndUpdate(
                { _id: sectionId, creator: request.user._id },
                {
                    status: "private",
                },
                {
                    new: true,
                    lean: true,
                }
            );

            if (!section) {
                response.status(httpStatus.NOT_FOUND).json({
                    message:
                        "An section with the specified identifier does not exist.",
                });
                return;
            }

            response.status(httpStatus.OK).json(toExternal(section));
        })
    );
};

module.exports = {
    attachRoutes,
};
