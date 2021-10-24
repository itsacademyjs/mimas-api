const mongoose = require("mongoose");
const joi = require("joi");
const slugify = require("slugify");

const constants = require("../util/constants");
const { BadRequestError, NotFoundError, runAsTransaction } = require("../util");
const { Course, Chapter, Section } = require("../model");

const { Types } = mongoose;

const toExternal = (course) => ({
    id: course._id.toString(),
    title: course.title,
    description: course.description,
    level: course.level,
    creator: course.creator,
    slug: course.slug,
    imageURL: course.imageURL,
    languageCode: course.languageCode,
    linear: course.linear,
    actualPrice: course.actualPrice,
    discountedPrice: course.discountedPrice,
    requirements: course.requirements,
    objectives: course.objectives,
    targets: course.targets,
    chapters: course.chapters,
    resources: course.resources,
    status: course.status,
    createdAt: course.createdAt.toISOString(),
    updatedAt: course.updatedAt.toISOString(),
});

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
    level: joi.string().valid(...constants.courseLevels),
    imageURL: joi.string().allow(""),
    languageCode: joi.string().valid(...constants.languageCodes),
    linear: joi.boolean(),
    actualPrice: joi.number().integer(),
    discountedPrice: joi.number().integer(),
    requirements: joi.string().max(2048).allow(""),
    objectives: joi.string().max(2048).allow(""),
    targets: joi.string().max(2048).allow(""),
    resources: joi.string().max(2048).allow(""),
    chapters: joi
        .array()
        .items(joi.string().regex(constants.identifierPattern)),
});

const create = async (context, attributes) => {
    const { error, value } = courseSchema.validate(attributes, {
        stripUnknown: true,
    });

    if (error) {
        throw new BadRequestError(error.message);
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
        creator: context.user._id,
        slug,
        status: "private",
    });
    await newCourse.save();

    return toExternal(newCourse);
};

const list = async (context, parameters, privateRequest) => {
    const { error, value } = filterSchema.validate(parameters);
    if (error) {
        throw new BadRequestError(error.message);
    }

    const filters = {
        ...(privateRequest
            ? {
                  creator: context.user._id,
                  status: {
                      $ne: "deleted",
                  },
              }
            : {
                  $and: [
                      {
                          status: "public",
                      },
                      {
                          status: {
                              $ne: "deleted",
                          },
                      },
                  ],
              }),
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
    });

    return {
        totalRecords: courses.totalDocs,
        totalPages: courses.totalPages,
        previousPage: courses.prevPage ? courses.prevPage - 1 : -1,
        nextPage: courses.nextPage ? courses.nextPage - 1 : -1,
        hasPreviousPage: courses.hasPrevPage,
        hasNextPage: courses.hasNextPage,
        records: courses.docs.map(toExternal),
    };
};

const listByIds = async (context, courseIds) => {
    const unorderedCourses = await Course.find({
        _id: { $in: courseIds },
        status: { $ne: "deleted" },
    }).exec();
    const object = {};
    // eslint-disable-next-line no-restricted-syntax
    for (const course of unorderedCourses) {
        object[course._id] = course;
    }
    // eslint-disable-next-line security/detect-object-injection
    const result = courseIds.map((key) => object[key]);
    return result;
};

const getById = async (context, courseId, onlyPublished) => {
    if (!constants.identifierPattern.test(courseId)) {
        throw new BadRequestError(
            "The specified course identifier is invalid."
        );
    }

    const filters = {
        _id: courseId,
        ...(onlyPublished
            ? { status: "public" }
            : { creator: context.user._id }),
        status: { $ne: "deleted" },
    };
    const course = await Course.findOne(filters).exec();

    /* We return a 404 error:
     * 1. If we did not find the course.
     * 2. Or, we found the course, but the current user does not own,
     *    and it is unpublished.
     */
    if (
        !course ||
        (course.status !== "public" && !course.creator.equals(context.user._id))
    ) {
        throw new NotFoundError(
            "Cannot find a course with the specified identifier."
        );
    }

    return toExternal(course);
};

