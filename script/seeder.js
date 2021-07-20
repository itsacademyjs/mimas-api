require("dotenv").config();

const mongoose = require("mongoose");
const faker = require("faker");
const User = require("../app/model/user");
const Article = require("../app/model/article");
const { languageCodes, articleTags } = require("../app/util/constants");

const audioURLs = [];

const generateUser = async () => {
    try {
        const user = new User({
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName(),
            pictureURL: faker.image.avatar(),
            emailAddress: faker.internet.email(),
            emailVerified: true,
            roles: ["regular"],
        });
        await user.save();

        user.userName = user.id;
        await user.save();
    } catch (error) {
        console.error("Exception encountered when generating a user!", error);
    }
};

const generateUsers = (count) => {
    const promises = [];
    /* eslint-disable-next-line no-plusplus */
    for (let i = 0; i < count; i++) {
        promises.push(generateUser());
    }
    return promises;
};

const generateImageURLs = () => {
    const result = [];
    /* eslint-disable-next-line no-plusplus */
    for (let i = 0; i < 200; i++) {
        result.push(faker.image.nature(400, 400));
    }
    return result;
};

const generateArticle = async () => {
    const userCount = await User.countDocuments().exec();
    const imageURLs = generateImageURLs();

    const selectRandomUser = async () => {
        const random = Math.floor(Math.random() * userCount);
        const user = await User.findOne().skip(random).exec();
        return user.id;
    };

    try {
        const article = new Article({
            title: faker.lorem.sentence(),
            description: faker.lorem.paragraph(),
            transcript: faker.lorem.paragraphs(20),
            author: await selectRandomUser(),
            narrator: await selectRandomUser(),
            tags: faker.random.arrayElements(articleTags),
            slug: faker.lorem.slug(),
            audioURL: faker.random.arrayElement(audioURLs),
            imageURLs: faker.random.arrayElements(imageURLs),
            languageCode: faker.random.arrayElement(languageCodes),
            published: faker.datatype.boolean(),
        });
        await article.save();
    } catch (error) {
        console.error("Exception encountered when generating a user!", error);
    }
};

const generateArticles = (count) => {
    const promises = [];
    /* eslint-disable-next-line no-plusplus */
    for (let i = 0; i < count; i++) {
        promises.push(generateArticle());
    }
    return promises;
};

const main = () => {
    const { DATABASE_URL } = process.env;
    mongoose.connect(DATABASE_URL, {
        useNewUrlParser: true,
    });
    mongoose.connection.on("error", console.error.bind(console, " ❌ "));
    mongoose.connection.once("open", async () => {
        console.log(" ✅ Database connection successfully established.");

        console.log(" * Generating users...");
        await Promise.all(generateUsers(500));

        console.log(" * Generating articles...");
        await Promise.all(generateArticles(500));

        console.log("Done");
        mongoose.connection.close();
    });
};

main();
