const { ApolloServer, gql } = require("apollo-server-express");

const types = require("./typeDefinitions");
const {
    courses,
    chapters,
    sections,
    users,
    articles,
    testSuites,
} = require("../controller");

const typeDefs = gql`
    ${types}

    type Query {
        getCourses(page: Int, limit: Int): CoursePage!
        getCourseById(courseId: ID!): Course!

        getChapters(courseId: ID!, page: Int, limit: Int): [Chapter!]!
        getChapterById(chapterId: ID!): Chapter!

        getSections(chapterId: ID!, page: Int, limit: Int): [Section!]!
        getSectionById(sectionId: ID!): Section!

        getArticles(page: Int, limit: Int): ArticlePage!
        getArticleById(articleId: ID!): Article!
        getArticleBySlug(slug: String): Article!

        getTestSuites(page: Int, limit: Int, search: String): TestSuitePage!
        getTestSuiteById(testSuiteId: ID!): TestSuite!
    }
`;

const resolvers = {
    Query: {
        // Course

        getCourses: async (parent, values, context) => {
            const result = await courses.list(context.request, values, false);
            return result;
        },

        getCourseById: async (object, values, context) =>
            courses.getById(context.request, values.courseId, true),

        // Chapter

        getChapters: async (object, values, context) =>
            chapters.list(context.request, values),

        getChapterById: async (object, values, context) =>
            chapters.getById(context.request, values.chapterId),

        // Section

        getSections: async (object, values, context) =>
            sections.list(context.request, values),

        getSectionById: async (object, values, context) =>
            sections.getById(context.request, values.sectionId),

        // Article

        getArticles: async (object, values, context) =>
            articles.list(context.request, values, true),

        getArticleById: async (object, values, context) =>
            articles.getById(context.request, values.articleId, true),

        getArticleBySlug: async (object, values, context) =>
            articles.getBySlug(context.request, values.slug, true),

        getTestSuites: async (object, values, context) =>
            testSuites.list(context.request, values),

        getTestSuiteById: async (object, values, context) =>
            testSuites.getById(context.request, values.testSuiteId),
    },
    Course: {
        creator: async (parent, values, context) =>
            users.getById(context.request, parent.creator),
        chapters: async (parent, values, context) =>
            chapters.list(context.request, parent.chapters),
    },
    Chapter: {
        creator: async (parent, values, context) =>
            users.getById(context.request, parent.creator),
        sections: async (parent, values, context) =>
            sections.list(context.request, parent.sections),
    },
    Section: {
        creator: async (parent, values, context) =>
            users.getById(context.request, parent.creator),

        exercise: async (parent, values, context) => {
            if (!parent.exercise) {
                return null;
            }
            return testSuites.getById(context.request, parent.exercise);
        },
    },
};

const attachRoutes = async (app) => {
    const server = new ApolloServer({
        typeDefs,
        resolvers,
    });
    await server.start();
    server.applyMiddleware({ app, path: "/graphql/v1/public" });
};

module.exports = { attachRoutes };
