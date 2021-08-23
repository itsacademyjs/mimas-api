const { ApolloServer, gql } = require("apollo-server-express");

const types = require("./typeDefinitions");
const { courses, chapters, sections, users } = require("../controller");

const typeDefs = gql`
    ${types}

    type Query {
        getCourses(page: Int, limit: Int): CoursePage!
        getCourseById(id: ID!): Course!

        getChapters(courseId: ID!, page: Int, limit: Int): [Chapter!]!
        getChapterById(id: ID!): Chapter!

        getSections(chapterId: ID!, page: Int, limit: Int): [Section!]!
        getSectionById(id: ID!): Section!
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
            courses.getById(context.request, values.id, true),

        // Chapter

        getChapters: async (object, values, context) =>
            chapters.list(context.request, values),

        getChapterById: async (object, values, context) =>
            chapters.getById(context.request, values.id),

        // Section

        getSections: async (object, values, context) =>
            sections.list(context.request, values),

        getSectionById: async (object, values, context) =>
            sections.getById(context.request, values.id),
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
