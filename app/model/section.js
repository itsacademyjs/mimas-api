const mongoose = require("mongoose");
const paginate = require("mongoose-paginate-v2");

const { sectionStatuses, sectionTypes } = require("../util/constants");

const { Schema } = mongoose;

const sectionSchema = new Schema(
    {
        title: {
            type: String,
            minlength: 8,
            maxlength: 504,
            default: "",
            trim: true,
        },
        type: {
            type: String,
            enum: sectionTypes,
            default: "article",
            required: true,
        },
        description: {
            type: String,
            maxlength: 1024,
            default: "",
            trim: true,
        },
        content: {
            type: String,
            maxlength: 10240,
            default: "",
            trim: true,
        },
        chapter: {
            type: Schema.Types.ObjectId,
            ref: "Chapter",
            required: true,
        },
        creator: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        slug: {
            type: String,
            trim: true,
            required: true,
        },
        status: {
            type: String,
            enum: sectionStatuses,
            default: "private",
            required: true,
        },
    },
    { timestamps: true }
);

sectionSchema.plugin(paginate);

module.exports = mongoose.model("Section", sectionSchema);
