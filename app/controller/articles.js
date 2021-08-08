const mongoose = require("mongoose");
const joi = require("joi");
const slugify = require("slugify");
const { v4: uuidv4 } = require("uuid");

const asyncMiddleware = require("../middleware/asyncMiddleware");
const constants = require("../util/constants");
const httpStatus = require("../util/httpStatus");
const Article = require("../model/article");

const { Types } = mongoose;

const toExternal = (article) => {
    const { author } = article;
    return {
        id: article._id,
        title: article.title,
        description: article.description,
        brief: article.brief,
        content: article.content,
        author: {
            id: author._id,
            firstName: author.firstName,
            lastName: author.lastName,
            pictureURL: author.pictureURL,
        },
        slug: article.slug,
        imageURL: article.imageURL,
        languageCode: article.languageCode,
        status: article.status,
        createdAt: article.createdAt.toISOString(),
        updatedAt: article.updatedAt.toISOString(),
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

const articleSchema = joi.object({
    title: joi.string().min(10).max(256).required(true),
    description: joi.string().max(1024).required(true),
    brief: joi.string().max(160).required(true),
    content: joi.string().max(10240).required(true),
    imageURL: joi.string(),
    languageCode: joi
        .string()
        .valid(...constants.languageCodes)
        .default("en"),
});

const attachRoutes = (router) => {
    router.post(
        "/articles",
        asyncMiddleware(async (request, response) => {
            const { body } = request;
            const parameters = {
                title: body.title,
                description: body.description,
                transcript: body.transcript,
                narrator: body.narrator,
                tags: body.tags,
                imageURLs: body.imageURLs,
                languageCode: body.languageCode,
            };
            const { error, value } = articleSchema.validate(parameters);

            if (error) {
                response.status(httpStatus.BAD_REQUEST).json({
                    message: error.message,
                });
                return;
            }

            /* Once a slug is generated, it cannot be updated because
             * external entities such as files on Google Cloud Storage
             * are named using slugs.
             */
            const slug = `${slugify(value.title, {
                replacement: "-",
                lower: true,
                strict: true,
            })}-${uuidv4()}`;
            const newArticle = new Article({
                ...value,
                author: request.user._id,
                slug,
            });
            await newArticle.save();
            console.log(` ✅ New article with slug ${slug} saved to database.`);

            response.status(httpStatus.CREATED).json(toExternal(newArticle));
        })
    );

    router.get(
        "/articles",
        asyncMiddleware(async (request, response) => {
            const { query } = request;
            const parameters = {
                page: query.page,
                limit: query.limit,
            };
            const { error, value } = filterSchema.validate(parameters);
            if (error) {
                response.status(httpStatus.BAD_REQUEST).json({
                    message: error.message,
                });
                return;
            }

            const filters = {
                author: request.user._id,
            };
            const { page, limit } = value;

            const articles = await Article.paginate(filters, {
                limit,
                page: page + 1,
                lean: true,
                leanWithId: true,
                pagination: true,
                sort: {
                    updatedAt: -1,
                },
                populate: ["author"],
            });

            response.status(httpStatus.OK).json({
                totalRecords: articles.totalDocs,
                totalPages: articles.totalPages,
                previousPage: articles.prevPage ? articles.prevPage - 1 : -1,
                nextPage: articles.nextPage ? articles.nextPage - 1 : -1,
                hasPreviousPage: articles.hasPrevPage,
                hasNextPage: articles.hasNextPage,
                records: articles.docs.map(toExternal),
            });
        })
    );

    router.get(
        "/articles/public",
        asyncMiddleware(async (request, response) => {
            const { query } = request;
            const parameters = {
                page: query.page,
                limit: query.limit,
            };
            const { error, value } = filterSchema.validate(parameters);
            if (error) {
                response.status(httpStatus.BAD_REQUEST).json({
                    message: error.message,
                });
                return;
            }

            const filters = {
                status: "public",
            };
            const { page, limit } = value;

            const articles = await Article.paginate(filters, {
                limit,
                page: page + 1,
                lean: true,
                leanWithId: true,
                pagination: true,
                sort: {
                    updatedAt: -1,
                },
                populate: ["author"],
            });

            response.status(httpStatus.OK).json({
                totalRecords: articles.totalDocs,
                totalPages: articles.totalPages,
                previousPage: articles.prevPage ? articles.prevPage - 1 : -1,
                nextPage: articles.nextPage ? articles.nextPage - 1 : -1,
                hasPreviousPage: articles.hasPrevPage,
                hasNextPage: articles.hasNextPage,
                records: articles.docs.map(toExternal),
            });
        })
    );

    router.get(
        "/articles/:id",
        asyncMiddleware(async (request, response) => {
            if (!constants.identifierPattern.test(request.params.id)) {
                response.status(httpStatus.BAD_REQUEST).json({
                    message: "The specified article identifier is invalid.",
                });
                return;
            }

            const filters = { _id: request.params.id };
            const article = await Article.findOne(filters)
                .populate("author")
                .exec();

            /* We return a 404 error:
             * 1. If we did not find the article.
             * 2. Or, we found the article, but the current user does not own,
             *    and it is unpublished.
             */
            if (
                !article ||
                (article.status !== "public" &&
                    !article.author._id.equals(request.user._id))
            ) {
                response.status(httpStatus.NOT_FOUND).json({
                    message:
                        "Cannot find an article with the specified identifier.",
                });
                return;
            }

            response.status(httpStatus.OK).json(toExternal(article));
        })
    );

    router.patch(
        "/articles/:articleId/public",
        asyncMiddleware(async (request, response) => {
            const { articleId } = request.params;
            if (!constants.identifierPattern.test(articleId)) {
                response.status(httpStatus.BAD_REQUEST).json({
                    message: "The specified article identifier is invalid.",
                });
                return;
            }

            const article = await Article.findOne({
                _id: articleId,
                author: request.user._id,
            }).exec();
            if (!article) {
                response.status(httpStatus.NOT_FOUND).json({
                    message:
                        "An article with the specified identifier does not exist.",
                });
                return;
            }

            // TODO: Check if we can make the article public.

            article.status = "public";
            await article.save();

            response.status(httpStatus.OK).json(toExternal(article));
        })
    );

    // TODO: If there no images and the article is published, it needs to unpublished.
    router.patch(
        "/articles/:articleId",
        asyncMiddleware(async (request, response) => {
            if (!constants.identifierPattern.test(request.params.articleId)) {
                response.status(httpStatus.BAD_REQUEST).json({
                    message: "The specified article identifier is invalid.",
                });
                return;
            }

            const { body } = request;
            const parameters = {
                title: body.title,
                description: body.description,
                brief: body.brief,
                content: body.content,
                imageURL: body.imageURL,
                languageCode: body.languageCode,
            };
            const { error, value } = articleSchema.validate(parameters);

            if (error) {
                response.status(httpStatus.BAD_REQUEST).json({
                    message: error.message,
                });
                return;
            }

            const article = await Article.findOneAndUpdate(
                {
                    _id: new Types.ObjectId(request.params.articleId),
                    author: request.user._id,
                },
                value,
                {
                    new: true,
                    lean: true,
                }
            )
                .populate("author")
                .exec();

            if (!article) {
                response.status(httpStatus.NOT_FOUND).json({
                    message:
                        "An article with the specified identifier does not exist.",
                });
                return;
            }

            response.status(httpStatus.OK).json(toExternal(article));
        })
    );

    router.patch(
        "/articles/:articleId/private",
        asyncMiddleware(async (request, response) => {
            const { articleId } = request.params;
            if (!constants.identifierPattern.test(articleId)) {
                response.status(httpStatus.BAD_REQUEST).json({
                    message: "The specified article identifier is invalid.",
                });
                return;
            }

            const article = await Article.findOneAndUpdate(
                { _id: articleId, author: request.user._id },
                {
                    status: "private",
                },
                {
                    new: true,
                    lean: true,
                }
            );

            if (!article) {
                response.status(httpStatus.NOT_FOUND).json({
                    message:
                        "An article with the specified identifier does not exist.",
                });
                return;
            }

            response.status(httpStatus.OK).json(toExternal(article));
        })
    );
};

module.exports = {
    attachRoutes,
};
