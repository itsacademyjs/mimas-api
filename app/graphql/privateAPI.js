const { ApolloServer, gql } = require("apollo-server-express");

const types = require("./typeDefinitions");
const { courses, chapters, sections, users } = require("../controller");
const { jwtCheck, requireRole } = require("../middleware");

const typeDefs = gql`
    ${types}

    type Mutation {
        createCourse(
            title: String
            description: String
            level: CourseLevel
            imageURL: String
            languageCode: Language
            linear: Boolean
            actualPrice: Float
            discountedPrice: Float
            chapters: [String!]
            requirements: String
            objectives: String
            targets: String
            resources: String
        ): Course!
        updateCourse(
            courseId: ID!
            title: String
            description: String
            level: CourseLevel
            imageURL: String
            languageCode: Language
            linear: Boolean
            actualPrice: Float
            discountedPrice: Float
            chapters: [String!]
            requirements: String
            objectives: String
            targets: String
            resources: String
        ): Course!
        publishCourse(courseId: ID!): Course!
        unpublishCourse(courseId: ID!): Course!
        deleteCourse(courseId: ID!): Boolean!

        createChapter(
            title: String
            course: String!
            description: String
            sections: [String!]
        ): Chapter!
        updateChapter(
            chapterId: ID!
            title: String
            description: String
            sections: [String!]
        ): Chapter!
        publishChapter(chapterId: ID!): Chapter!
        unpublishChapter(chapterId: ID!): Chapter!
        deleteChapter(chapterId: ID!): Boolean!

        createSection(
            title: String
            type: SectionType!
            chapter: String!
            description: String
        ): Section!
        updateSection(
            sectionId: ID!
            title: String
            description: String
            content: String
        ): Section!
        publishSection(sectionId: ID!): Section!
        unpublishSection(sectionId: ID!): Section!
        deleteSection(sectionId: ID!): Boolean!
    }

    type Query {
        getCourses(page: Int, limit: Int): CoursePage!
        getCourseById(courseId: ID!): Course!

        getChapters(courseId: ID!, page: Int, limit: Int): [Chapter!]!
        getChapterById(chapterId: ID!): Chapter!

        getSections(chapterId: ID!, page: Int, limit: Int): [Section!]!
        getSectionById(sectionId: ID!): Section!
    }
`;

const resolvers = {
    Mutation: {
        // Course

        createCourse: async (parent, values, context) =>
            courses.create(context.request, values),

        updateCourse: async (parent, values, context) =>
            courses.update(context.request, values.courseId, values),

        publishCourse: async (parent, values, context) =>
            courses.publish(context.request, values.courseId),

        unpublishCourse: async (parent, values, context) =>
            courses.unpublish(context.request, values.courseId),

        deleteCourse: async (parent, values, context) =>
            courses.remove(context.request, values.courseId),

        // Chapter

        createChapter: async (parent, values, context) =>
            chapters.create(context.request, values),

        updateChapter: async (parent, values, context) =>
            chapters.update(context.request, values.chapterId, values),

        publishChapter: async (parent, values, context) =>
            chapters.publish(context.request, values.chapterId),

        unpublishChapter: async (parent, values, context) =>
            chapters.unpublish(context.request, values.chapterId),

        deleteChapter: async (parent, values, context) =>
            chapters.remove(context.request, values.chapterId),

        // Section

        createSection: async (parent, values, context) =>
            sections.create(context.request, values),

        updateSection: async (parent, values, context) =>
            sections.update(context.request, values.sectionId, values),

        publishSection: async (parent, values, context) =>
            sections.publish(context.request, values.sectionId),

        unpublishSection: async (parent, values, context) =>
            sections.unpublish(context.request, values.sectionId),

        deleteSection: async (parent, values, context) =>
            sections.remove(context.request, values.sectionId),
    },
    Query: {
        // Course

        getCourses: async (parent, values, context) =>
            courses.list(context.request, values, true),

        getCourseById: async (parent, values, context) => {
            const result = await courses.getById(
                context.request,
                values.courseId
            );
            return result;
        },

        // Chapter

        getChapters: async (parent, values, context) =>
            chapters.list(context.request, values),

        getChapterById: async (parent, values, context) =>
            chapters.getById(context.request, values.chapterId),

        // Section

        getSections: async (parent, values, context) =>
            sections.list(context.request, values),

        getSectionById: async (parent, values, context) =>
            sections.getById(context.request, values.sectionId),
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
        context: (context) => ({ request: context.req }),
    });
    await server.start();
    app.use("/graphql/v1/private", jwtCheck);
    app.use("/graphql/v1/private", requireRole(["regular"]));
    server.applyMiddleware({ app, path: "/graphql/v1/private" });
};

module.exports = { attachRoutes };
