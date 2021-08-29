const mongoose = require("mongoose");
const paginate = require("mongoose-paginate-v2");

const { chapterStatuses } = require("../util/constants");

const { Schema } = mongoose;

const chapterSchema = new Schema(
    {
        title: {
            type: String,
            minlength: 16,
            maxlength: 504,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            maxlength: 1024,
            trim: true,
            default: "",
        },
        course: {
            type: Schema.Types.ObjectId,
            ref: "Course",
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
        sections: {
            type: [
                {
                    type: Schema.Types.ObjectId,
                    ref: "Section",
                },
            ],
            default: [],
        },
        status: {
            type: String,
            enum: chapterStatuses,
            default: "private",
            required: true,
        },
    },
    { timestamps: true }
);

chapterSchema.plugin(paginate);

module.exports = mongoose.model("Chapter", chapterSchema);