const getBySlug = async (context, slug, onlyPublished) => {
    if (!slug) {
        throw new BadRequestError("The specified slug is empty.");
    }

    const filters = {
        slug,
        ...(onlyPublished
            ? { status: "public" }
            : { creator: context.user._id }),
        status: { $ne: "deleted" },
    };
    const course = await Course.findOne(filters).exec();

    /* We return a 404 error:
     * 1. If we did not find the course.
     * 2. Or, we found the course, but the current user does not own,
     *    and it is unpublished.
     */
    if (
        !course ||
        (course.status !== "public" && !course.creator.equals(context.user._id))
    ) {
        throw new NotFoundError(
            "Cannot find a course with the specified slug."
        );
    }

    return toExternal(course);
};

// TODO: If there no images and the course is published, it needs to unpublished.
const update = async (context, courseId, attributes) => {
    if (!constants.identifierPattern.test(courseId)) {
        throw new BadRequestError(
            "The specified course identifier is invalid."
        );
    }

    const { error, value } = courseSchema.validate(attributes, {
        stripUnknown: true,
    });
    if (error) {
        throw new BadRequestError(error.message);
    }

    const course = await Course.findOneAndUpdate(
        {
            _id: courseId,
            creator: context.user._id,
            status: { $ne: "deleted" },
        },
        value,
        {
            new: true,
            lean: true,
        }
    ).exec();

    if (!course) {
        throw new NotFoundError(
            "A course with the specified identifier does not exist."
        );
    }

    return toExternal(course);
};

const publish = async (context, courseId) => {
    if (!constants.identifierPattern.test(courseId)) {
        throw new BadRequestError(
            "The specified course identifier is invalid."
        );
    }

    const course = await Course.findOneAndUpdate(
        {
            _id: courseId,
            creator: context.user._id,
            status: { $ne: "deleted" },
        },
        {
            status: "public",
        },
        {
            new: true,
            lean: true,
        }
    );

    if (!course) {
        throw new NotFoundError(
            "A course with the specified identifier does not exist."
        );
    }

    return toExternal(course);
};

const unpublish = async (context, courseId) => {
    if (!constants.identifierPattern.test(courseId)) {
        throw new BadRequestError(
            "The specified course identifier is invalid."
        );
    }

    const course = await Course.findOneAndUpdate(
        {
            _id: courseId,
            creator: context.user._id,
            status: { $ne: "deleted" },
        },
        {
            status: "private",
        },
        {
            new: true,
            lean: true,
        }
    );

    if (!course) {
        throw new NotFoundError(
            "A course with the specified identifier does not exist."
        );
    }

    return toExternal(course);
};

/**
 * When a course is deleted, all the chapters and sections associated with it are marked
 * as deleted. However, we do not unlink sections from chapters, and chapters from courses.
 * The idea is to break links backwards, rather than forwards.
 */
const remove = async (context, courseId) => {
    if (!constants.identifierPattern.test(courseId)) {
        throw new BadRequestError(
            "The specified course identifier is invalid."
        );
    }

    const result = runAsTransaction(async () => {
        const course = await Course.findOneAndUpdate(
            {
                _id: courseId,
                creator: context.user._id,
                status: {
                    $ne: "deleted",
                },
            },
            {
                status: "deleted",
            },
            {
                new: true,
                lean: true,
            }
        );

        if (!course) {
            return null;
        }

        await Chapter.updateMany(
            {
                _id: {
                    $in: course.chapters,
                },
                creator: context.user._id,
            },
            {
                status: "deleted",
            },
            {
                new: true,
                lean: true,
            }
        );

        await Section.updateMany(
            {
                chapter: {
                    $in: course.chapters,
                },
                creator: context.user._id,
            },
            {
                status: "deleted",
            },
            {
                new: true,
                lean: true,
            }
        );

        return course;
    });

    if (!result) {
        throw new NotFoundError(
            "A course with the specified identifier does not exist."
        );
    }

    return true;
};

module.exports = {
    create,
    list,
    listByIds,
    getById,
    getBySlug,
    update,
    publish,
    unpublish,
    remove,
};
