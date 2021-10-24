import type { Document } from "mongoose";

import joi from "joi";

import type { Playlist } from "../types";

import { PlaylistModel } from "../model";
import { identifierPattern } from "../util/constants";
import { BadRequestError, NotFoundError } from "../util";

const toExternal = (playlist: Playlist & Document<any, any, Playlist>) => {
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

    const newPlaylist = new PlaylistModel({
        ...value,
        creator: context.user._id,
        status: "private",
    });
    await newPlaylist.save();

    return toExternal(newPlaylist);
};

const getById = async (context, playlistId) => {
    if (!identifierPattern.test(playlistId)) {
        throw new BadRequestError(
            "The specified playlist identifier is invalid."
        );
    }

    const filters = { _id: playlistId };
    const playlist = await PlaylistModel.findOne(filters).exec();

    /* We return a 404 error:
     * 1. If we did not find the playlist.
     * 2. Or, we found the playlist, but it is deleted.
     * 3. Or, we found the playlist, but the current user does not own,
     *    and it is unpublished.
     */
    if (
        !playlist ||
        playlist.status === "deleted" ||
        (playlist.status !== "public" &&
            !(playlist.creator as any).equals(context.user._id))
    ) {
        throw new NotFoundError(
            "Cannot find a playlist with the specified identifier."
        );
    }

    return toExternal(playlist);
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

    const playlist = await PlaylistModel.findOneAndUpdate(
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

export { create, getById, update };
