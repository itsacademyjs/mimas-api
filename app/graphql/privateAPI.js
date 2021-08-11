const { ApolloServer, gql } = require("apollo-server-express");

const types = require("./typeDefinitions");
const { courses, chapters, sections, users } = require("../controller");
const { jwtCheck } = require("../middleware");

const typeDefs = gql`
    ${types}

    type Mutation {
        createCourse(
            title: String
            description: String
            brief: String
            level: CourseLevel
            imageURL: String
            languageCode: Language
            linear: Boolean
            actualPrice: Float
            discountedPrice: Float
            requirements: [String!]!
            objectives: [String!]!
            targets: [String!]!
            chapters: [String!]!
            resources: [String!]!
        ): Course!
        updateCourse(
            id: ID!
            title: String
            description: String
            brief: String
            level: CourseLevel
            imageURL: String
            languageCode: Language
            linear: Boolean
            actualPrice: Float
            discountedPrice: Float
            requirements: [String!]!
            objectives: [String!]!
            targets: [String!]!
            chapters: [String!]!
            resources: [String!]!
        ): Course!
        publishCourse(courseId: ID!): Course!
        unpublishCourse(courseId: ID!): Course!

        createChapter(
            title: String
            course: String!
            description: String
            brief: String
            sections: [String!]!
        ): Chapter!
        updateChapter(
            chapterId: String!
            title: String
            course: String!
            description: String
            brief: String
            sections: [String!]!
        ): Chapter!
        publishChapter(chapterId: ID!): Chapter!
        unpublishChapter(chapterId: ID!): Chapter!

        createSection(
            title: String
            type: SectionType!
            chapter: String!
            description: String
            brief: String
        ): Section!
        updateSection(
            sectionId: String!
            title: String
            course: String!
            description: String
            brief: String
            sections: [String!]!
        ): Section!
        publishSection(sectionId: ID!): Section!
        unpublishSection(sectionId: ID!): Section!
    }

    type Query {
        getCourses(page: Int, limit: Int): [Course!]!
        getCourseById(courseId: ID!): Course!

        getChapters(courseId: ID!, page: Int, limit: Int): [Chapter!]!
        getChapterById(chapterId: ID!): Chapter!

        getSections(chapterId: ID!, page: Int, limit: Int): [Section!]!
        getSectionById(sectionId: ID!): Section!
    }
`;

const resolvers = {
    Query: {
        // Course

        createCourse: async (values, request) =>
            courses.create(request, values),

        updateCourse: async (values, request) =>
            courses.update(request, values.id, values),

        publishCourse: async (values, request) =>
            courses.publish(request, values.id),

        unpublishCourse: async (values, request) =>
            courses.unpublish(request, values.id),

        deleteCourse: async (values, request) =>
            courses.delete(request, values.id),

        getCourses: async (values, request) => courses.list(request, values),

        getCourseById: async (values, request) =>
            courses.getById(request, values.id),

        // Chapter

        createChapter: async (values, request) =>
            chapters.create(request, values),

        updateChapter: async (values, request) =>
            chapters.update(request, values.id, values),

        publishChapter: async (values, request) =>
            chapters.publish(request, values.id),

        unpublishChapter: async (values, request) =>
            chapters.unpublish(request, values.id),

        deleteChapter: async (values, request) =>
            chapters.delete(request, values.id),

        getChapters: async (values, request) => chapters.list(request, values),

        getChapterById: async (values, request) =>
            chapters.getById(request, values.id),

        // Section

        createSection: async (values, request) =>
            sections.create(request, values),

        updateSection: async (values, request) =>
            sections.update(request, values.id, values),

        publishSection: async (values, request) =>
            sections.publish(request, values.id),

        unpublishSection: async (values, request) =>
            sections.unpublish(request, values.id),

        deleteSection: async (values, request) =>
            sections.delete(request, values.id),

        getSections: async (values, request) => sections.list(request, values),

        getSectionById: async (values, request) =>
            sections.getById(request, values.id),
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
    server.applyMiddleware({ app, path: "/graphql/v1/private" });
    app.use("/graphql/v1/private", jwtCheck);
};

module.exports = { attachRoutes };
