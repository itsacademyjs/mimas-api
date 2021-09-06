const { ApolloServer, gql } = require("apollo-server-express");

const types = require("./typeDefinitions");
const {
    courses,
    chapters,
    sections,
    users,
    articles,
} = require("../controller");
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

        createArticle(
            title: String
            description: String
            content: String
            imageURL: String
            languageCode: Language
        ): Article!
        updateArticle(
            articleId: ID!
            title: String
            description: String
            content: String
            imageURL: String
            languageCode: Language
        ): Article!
        publishArticle(articleId: ID!): Section!
        unpublishArticle(articleId: ID!): Section!
        deleteArticle(articleId: ID!): Boolean!
    }

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

        // Article

        createArticle: async (parent, values, context) =>
            articles.create(context.request, values),

        updateArticle: async (parent, values, context) =>
            articles.update(context.request, values.articleId, values),

        publishArticle: async (parent, values, context) =>
            articles.publish(context.request, values.articleId),

        unpublishArticle: async (parent, values, context) =>
            articles.unpublish(context.request, values.articleId),

        deleteArticle: async (parent, values, context) =>
            articles.remove(context.request, values.articleId),
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

        // Article

        getArticles: async (object, values, context) =>
            articles.list(context.request, values, true),

        getArticleById: async (object, values, context) =>
            articles.getById(context.request, values.articleId, true),

        getArticleBySlug: async (object, values, context) =>
            articles.getBySlug(context.request, values.slug, true),
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
