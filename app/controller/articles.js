const mongoose = require("mongoose");
const joi = require("joi");
const slugify = require("slugify");

const constants = require("../util/constants");
const { BadRequestError, NotFoundError } = require("../util");
const { Article } = require("../model");

const { Types } = mongoose;

const toExternal = (article) => ({
    id: article._id,
    title: article.title,
    description: article.description,
    content: article.content,
    author: article.author,
    slug: article.slug,
    imageURL: article.imageURL,
    languageCode: article.languageCode,
    status: article.status,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
});

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
    content: joi.string().max(10240).required(true),
    imageURL: joi.string(),
    languageCode: joi
        .string()
        .valid(...constants.languageCodes)
        .default("en"),
});

const create = async (context, attributes) => {
    const { error, value } = articleSchema.validate(attributes);

    if (error) {
        throw new BadRequestError(error.message);
    }

    /* Once a slug is generated, it cannot be updated because
     * external entities such as files on Google Cloud Storage
     * are named using slugs.
     */
    const id = new Types.ObjectId();
    const slug = `${slugify(value.title, {
        replacement: "-",
        lower: true,
        strict: true,
    })}-${id.toString()}`;
    const newArticle = new Article({
        _id: id,
        ...value,
        author: context.user._id,
        slug,
    });
    await newArticle.save();

    return toExternal(newArticle);
};

const list = async (context, parameters, status) => {
    const { error, value } = filterSchema.validate(parameters);
    if (error) {
        throw new BadRequestError(error.message);
    }

    const filters = {
        /* Anything other than published article requires the user to be the owner. */
        ...(status !== "public" ? { author: context.user._id } : {}),
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
    });

    return {
        totalRecords: articles.totalDocs,
        totalPages: articles.totalPages,
        previousPage: articles.prevPage ? articles.prevPage - 1 : -1,
        nextPage: articles.nextPage ? articles.nextPage - 1 : -1,
        hasPreviousPage: articles.hasPrevPage,
        hasNextPage: articles.hasNextPage,
        records: articles.docs.map(toExternal),
    };
};

const getById = async (context, articleId) => {
    if (!constants.identifierPattern.test(articleId)) {
        throw new BadRequestError(
            "The specified article identifier is invalid."
        );
    }

    const filters = { _id: articleId };
    const article = await Article.findOne(filters).exec();

    /* We return a 404 error:
     * 1. If we did not find the article.
     * 2. Or, we found the article, but the current user does not own,
     *    and it is unpublished.
     */
    if (
        !article ||
        (article.status !== "public" &&
            !article.author.equals(context.user._id))
    ) {
        throw new NotFoundError(
            "Cannot find an article with the specified identifier."
        );
    }

    return toExternal(article);
};

const getBySlug = async (context, slug) => {
    const filters = { slug };
    const article = await Article.findOne(filters).exec();

    /* We return a 404 error:
     * 1. If we did not find the article.
     * 2. Or, we found the article, but the current user does not own,
     *    and it is unpublished.
     */
    if (
        !article ||
        (article.status !== "public" &&
            !article.author.equals(context.user._id))
    ) {
        throw new NotFoundError(
            "Cannot find an article with the specified identifier."
        );
    }

    return toExternal(article);
};

const update = async (context, articleId, attributes) => {
    if (!constants.identifierPattern.test(articleId)) {
        throw new BadRequestError(
            "The specified article identifier is invalid."
        );
    }

    const { error, value } = articleSchema.validate(attributes);

    if (error) {
        throw new BadRequestError(error.message);
    }

    const article = await Article.findOneAndUpdate(
        {
            _id: new Types.ObjectId(articleId),
            author: context.user._id,
        },
        value,
        {
            new: true,
            lean: true,
        }
    ).exec();

    if (!article) {
        throw new NotFoundError(
            "An article with the specified identifier does not exist."
        );
    }

    return toExternal(article);
};

// TODO: If there no images and the article is published, it needs to unpublished.
const publish = async (context, articleId) => {
    if (!constants.identifierPattern.test(articleId)) {
        throw new BadRequestError(
            "The specified article identifier is invalid."
        );
    }

    const article = await Article.findOne({
        _id: articleId,
        author: context.user._id,
    }).exec();

    if (!article) {
        throw new NotFoundError(
            "An article with the specified identifier does not exist."
        );
    }

    // TODO: Check if we can make the article public.

    article.status = "public";
    await article.save();

    return toExternal(article);
};

const unpublish = async (context, articleId) => {
    if (!constants.identifierPattern.test(articleId)) {
        throw new BadRequestError(
            "The specified article identifier is invalid."
        );
    }

    const article = await Article.findOneAndUpdate(
        { _id: articleId, author: context.user._id },
        {
            status: "private",
        },
        {
            new: true,
            lean: true,
        }
    );

    if (!article) {
        throw new NotFoundError(
            "An article with the specified identifier does not exist."
        );
    }

    return toExternal(article);
};

module.exports = {
    create,
    list,
    getById,
    getBySlug,
    update,
    publish,
    unpublish,
};
