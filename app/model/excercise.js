const mongoose = require("mongoose");
const paginate = require("mongoose-paginate-v2");
const { excerciseStatuses } = require("../util/constants");

const { Schema } = mongoose;

const testSchema = new Schema({
    description: {
        type: String,
        maxlength: 1024,
    },
});

const excerciseSchema = new Schema(
    {
        handle: {
            type: String,
            maxlength: 256,
            default: "",
            trim: true,
        },
        statement: {
            type: String,
            maxlength: 10240, // 10kb
            trim: true,
        },
        content: {
            type: String,
            maxlength: 20480,
            default: "",
            trim: true,
        },
        tests: {
            type: [testSchema],
            default: [],
        },
        status: {
            type: String,
            enum: excerciseStatuses,
            default: "private",
            required: true,
        },
    },
    { timestamps: true }
);

excerciseSchema.plugin(paginate);

module.exports = mongoose.model("Excercise", excerciseSchema);
