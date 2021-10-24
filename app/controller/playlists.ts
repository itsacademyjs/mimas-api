import joi from "joi";

import { Playlist } from "../model";
import { identifierPattern } from "../util/constants";
import { BadRequestError } from "../util";

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

export { create };
