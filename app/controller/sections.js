const mongoose = require("mongoose");
const joi = require("joi");
const slugify = require("slugify");

const constants = require("../util/constants");
const { Section, Chapter } = require("../model");
const { BadRequestError, NotFoundError, runAsTransaction } = require("../util");

const { Types } = mongoose;

const toExternal = (section) => ({
    id: section._id.toString(),
    title: section.title,
    type: section.type,
    description: section.description,
    brief: section.brief,
    chapter: section.chapter,
    creator: section.creator,
    slug: section.slug,
    status: section.status,
    content: section.content,
    createdAt: section.createdAt.toISOString(),
    updatedAt: section.updatedAt.toISOString(),
});

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
    const newSection = new Section({
        ...value,
        _id: id,
        creator: context.user._id,
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

    return toExternal(newSection);
};

const getById = async (context, sectionId) => {
    if (!constants.identifierPattern.test(sectionId)) {
        throw new BadRequestError(
            "The specified section identifier is invalid."
        );
    }

    const filters = { _id: sectionId };
    const section = await Section.findOne(filters).exec();

    /* We return a 404 error:
     * 1. If we did not find the section.
     * 2. Or, we found the section, but it is deleted.
     * 3. Or, we found the section, but the current user does not own,
     *    and it is unpublished.
     */
    if (
        !section ||
        section === "deleted" ||
        (section.status !== "public" &&
            !section.creator.equals(context.user._id))
    ) {
        throw new NotFoundError(
            "Cannot find a section with the specified identifier."
        );
    }

    return toExternal(section);
};

const list = async (context, sectionIds) =>
    Section.find({ _id: { $in: sectionIds } }).exec();

// TODO: If there no images and the section is published, it needs to unpublished.
const update = async (context, sectionId, attributes) => {
    if (!constants.identifierPattern.test(sectionId)) {
        throw new BadRequestError(
            "The specified section identifier is invalid."
        );
    }

    const { error, value } = updateSchema.validate(attributes, {
        stripUnknown: true,
    });
    if (error) {
        throw new BadRequestError(error.message);
    }

    const section = await Section.findOneAndUpdate(
        {
            _id: sectionId,
            creator: context.user._id,
            status: {
                $ne: "deleted",
            },
        },
        value,
        {
            new: true,
            lean: true,
        }
    ).exec();

    if (!section) {
        throw new NotFoundError(
            "A section with the specified identifier does not exist."
        );
    }

    return toExternal(section);
};

const publish = async (context, sectionId) => {
    if (!constants.identifierPattern.test(sectionId)) {
        throw new BadRequestError(
            "The specified section identifier is invalid."
        );
    }

    const section = await Section.findOneAndUpdate(
        {
            _id: sectionId,
            creator: context.user._id,
            status: {
                $ne: "deleted",
            },
        },
        {
            status: "public",
        },
        {
            new: true,
            lean: true,
        }
    );

    if (!section) {
        throw new NotFoundError(
            "A section with the specified identifier does not exist."
        );
    }

    return toExternal(section);
};

const unpublish = async (context, sectionId) => {
    if (!constants.identifierPattern.test(sectionId)) {
        throw new BadRequestError(
            "The specified section identifier is invalid."
        );
    }

    const section = await Section.findOneAndUpdate(
        {
            _id: sectionId,
            creator: context.user._id,
            status: {
                $ne: "deleted",
            },
        },
        {
            status: "private",
        },
        {
            new: true,
            lean: true,
        }
    );

    if (!section) {
        throw new NotFoundError(
            "A section with the specified identifier does not exist."
        );
    }

    return toExternal(section);
};

const remove = async (context, sectionId) => {
    if (!constants.identifierPattern.test(sectionId)) {
        throw new BadRequestError(
            "The specified section identifier is invalid."
        );
    }

    const result = runAsTransaction(async () => {
        const section = await Section.findOneAndUpdate(
            {
                _id: sectionId,
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

        await Chapter.findOneAndUpdate(
            {
                _id: section.chapter,
            },
            {
                $pull: {
                    sections: sectionId,
                },
            }
        );

        return section;
    });

    if (!result) {
        throw new NotFoundError(
            "A section with the specified identifier does not exist."
        );
    }

    return true;
};

module.exports = {
    create,
    getById,
    list,
    update,
    publish,
    unpublish,
    remove,
};
