const { asyncMiddleware } = require("../middleware");
const { httpStatus } = require("../util");
const { articles } = require("../controller");

const attachRoutes = (router) => {
    router.post(
        "/articles",
        asyncMiddleware(async (request, response) => {
            const newArticle = await articles.create(request, request.body);
            response.status(httpStatus.CREATED).json(newArticle);
        })
    );

    router.get(
        "/articles",
        asyncMiddleware(async (request, response) => {
            const result = await articles.list(request, request.query, false);
            response.status(httpStatus.OK).json(result);
        })
    );

    router.get(
        "/articles/public",
        asyncMiddleware(async (request, response) => {
            const result = await articles.list(request, request.query, true);
            response.status(httpStatus.OK).json(result);
        })
    );

    router.get(
        "/articles/:articleId",
        asyncMiddleware(async (request, response) => {
            const article = await articles.getById(
                request,
                request.params.articleId,
                false
            );
            response.status(httpStatus.OK).json(article);
        })
    );

    // TODO: If there no images and the article is published, it needs to unpublished.
    router.patch(
        "/articles/:articleId",
        asyncMiddleware(async (request, response) => {
            const article = await articles.update(
                request,
                request.params.articleId,
                request.body
            );
            response.status(httpStatus.OK).json(article);
        })
    );

    router.patch(
        "/articles/:articleId/public",
        asyncMiddleware(async (request, response) => {
            const article = await articles.publish(
                request,
                request.params.articleId
            );
            response.status(httpStatus.OK).json(article);
        })
    );

    router.patch(
        "/articles/:articleId/private",
        asyncMiddleware(async (request, response) => {
            const article = await articles.unpublish(
                request,
                request.params.articleId
            );
            response.status(httpStatus.OK).json(article);
        })
    );
};

module.exports = {
    attachRoutes,
};
