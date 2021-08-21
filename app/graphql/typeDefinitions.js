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

    type Section {
        id: ID!
        title: String!
        type: SectionType!
        description: String
        brief: String
        content: String
        chapter: Chapter!
        creator: User!
        slug: String!
        status: SectionStatus!
    }

    type Chapter {
        id: ID!
        title: String!
        description: String
        brief: String
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
        brief: String
        level: CourseLevel!
        creator: User!
        slug: String!
        imageURL: String
        languageCode: Language!
        linear: Boolean!
        actualPrice: Float!
        discountedPrice: Float!
        requirements: [String!]!
        objectives: [String!]!
        targets: [String!]!
        resources: [String!]!
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
`;

module.exports = typeDefinitions;
