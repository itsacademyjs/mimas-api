const express = require("express");
const articles = require("./articles");
const chapters = require("./chapters");
const courses = require("./courses");
const sections = require("./sections");
const users = require("./users");
const version = require("./version");
const { jwtCheck, unless, requireRole } = require("../middleware");

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

const attachRoutes = (app) => {
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

    articles.attachRoutes(router);
    chapters.attachRoutes(router);
    courses.attachRoutes(router);
    sections.attachRoutes(router);
    users.attachRoutes(router);
    version.attachRoutes(router);

    app.use("/api/v1", router);
};

module.exports = { attachRoutes };
