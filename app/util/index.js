const mongoose = require("mongoose");

const runAsTransaction = async (callback) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        await callback();
        await session.commitTransaction();
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

module.exports = { runAsTransaction };
