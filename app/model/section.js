const mongoose = require("mongoose");
const paginate = require("mongoose-paginate-v2");

const { sectionStatuses, sectionTypes } = require("../util/constants");

const { Schema } = mongoose;

const optionSchema = new Schema({
    text: {
        type: String,
        trim: true,
        default: "",
    },
    correct: {
        type: Boolean,
        default: false,
    },
});

const questionSchema = new Schema({
    text: String,
    type: {
        type: String,
        enum: ["single-correct-option", "multiple-correct-options"],
    },
    options: [optionSchema],
});

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
        questions: {
            type: [questionSchema],
            default: null,
        },
    },
    { timestamps: true }
);

sectionSchema.plugin(paginate);

module.exports = mongoose.model("Section", sectionSchema);
