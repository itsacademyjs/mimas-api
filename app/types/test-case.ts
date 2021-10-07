import { Types } from "mongoose";

export default interface TestCase {
    _id: string | Types.ObjectId | undefined;
    title: string;
    description: string;
}
