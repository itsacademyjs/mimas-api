const {
    userStatuses,
    genders,
    countryCodes,
    languageCodes,
    courseStatuses,
    courseLevels,
    chapterStatuses,
    sectionTypes,
    sectionStatuses,
    articleStatuses,
    questionTypes,
} = require("../util/constants");

const typeDefinitions = `
    enum UserStatus {
        ${userStatuses.join("\n")}
    }

    enum Gender {
        ${genders.join("\n")}
    }

    enum Language {
        ${languageCodes.join("\n")}
    }

    enum Country {
        ${countryCodes.join("\n")}
    }

    enum CourseStatus {
        ${courseStatuses.join("\n")}
    }

    enum CourseLevel {
        ${courseLevels.join("\n")}
    }

    enum ChapterStatus {
        ${chapterStatuses.join("\n")}
    }

    enum SectionType {
        ${sectionTypes.join("\n")}
    }

    enum SectionStatus {
        ${sectionStatuses.join("\n")}
    }

    enum ArticleStatus {
        ${articleStatuses.join("\n")}
    }

    type User {
        id: ID!
        firstName: String!
        lastName: String!
        about: String
        gender: Gender
        countryCode: Country!
        pictureURL: String
        emailAddress: String!
        emailVerified: Boolean!
        roles: [String!]!
        birthday: String
        status: UserStatus!
    }

    enum QuestionType {
        ${questionTypes.join("\n")}
    }

    type QuestionOption {
        text: String!
        correct: Boolean!
    }

    type Question {
        text: String!
        type: QuestionType!
        options: [QuestionOption!]!
    }

    type Section {
        id: ID!
        title: String!
        type: SectionType!
        description: String
        content: String
        questions: [Question!]
        exercise: TestSuite
        chapter: Chapter!
        creator: User!
        slug: String!
        status: SectionStatus!
    }

    type Chapter {
        id: ID!
        title: String!
        description: String
        course: Course!
        creator: User!
        slug: String!
        sections: [Section!]!
        status: ChapterStatus
        createdAt: String!
        updatedAt: String!
    }

    type Course {
        id: ID!
        title: String
        description: String
        level: CourseLevel!
        creator: User!
        slug: String!
        imageURL: String
        languageCode: Language!
        linear: Boolean!
        actualPrice: Float!
        discountedPrice: Float!
        requirements: String
        objectives: String
        targets: String
        resources: String
        chapters: [Chapter!]!
        status: CourseStatus
        createdAt: String!
        updatedAt: String!
    }

    type CoursePage {
        totalRecords: Int!
        totalPages: Int!
        previousPage: Int!
        nextPage: Int!
        hasPreviousPage: Boolean!
        hasNextPage: Boolean!
        records: [Course!]!
    }

    type Article {
        id: ID!
        title: String
        description: String
        content: String
        author: User!
        slug: String
        imageURL: String
        languageCode: Language!
        status: ArticleStatus!
    }

    type ArticlePage {
        totalRecords: Int!
        totalPages: Int!
        previousPage: Int!
        nextPage: Int!
        hasPreviousPage: Boolean!
        hasNextPage: Boolean!
        records: [Article!]!
    }

    type TestCase {
        id: String!
        title: String!
        description: String!
    }

    type TestSuite {
        id: String!
        title: String!
        description: String!
        handle: String!
        tests: [TestCase!]!
        tags: [String!]!
    }

    type TestSuitePage {
        totalRecords: Int!
        totalPages: Int!
        previousPage: Int!
        nextPage: Int!
        hasPreviousPage: Boolean!
        hasNextPage: Boolean!
        records: [TestSuite!]!
    }

    input QuestionOptionInput {
        text: String!
        correct: Boolean!
    }

    input QuestionInput {
        text: String!
        type: QuestionType!
        options: [QuestionOptionInput!]!
    }
`;

module.exports = typeDefinitions;
