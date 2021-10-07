import { Types } from "mongoose";

import TestCase from "./test-case";

export default interface TestSuite {
    _id: string | Types.ObjectId | undefined;
    title: string;
    description: string;
    handle: string;
    tests: TestCase[];
    tags: string[];
    status: string;
}
