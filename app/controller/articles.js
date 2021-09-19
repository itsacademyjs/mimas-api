const mongoose = require("mongoose");
const joi = require("joi");
const slugify = require("slugify");

const constants = require("../util/constants");
const { BadRequestError, NotFoundError, runAsTransaction } = require("../util");
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

const createSchema = joi.object({
    title: joi.string().max(256).allow(""),
    description: joi.string().max(1024).allow(""),
    content: joi.string().max(20480).allow(""),
    imageURL: joi.string().allow(""),
    languageCode: joi.string().valid(...constants.languageCodes),
});

const updateSchema = joi.object({
    title: joi.string().min(8).max(256).allow(""),
    description: joi.string().max(1024).allow(""),
    content: joi.string().max(20480).allow(""),
    imageURL: joi.string().allow(""),
    languageCode: joi.string().valid(...constants.languageCodes),
});

const create = async (context, attributes) => {
    const { error, value } = createSchema.validate(attributes);

    if (error) {
        throw new BadRequestError(error.message);
    }

    const id = new Types.ObjectId();
    const slug = value.title
        ? `${slugify(value.title, {
              replacement: "-",
              lower: true,
              strict: true,
          })}-${id.toString()}`
        : id.toString();
    const newArticle = new Article({
        _id: id,
        ...value,
        author: context.user._id,
        slug,
    });
    await newArticle.save();

    return toExternal(newArticle);
};

const list = async (context, parameters, publicAPI) => {
    const { error, value } = filterSchema.validate(parameters);
    if (error) {
        throw new BadRequestError(error.message);
    }

    const filters = {
        ...(publicAPI
            ? {
                  $and: [
                      {
                          status: "public",
                      },
                      {
                          status: {
                              $ne: "deleted",
                          },
                      },
                  ],
              }
            : {
                  author: context.user._id,
                  status: {
                      $ne: "deleted",
                  },
              }),
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

const getById = async (context, articleId, publicAPI) => {
    if (!constants.identifierPattern.test(articleId)) {
        throw new BadRequestError(
            "The specified article identifier is invalid."
        );
    }

    const filters = {
        _id: articleId,
        ...(publicAPI ? { status: "public" } : { author: context.user._id }),
        status: { $ne: "deleted " },
    };
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

const getBySlug = async (context, slug, publicAPI) => {
    const filters = {
        slug,
        ...(publicAPI ? { status: "public" } : { author: context.user._id }),
        status: { $ne: "deleted " },
    };
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

    const { error, value } = updateSchema.validate(attributes, {
        stripUnknown: true,
    });
    if (error) {
        throw new BadRequestError(error.message);
    }

    const article = await Article.findOneAndUpdate(
        {
            _id: articleId,
            author: context.user._id,
            status: { $ne: "deleted" },
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

    const article = await Article.findOneAndUpdate(
        {
            _id: articleId,
            author: context.user._id,
            status: { $ne: "deleted" },
        },
        {
            status: "public",
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

const unpublish = async (context, articleId) => {
    if (!constants.identifierPattern.test(articleId)) {
        throw new BadRequestError(
            "The specified article identifier is invalid."
        );
    }

    const article = await Article.findOneAndUpdate(
        {
            _id: articleId,
            author: context.user._id,
            status: { $ne: "deleted " },
        },
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

const remove = async (context, articleId) => {
    if (!constants.identifierPattern.test(articleId)) {
        throw new BadRequestError(
            "The specified article identifier is invalid."
        );
    }

    const result = runAsTransaction(async () => {
        const article = await Article.findOneAndUpdate(
            {
                _id: articleId,
                author: context.user._id,
                status: {
                    $ne: "deleted",
                },
            },
            {
                status: "deleted",
            },
            {
                new: true,
                lean: true,
            }
        );
        return article;
    });

    if (!result) {
        throw new NotFoundError(
            "An article with the specified identifier does not exist."
        );
    }

    return true;
};

module.exports = {
    create,
    list,
    getById,
    getBySlug,
    update,
    publish,
    unpublish,
    remove,
};
