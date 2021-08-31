const mongoose = require("mongoose");
const paginate = require("mongoose-paginate-v2");
const { languageCodes, articleStatuses } = require("../util/constants");

const { Schema } = mongoose;

const articleSchema = new Schema(
    {
        title: {
            type: String,
            maxlength: 256,
            default: "",
            trim: true,
        },
        description: {
            type: String,
            maxlength: 1024,
            trim: true,
        },
        content: {
            type: String,
            maxlength: 10240,
            default: "",
            trim: true,
        },
        author: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        slug: {
            type: String,
            trim: true,
            required: true,
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
        status: {
            type: String,
            enum: articleStatuses,
            default: "private",
            required: true,
        },
    },
    { timestamps: true }
);

articleSchema.plugin(paginate);

module.exports = mongoose.model("Article", articleSchema);
