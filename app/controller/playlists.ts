import joi from "joi";

import { Playlist } from "../model";
import { identifierPattern } from "../util/constants";
import { BadRequestError, NotFoundError } from "../util";

const toExternal = (playlist) => {
    const { _id, title, description, courses, status } = playlist;
    return {
        id: _id.toString(),
        title,
        description,
        courses,
        status,
    };
};

const createSchema = joi.object({
    title: joi.string().max(512).allow("").default(""),
    description: joi.string().max(1024).allow("").default(""),
    courses: joi
        .array()
        .items(joi.string().regex(identifierPattern))
        .default([]),
});

const updateSchema = joi.object({
    title: joi.string().max(512).allow(""),
    description: joi.string().max(1024).allow(""),
    courses: joi.array().items(joi.string().regex(identifierPattern)),
});

const create = async (context, attributes) => {
    const { error, value } = createSchema.validate(attributes, {
        stripUnknown: true,
    });

    if (error) {
        throw new BadRequestError(error.message);
    }

    const newPlaylist = new Playlist({
        ...value,
        creator: context.user._id,
        status: "private",
    });
    await newPlaylist.save();

    return toExternal(newPlaylist);
};

const update = async (context, playlistId, attributes) => {
    if (!identifierPattern.test(playlistId)) {
        throw new BadRequestError(
            "The specified playlist identifier is invalid."
        );
    }

    const { error, value } = updateSchema.validate(attributes, {
        stripUnknown: true,
    });
    if (error) {
        throw new BadRequestError(error.message);
    }

    const playlist = await Playlist.findOneAndUpdate(
        {
            _id: playlistId,
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

    if (!playlist) {
        throw new NotFoundError(
            "A playlist with the specified identifier does not exist."
        );
    }

    return toExternal(playlist);
};

export { create, update };
