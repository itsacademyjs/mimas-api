const joi = require("joi");
const mongoose = require("mongoose");
const { subMonths, startOfDay, endOfDay } = require("date-fns");

const {
    languageCodes,
    paginateMaxLimit,
    identifierPattern,
    genders,
    countryCodes,
} = require("../util/constants");
const httpStatus = require("../util/httpStatus");
const asyncMiddleware = require("../middleware/asyncMiddleware");
const User = require("../model/user");
const { escapeRegex } = require("../util/misc");

const toExternal = (user) => {
    const {
        id,
        firstName,
        lastName,
        userName,
        gender,
        countryCode,
        pictureURL,
        emailAddress,
        emailVerified,
        roles,
        birthday,
        interests,
        contentLanguageCodes,
        displayLanguageCode,
        about,
        createdAt,
        updatedAt,
    } = user;

    return {
        id,
        firstName,
        lastName,
        userName,
        gender,
        countryCode,
        pictureURL,
        emailAddress,
        emailVerified,
        roles,
        birthday,
        interests,
        contentLanguageCodes,
        displayLanguageCode,
        about,
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
    };
};

const filterSchema = joi.object({
    page: joi.number().integer().default(0),
    limit: joi.number().integer().min(10).max(paginateMaxLimit).default(20),
    dateRange: joi
        .string()
        .valid(
            "all_time",
            "last_3_months",
            "last_6_months",
            "last_9_months",
            "last_12_months",
            "last_15_months",
            "last_18_months",
            "custom"
        )
        .default("all_time"),
    startDate: joi
        .date()
        .when("date_range", { is: "custom", then: joi.required() }),
    endDate: joi
        .date()
        .when("date_range", { is: "custom", then: joi.required() }),
    search: joi.string().trim().allow(null).empty("").default(null),
});

// TODO: Test null values
/* NOTE: The following schema is used by `PATCH /users/:id` endpoint. Default values will cause
 * existing values to be replaced when persisting to the database. Do not specify default values
 * in the schema unless you know what you are doing.
 */
const userSchema = joi.object({
    firstName: joi.string().trim(),
    lastName: joi.string().trim(),
    gender: joi.string().valid(...genders),
    countryCode: joi.string().valid(...countryCodes),
    birthday: joi.date(),
    contentLanguageCodes: joi
        .array()
        .items(joi.string().valid(...languageCodes)),
    displayLanguageCode: joi.string().valid(...languageCodes),
    about: joi.string().min(0).max(512).trim(),
});

const attachRoutes = (router) => {
    // TODO: Should we implement a transaction here?
    router.post(
        "/users/session",
        asyncMiddleware(async (request, response) => {
            const {
                firstName,
                lastName,
                pictureURL,
                emailVerified,
                emailAddress,
            } = request.payload;

            let user = await User.findOne({
                emailAddress,
            }).exec();

            if (!user) {
                const _id = new mongoose.Types.ObjectId();
                /* Looks like this is the first time the user is accessing the service. Therefore,
                 * we need to create a profile with default values for the user.
                 */
                user = new User({
                    _id,
                    firstName,
                    lastName,
                    userName: _id,
                    gender: undefined,
                    countryCode: undefined,
                    pictureURL,
                    emailAddress,
                    emailVerified,
                    roles: ["regular"],
                    birthday: null,
                    interests: [],
                    contentLanguageCodes: ["en"],
                    displayLanguageCode: "en",
                    status: "active",
                    about: "",
                });
                await user.save();
            }

            if (!user.emailVerified && emailVerified) {
                /* If the email address has been verified since the last session,
                 * update it.
                 */
                user.emailVerified = true;
                await user.save();
            }

            response.status(httpStatus.CREATED).json(toExternal(user));
        })
    );

    router.patch(
        "/users/:id",
        asyncMiddleware(async (request, response) => {
            const { id } = request.params;
            if (!identifierPattern.test(request.params.articleId)) {
                response.status(httpStatus.BAD_REQUEST).json({
                    message: "The specified user identifier is invalid.",
                });
                return;
            }

            const { body } = request;
            const parameters = {
                firstName: body.firstName,
                lastName: body.lastName,
                gender: body.gender,
                countryCode: body.countryCode,
                birthday: body.birthday,
                contentLanguageCodes: body.contentLanguageCodes,
                displayLanguageCode: body.displayLanguageCode,
                about: body.about,
            };
            const { error, value } = userSchema.validate(parameters);
            if (error) {
                response.status(httpStatus.BAD_REQUEST).json({
                    message: error.message,
                });
                return;
            }

            /* The specified ID should be equal to the current user, meaning the user is trying to
             * modify their own account.
             */
            if (id !== request.user._id.toString()) {
                response.status(httpStatus.NOT_FOUND).json({
                    message: "The specified user identifier is invalid.",
                });
                return;
            }

            const updatedUser = await User.findOneAndUpdate({ _id: id }, value)
                .lean()
                .exec();

            /* As of this writing, we check if the specified ID belongs to the current user.
             * Therefore, `updatedUser` will never be null. However, in the future when we implement
             * administrative permissions to update user data, we need to check if the specified
             * ID exists or not. I pre-writing the logic for it now.
             */
            if (!updatedUser) {
                response.status(httpStatus.NOT_FOUND).json({
                    message: "The specified user identifier is invalid.",
                });
                return;
            }

            response.status(httpStatus.OK).json(toExternal(updatedUser));
        })
    );

    router.get("/users", async (request, response) => {
        const { query } = request;
        const parameters = {
            page: query.page,
            limit: query.limit,
            dateRange: query.date_range,
            startDate: query.start_date,
            endDate: query.end_date,
            search: query.search,
        };
        const { error, value } = filterSchema.validate(parameters);
        if (error) {
            response.status(httpStatus.BAD_REQUEST).json({
                message: error.message,
            });
            return;
        }

        let { startDate } = value;
        let { endDate } = value;
        const { dateRange } = value;
        if (dateRange !== "custom" && dateRange !== "all_time") {
            const months = {
                last_3_months: 3,
                last_6_months: 6,
                last_9_months: 9,
                last_12_months: 12,
                last_15_months: 15,
                last_18_months: 18,
            };
            /* eslint-disable-next-line security/detect-object-injection */
            const amount = months[dateRange];
            startDate = subMonths(new Date(), amount);
            endDate = new Date();
        }

        const filters = {
            // userName: { $exists: true }
        };
        if (dateRange !== "all_time") {
            filters.createdAt = {
                $gte: startOfDay(startDate),
                $lte: endOfDay(endDate),
            };
        }

        if (value.search) {
            /* eslint-disable-next-line security/detect-non-literal-regexp */
            const regex = new RegExp(escapeRegex(value.search), "i");
            filters.$or = [
                { firstName: regex },
                { lastName: regex },
                // Email address should match exactly, for privacy reasons.
                { emailAddress: value.search },
            ];
        }

        const users = await User.paginate(filters, {
            limit: value.limit,
            page: value.page + 1,
            lean: true,
            leanWithId: true,
            pagination: true,
            sort: {
                createdAt: -1,
            },
        });

        const result = {
            totalRecords: users.totalDocs,
            page: value.page,
            limit: users.limit,
            totalPages: users.totalPages,
            previousPage: users.prevPage ? users.prevPage - 1 : null,
            nextPage: users.nextPage ? users.nextPage - 1 : null,
            hasPreviousPage: users.hasPrevPage,
            hasNextPage: users.hasNextPage,
            records: users.docs.map(toExternal),
        };
        response.status(httpStatus.OK).json(result);
    });
};

module.exports = {
    attachRoutes,
};
