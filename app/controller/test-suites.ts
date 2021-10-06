import { Types } from "mongoose";
import joi from "joi";

import constants from "../util/constants";
import { BadRequestError, NotFoundError } from "../util";
import { TestSuite as TestSuiteModel } from "../model";

interface ExternalTestSuite {
    [key: string]: any;
}

interface TestCase {
    _id: string | Types.ObjectId | undefined;
    title: string;
    description: string;
}

interface TestSuite {
    _id: string | Types.ObjectId | undefined;
    title: string;
    description: string;
    handle: string;
    tests: TestCase[];
    tags: string[];
    status: string;
}

const toExternal = (testSuite: TestSuite): ExternalTestSuite => {
    const { _id: id, title, description, handle, tests, tags } = testSuite;
    return {
        id,
        title,
        description,
        handle,
        tests: tests.map((test) => ({
            id: test._id,
            title: test.title,
            description: test.description,
        })),
        tags,
    };
};

const filterSchema = joi.object({
    page: joi.number().integer().default(0),
    limit: joi
        .number()
        .integer()
        .min(constants.paginateMinLimit)
        .max(constants.paginateMaxLimit)
        .default(constants.paginateMinLimit),
});

interface Parameters {
    page: number;
    limit: number;
}

interface Page<T> {
    totalRecords: number;
    totalPages: number;
    previousPage: number;
    nextPage: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
    records: T[];
}

const list = async (
    context,
    parameters: Parameters
): Promise<Page<ExternalTestSuite>> => {
    const { error, value } = filterSchema.validate(parameters);
    if (error) {
        throw new BadRequestError(error.message);
    }

    const filters = {
        author: context.user._id,
        status: {
            $ne: "deleted",
        },
    };
    const { page, limit } = value;

    const testSuites = await (TestSuiteModel as any).paginate(filters, {
        limit,
        page: page + 1,
        lean: true,
        leanWithId: true,
        pagination: true,
        sort: {
            updatedAt: -1,
        },
    });

    return {
        totalRecords: testSuites.totalDocs,
        totalPages: testSuites.totalPages,
        previousPage: testSuites.prevPage ? testSuites.prevPage - 1 : -1,
        nextPage: testSuites.nextPage ? testSuites.nextPage - 1 : -1,
        hasPreviousPage: testSuites.hasPrevPage,
        hasNextPage: testSuites.hasNextPage,
        records: testSuites.docs.map(toExternal),
    };
};

const getById = async (context, testSuiteId) => {
    if (!constants.identifierPattern.test(testSuiteId)) {
        throw new BadRequestError(
            "The specified test suite identifier is invalid."
        );
    }

    const filters = {
        _id: testSuiteId,
        status: { $ne: "deleted" },
    };
    const testSuite = await TestSuiteModel.findOne(filters).exec();

    /* We return a 404 error:
     * 1. If we did not find the article.
     * 2. Or, we found the article, but the current user does not own,
     *    and it is unpublished.
     */
    if (!testSuite) {
        throw new NotFoundError(
            "Cannot find a test suite with the specified identifier."
        );
    }

    return toExternal(testSuite as unknown as TestSuite);
};

export { list, getById };
