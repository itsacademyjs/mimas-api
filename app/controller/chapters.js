const mongoose = require("mongoose");
const joi = require("joi");
const slugify = require("slugify");

const constants = require("../util/constants");
const { BadRequestError, NotFoundError, runAsTransaction } = require("../util");
const { Chapter, Course, Section } = require("../model");

const { Types } = mongoose;

const toExternal = (chapter) => ({
    id: chapter._id,
    title: chapter.title,
    description: chapter.description,
    course: chapter.course,
    creator: chapter.creator,
    slug: chapter.slug,
    sections: chapter.sections,
    status: chapter.status,
});

const createSchema = joi.object({
    title: joi.string().min(16).max(504).required(true),
    course: joi.string().regex(constants.identifierPattern).required(true),
    description: joi.string().allow("").max(1024),
    sections: joi
        .array()
        .items(joi.string().regex(constants.identifierPattern)),
});

const updateSchema = joi.object({
    title: joi.string().min(16).max(504),
    description: joi.string().allow("").max(1024),
    sections: joi
        .array()
        .items(joi.string().regex(constants.identifierPattern)),
});

const create = async (context, attributes) => {
    const { error, value } = createSchema.validate(attributes, {
        stripUnknown: true,
    });

    if (error) {
        throw new BadRequestError(error.message);
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
        creator: context.user._id,
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

    return toExternal(newChapter);
};

const list = async (context, chapterIds) => {
    const unorderedChapters = await Chapter.find({
        _id: { $in: chapterIds },
        status: { $ne: "deleted" },
    }).exec();
    const object = {};
    // eslint-disable-next-line no-restricted-syntax
    for (const section of unorderedChapters) {
        object[section._id] = section;
    }
    // eslint-disable-next-line security/detect-object-injection
    const result = chapterIds.map((key) => object[key]);
    return result;
};

const getById = async (context, chapterId) => {
    if (!constants.identifierPattern.test(chapterId)) {
        throw new BadRequestError(
            "The specified chapter identifier is invalid."
        );
    }

    const filters = { _id: chapterId, status: { $ne: "deleted" } };
    const chapter = await Chapter.findOne(filters).exec();

    /* We return a 404 error:
     * 1. If we did not find the chapter.
     * 2. Or, we found the chapter, but the current user does not own,
     *    and it is unpublished.
     */
    if (
        !chapter ||
        (chapter.status !== "public" &&
            !chapter.creator.equals(context.user._id))
    ) {
        throw new NotFoundError(
            "Cannot find a chapter with the specified identifier."
        );
    }

    return toExternal(chapter);
};

const getBySlug = async (context, slug) => {
    const filters = { slug, status: { $ne: "deleted " } };
    const chapter = await Chapter.findOne(filters).exec();

    /* We return a 404 error:
     * 1. If we did not find the chapter.
     * 2. Or, we found the chapter, but the current user does not own,
     *    and it is unpublished.
     */
    if (
        !chapter ||
        (chapter.status !== "public" &&
            !chapter.creator.equals(context.user._id))
    ) {
        throw new NotFoundError(
            "Cannot find a chapter with the specified identifier."
        );
    }

    return toExternal(chapter);
};

// TODO: If there no images and the chapter is published, it needs to unpublished.
const update = async (context, chapterId, attributes) => {
    if (!constants.identifierPattern.test(chapterId)) {
        throw new BadRequestError(
            "The specified chapter identifier is invalid."
        );
    }

    const { error, value } = updateSchema.validate(attributes, {
        stripUnknown: true,
    });
    if (error) {
        throw new BadRequestError(error.message);
    }

    const chapter = await Chapter.findOneAndUpdate(
        {
            _id: chapterId,
            creator: context.user._id,
            status: { $ne: "deleted" },
        },
        value,
        {
            new: true,
            lean: true,
        }
    ).exec();

    if (!chapter) {
        throw new NotFoundError(
            "A chapter with the specified identifier does not exist."
        );
    }

    return toExternal(chapter);
};

const publish = async (context, chapterId) => {
    if (!constants.identifierPattern.test(chapterId)) {
        throw new BadRequestError(
            "The specified chapter identifier is invalid."
        );
    }

    const chapter = await Chapter.findOneAndUpdate(
        {
            _id: chapterId,
            creator: context.user._id,
            status: { $ne: "deleted " },
        },
        {
            status: "public",
        },
        {
            new: true,
            lean: true,
        }
    );

    if (!chapter) {
        throw new NotFoundError(
            "A chapter with the specified identifier does not exist."
        );
    }

    return toExternal(chapter);
};

const unpublish = async (context, chapterId) => {
    if (!constants.identifierPattern.test(chapterId)) {
        throw new BadRequestError(
            "The specified chapter identifier is invalid."
        );
    }

    const chapter = await Chapter.findOneAndUpdate(
        {
            _id: chapterId,
            creator: context.user._id,
            status: { $ne: "deleted " },
        },
        {
            status: "private",
        },
        {
            new: true,
            lean: true,
        }
    );

    if (!chapter) {
        throw new NotFoundError(
            "A chapter with the specified identifier does not exist."
        );
    }

    return toExternal(chapter);
};

/**
 * When a chapter is deleted, all the sections associated with it are marked as deleted.
 * We unlink the chapter from the course, but do not unlink sections from the chapter.
 * The idea is to break links backwards, rather than forwards.
 */
const remove = async (context, chapterId) => {
    if (!constants.identifierPattern.test(chapterId)) {
        throw new BadRequestError(
            "The specified chapter identifier is invalid."
        );
    }

    const result = runAsTransaction(async () => {
        const chapter = await Chapter.findOneAndUpdate(
            {
                _id: chapterId,
                creator: context.user._id,
                status: { $ne: "deleted " },
            },
            {
                status: "deleted",
            },
            {
                new: true,
                lean: true,
            }
        );

        if (!chapter) {
            return null;
        }

        await Section.updateMany(
            {
                chapter: chapter._id,
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

        await Course.findOneAndUpdate(
            {
                _id: chapter.course,
            },
            {
                $pull: {
                    chapters: chapterId,
                },
            }
        );

        return chapter;
    });

    if (!result) {
        throw new NotFoundError(
            "A chapter with the specified identifier does not exist."
        );
    }

    return true;
};

module.exports = {
    create,
    list,
    getById,
    getBySlug,
    update,
    publish,
    unpublish,
    remove,
};
