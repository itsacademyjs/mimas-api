const unless = (predicate, middleware) => (request, response, next) => {
    if (predicate(request)) {
        next();
    } else {
        middleware(request, response, next);
    }
};

module.exports = unless;
