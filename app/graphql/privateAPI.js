const { ApolloServer, gql } = require("apollo-server-express");

const types = require("./typeDefinitions");
const {
    courses,
    chapters,
    sections,
    users,
    articles,
    testSuites,
    playlists,
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
            chapter: ID!
            description: String
        ): Section!
        updateSection(
            sectionId: ID!
            title: String
            description: String
            content: String
            questions: [QuestionInput!]
            exercise: ID
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

        createPlaylist(
            title: String
            description: String
            courses: [String!]!
        ): Playlist!
        updatePlaylist(
            playlistId: ID!
            title: String
            description: String
            courses: [String!]!
        ): Playlist!
        publishPlaylist(playlistId: ID!): Playlist!
        unpublishPlaylist(playlistId: ID!): Playlist!
        deletePlaylist(playlistId: ID!): Playlist!
    }

    type Query {
        getCourses(page: Int, limit: Int): CoursePage!
        getCourseById(courseId: ID!): Course!
        getCourseBySlug(slug: String!): Course

        getChapters(courseId: ID!, page: Int, limit: Int): [Chapter!]!
        getChapterById(chapterId: ID!): Chapter!

        getSections(chapterId: ID!, page: Int, limit: Int): [Section!]!
        getSectionById(sectionId: ID!): Section!

        getArticles(page: Int, limit: Int): ArticlePage!
        getArticleById(articleId: ID!): Article!
        getArticleBySlug(slug: String): Article!

        getTestSuites(page: Int, limit: Int, search: String): TestSuitePage!
        getTestSuiteById(testSuiteId: ID!): TestSuite!

        getPlaylists(page: Int, limit: Int): PlaylistPage!
        getPlaylistById(playlistId: ID!): Playlist!
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

        // Playlist

        createPlaylist: async (parent, values, context) =>
            playlists.create(context.request, values),

        updatePlaylist: async (parent, values, context) =>
            playlists.update(context.request, values.playlistId, values),

        publishPlaylist: async (parent, values, context) =>
            playlists.publish(context.request, values.playlistId),

        unpublishPlaylist: async (parent, values, context) =>
            playlists.unpublish(context.request, values.playlistId),

        deletePlaylist: async (parent, values, context) =>
            playlists.remove(context.request, values.playlistId),
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

        getCourseBySlug: async (object, values, context) =>
            courses.getBySlug(context.request, values.slug, false),

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
            articles.list(context.request, values, false),

        getArticleById: async (object, values, context) =>
            articles.getById(context.request, values.articleId, false),

        getArticleBySlug: async (object, values, context) =>
            articles.getBySlug(context.request, values.slug, false),

        // Test Suite

        getTestSuites: async (object, values, context) =>
            testSuites.list(context.request, values),
        getTestSuiteById: async (object, values, context) =>
            testSuites.getById(context.request, values.testSuiteId),

        // Playlist

        getPlaylists: async (parent, values, context) =>
            playlists.list(context.request, values),

        getPlaylistById: async (parent, values, context) =>
            playlists.getById(context.request, values.playlistId),
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
    Playlist: {
        creator: async (parent, values, context) =>
            users.getById(context.request, parent.creator),

        courses: async (parent, values, context) =>
            courses.listByIds(context.request, parent.courses),
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
