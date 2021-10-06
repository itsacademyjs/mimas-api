import { Schema, model } from "mongoose";
import paginate from "mongoose-paginate-v2";

const testSchema = new Schema({
    title: {
        type: String,
        maxlength: 1024,
        trim: true,
        required: true,
    },
    description: {
        type: String,
        maxlength: 2048,
        trim: true,
    },
});

const testSuiteSchema = new Schema(
    {
        title: {
            type: String,
            maxlength: 1024,
            trim: true,
            required: true,
        },
        description: {
            type: String,
            maxlength: 2048,
            trim: true,
        },
        handle: {
            type: String,
            trim: true,
            required: true,
            unique: true,
        },
        tests: {
            type: [testSchema],
        },
        tags: {
            type: [String],
        },
        status: {
            type: String,
        },
    },
    { timestamps: true }
);

testSuiteSchema.plugin(paginate);

export default model("TestSuite", testSuiteSchema);
