import { Schema, model } from "mongoose";
import paginate from "mongoose-paginate-v2";

import { playlistStatuses } from "../util/constants";

const playlistSchema = new Schema(
    {
        title: {
            type: String,
            maxlength: 512,
            trim: true,
        },
        description: {
            type: String,
            maxlength: 1024,
            trim: true,
            default: "",
        },
        courses: {
            type: [
                {
                    type: Schema.Types.ObjectId,
                    ref: "Course",
                },
            ],
            default: [],
        },
        creator: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        status: {
            type: String,
            enum: playlistStatuses,
            default: "private",
            required: true,
        },
    },
    { timestamps: true }
);

playlistSchema.plugin(paginate);

export default model("Playlist", playlistSchema);
