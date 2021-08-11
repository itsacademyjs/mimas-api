const mongoose = require("mongoose");

const exceptions = require("./exceptions");
const misc = require("./misc");
const httpStatus = require("./httpStatus");
const constants = require("./constants");

const runAsTransaction = async (callback) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const result = await callback();
        await session.commitTransaction();
        return result;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

module.exports = {
    httpStatus,
    constants,
    runAsTransaction,
    ...exceptions,
    ...misc,
};
