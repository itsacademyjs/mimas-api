const mongoose = require("mongoose");
const joi = require("joi");
const slugify = require("slugify");
const { v4: uuidv4 } = require("uuid");

const asyncMiddleware = require("../middleware/asyncMiddleware");
const constants = require("../util/constants");
const httpStatus = require("../util/httpStatus");
const Section = require("../model/section");

const { Types } = mongoose;

const toExternal = (section) => {
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

const sectionSchema = joi.object({
    title: joi.string().min(16).max(504).required(true),
    description: joi.string().max(1024).required(true),
    brief: joi.string().max(160).required(true),
    languageCode: joi
        .string()
        .valid(...constants.languageCodes)
        .default("en"),
});

const attachRoutes = (router) => {
    router.post(
        "/sections",
        asyncMiddleware(async (request, response) => {
            const { error, value } = sectionSchema.validate(request.body);

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
            const newCourse = new Section({
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
        "/sections/:courseId",
        asyncMiddleware(async (request, response) => {
            if (!constants.identifierPattern.test(request.params.courseId)) {
                response.status(httpStatus.BAD_REQUEST).json({
                    message: "The specified section identifier is invalid.",
                });
                return;
            }

            const { error, value } = sectionSchema.validate(request.body);
            if (error) {
                response.status(httpStatus.BAD_REQUEST).json({
                    message: error.message,
                });
                return;
            }

            const section = await Section.findOneAndUpdate(
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
        "/sections/:courseId/public",
        asyncMiddleware(async (request, response) => {
            const { courseId } = request.params;
            if (!constants.identifierPattern.test(courseId)) {
                response.status(httpStatus.BAD_REQUEST).json({
                    message: "The specified section identifier is invalid.",
                });
                return;
            }

            const section = await Section.findOne({
                _id: courseId,
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
        "/sections/:courseId/private",
        asyncMiddleware(async (request, response) => {
            const { courseId } = request.params;
            if (!constants.identifierPattern.test(courseId)) {
                response.status(httpStatus.BAD_REQUEST).json({
                    message: "The specified section identifier is invalid.",
                });
                return;
            }

            const section = await Section.findOneAndUpdate(
                { _id: courseId, creator: request.user._id },
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
