const express = require("express");
const logger = require("morgan");
const cors = require("cors");
const Sentry = require("@sentry/node");
const Tracing = require("@sentry/tracing");

const articles = require("./controller/articles");
const chapters = require("./controller/chapters");
const courses = require("./controller/courses");
const sections = require("./controller/sections");
const users = require("./controller/users");
const version = require("./controller/version");
const httpStatus = require("./util/httpStatus");
const jwtCheck = require("./middleware/jwtCheck");
const unless = require("./middleware/unless");
const requireRole = require("./middleware/requireRole");

/* 1. Routes that do not require JWT tokens are called unprotected routes.
 * 2. Routes that require JWT tokens are called protected routes.
 *    The token is used to verify an existing user.
 * 3. Certain endpoitns require the JWT token, but do not require the user to exist,
 *    such tokens are called semi-protected routes. `POST /users/session` is
 *    an example for this.
 */
const unprotectedRoutes = [
    { method: "GET", url: "/articles/public-feed" },
    { method: "GET", url: "/articles/trending" },
    { method: "GET", url: "/courses/public" },
    { method: "GET", url: /^\/courses\/[a-z0-9]{24}\/public$/ },
    { method: "GET", url: /^\/sections\/[a-z0-9-]+\/public$/ },
    { method: "GET", url: "/version" },
];

/* Gotta love JavaScript! */
const isString = (s) => typeof s === "string" || s instanceof String;

const isUnprotectedEndpoint = (request) => {
    const { url, method } = request;
    /* eslint-disable-next-line no-restricted-syntax */
    for (const unprotectedEndpoint of unprotectedRoutes) {
        if (unprotectedEndpoint.method === method) {
            if (
                (unprotectedEndpoint.url instanceof RegExp &&
                    unprotectedEndpoint.url.test(url)) ||
                (isString(unprotectedEndpoint.url) &&
                    unprotectedEndpoint.url === url)
            ) {
                return true;
            }
        }
    }
    return false;
};

const semiProtectedRoutes = [{ method: "POST", url: "/users/session" }];

const isUnprotectedOrSemiProtected = (request) => {
    if (isUnprotectedEndpoint(request)) {
        return true;
    }

    const { url, method } = request;
    /* eslint-disable-next-line no-restricted-syntax */
    for (const semiProtectedEndpoint of semiProtectedRoutes) {
        if (
            semiProtectedEndpoint.url === url &&
            semiProtectedEndpoint.method === method
        ) {
            return true;
        }
    }

    return false;
};

const initialize = () => {
    const app = express();

    /* Initial Sentry before we continue initializing Express. */
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        tracesSampleRate: 1.0,
        integrations: [
            new Sentry.Integrations.Http({ tracing: true }),
            new Tracing.Integrations.Express({ app }),
        ],
    });
    app.use(
        Sentry.Handlers.requestHandler({
            severName: true,
            transaction: "methodPath",
            ip: true,
            version: true,
        })
    );
    app.use(Sentry.Handlers.tracingHandler());
    // console.log(" ✅ Sentry initialized");

    if (process.env.NODE_ENV !== "test") {
        app.use(logger("dev"));
    }
    app.use(cors());
    app.use(express.json());
    app.use("/audio", express.static("audio"));

    const router = express.Router();
    /* Unprotected routes do not require JWT tokens, but semi-protected and protected
     * routes do.
     */
    router.use("/", unless(isUnprotectedEndpoint, jwtCheck));
    /* Both unprotected and semi-protected routes do not require the user to exist,
     * but protected routes do.
     */
    router.use(
        "/",
        unless(isUnprotectedOrSemiProtected, requireRole(["regular"]))
    );
    // console.log(" ✅ Whitelisted unprotected and semi-protected routes");

    app.use("/api/v1", router);
    articles.attachRoutes(router);
    chapters.attachRoutes(router);
    courses.attachRoutes(router);
    sections.attachRoutes(router);
    users.attachRoutes(router);
    version.attachRoutes(router);

    /* The Sentry error handler must be before any other error middleware and after all
     * controllers.
     */
    app.use(Sentry.Handlers.errorHandler());
    /* eslint-disable-next-line no-unused-vars */
    app.use((error, request, response, next) => {
        console.log(error.message, error.stack);
        response.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message:
                "An internal error occurred. Please try again in a few minutes.",
        });
    });
    // console.log(" ✅ Error handlers initialized");

    return app;
};

const destroy = () => {};

module.exports = {
    initialize,
    destroy,
};
