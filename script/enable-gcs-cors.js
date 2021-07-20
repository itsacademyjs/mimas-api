/* Run the script from the root of the project. */
require("dotenv").config();

const {
    configureBucketCORS,
    getBucketMetadata,
} = require("../app/util/google");

const configurations = [
    {
        /* The origin for this CORS config to allow requests from. */
        origin: ["http://blogpod.io:3000", "https://blogpod.io"],
        /* The response header to share across origins. */
        responseHeader: ["*"],
        /* The maximum amount of time the browser can make requests before it must
         * repeat preflighted requests.
         */
        maxAgeSeconds: 60 * 60, // 1 hour
        /* The methods that the other origin supports. */
        method: ["PUT"],
    },
];

// eslint-disable-next-line no-unused-vars
const enableCors = async (bucketName) => {
    console.log(
        "Previous Configuration",
        JSON.stringify(await getBucketMetadata(bucketName, null, 4))
    );

    await configureBucketCORS(bucketName, configurations).catch(console.error);

    console.log(
        "New Configuration",
        JSON.stringify(await getBucketMetadata(bucketName, null, 4))
    );
};
