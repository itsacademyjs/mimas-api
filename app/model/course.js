const mongoose = require("mongoose");
const paginate = require("mongoose-paginate-v2");

const {
    languageCodes,
    courseStatuses,
    courseLevels,
} = require("../util/constants");

const { Schema } = mongoose;

const courseSchema = new Schema(
    {
        title: {
            type: String,
            maxlength: 504,
            default: null,
            trim: true,
        },
        description: {
            type: String,
            maxlength: 1024,
            default: null,
            trim: true,
        },
        brief: {
            type: String,
            maxlength: 160,
            default: null,
            trim: true,
        },
        level: {
            type: String,
            enum: courseLevels,
            default: "all_levels",
        },
        creator: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        slug: {
            type: String,
            trim: true,
            // unique: true,
            // required: true,
        },
        imageURL: {
            type: String,
            trim: true,
            default: null,
        },
        languageCode: {
            type: String,
            enum: languageCodes,
            default: "en",
        },
        linear: {
            type: Boolean,
            default: false,
        },
        actualPrice: {
            type: Number,
            default: 0,
            integer: true,
            get: (value) => Math.round(value),
            set: (value) => Math.round(value),
        },
        discountedPrice: {
            type: Number,
            default: 0,
            integer: true,
            get: (value) => Math.round(value),
            set: (value) => Math.round(value),
        },
        requirements: {
            type: String,
            maxlength: 512,
            default: "",
        },
        objectives: {
            type: String,
            maxlength: 512,
            default: "",
        },
        targets: {
            type: String,
            maxlength: 512,
            default: "",
        },
        resources: {
            type: String,
            maxlength: 512,
            default: "",
        },
        chapters: {
            type: [
                {
                    type: Schema.Types.ObjectId,
                    ref: "Chapter",
                },
            ],
            default: [],
        },
        status: {
            type: String,
            enum: courseStatuses,
            default: "private",
            required: true,
        },
    },
    { timestamps: true }
);

courseSchema.plugin(paginate);

module.exports = mongoose.model("Course", courseSchema);
