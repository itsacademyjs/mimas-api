const mongoose = require("mongoose");
const paginate = require("mongoose-paginate-v2");
const { languageCodes, articleStatuses } = require("../util/constants");

const { Schema } = mongoose;

const articleSchema = new Schema(
    {
        title: {
            type: String,
            minlength: 10,
            maxlength: 256,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            maxlength: 1024,
            required: true,
            trim: true,
        },
        content: {
            type: String,
            maxlength: 10240,
            required: true,
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
            unique: true,
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
