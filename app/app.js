const express = require("express");
const logger = require("morgan");
const cors = require("cors");
const Sentry = require("@sentry/node");
const Tracing = require("@sentry/tracing");

const rest = require("./rest");
const graphql = require("./graphql");
const { globalErrorHandler } = require("./middleware");

const setupErrorHandlers = (app) => {
    /* The Sentry error handler must be before any other error middleware and after all
     * controllers.
     */
    app.use(Sentry.Handlers.errorHandler());
    app.use(globalErrorHandler);
};

const initialize = async () => {
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

    if (process.env.NODE_ENV !== "production") {
        app.use(logger("dev"));
    }
    app.use(cors());
    app.use(express.json());

    rest.attachRoutes(app);
    await graphql.attachRoutes(app);

    setupErrorHandlers(app);

    return app;
};

const destroy = () => {};

module.exports = {
    initialize,
    destroy,
};
