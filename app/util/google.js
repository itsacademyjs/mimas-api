const { OAuth2Client } = require("google-auth-library");
const { Storage } = require("@google-cloud/storage");

const {
    GOOGLE_OAUTH_CLIENT_ID_WEB,
    GOOGLE_OAUTH_CLIENT_ID_ANDROID,
    PROJECT_ID,
} = process.env;

const oauth2Client = new OAuth2Client();

const storage = new Storage({
    projectId: PROJECT_ID,
    keyFilename: "./credentials.json",
});

const verifyToken = async (token) => {
    const ticket = await oauth2Client.verifyIdToken({
        idToken: token,
        audience: [GOOGLE_OAUTH_CLIENT_ID_ANDROID, GOOGLE_OAUTH_CLIENT_ID_WEB],
    });
    return ticket.getPayload();
};

/**
 * This application demonstrates how to perform basic operations on files with
 * the Google Cloud Storage API.
 */
const generateUploadSignedURL = async (
    bucketName,
    fileName,
    applyACLPublic = false
) => {
    /* These options will allow temporary uploading of the file with outgoing
     * `Content-Type: application/octet-stream` header.
     */
    const options = {
        version: "v4",
        action: "write",
        expires: Date.now() + 5 * 60 * 1000, // 5 minutes
        contentType: "application/octet-stream",
    };

    if (applyACLPublic) {
        await storage.bucket(bucketName).makePublic();
    }

    const [url] = await storage
        .bucket(bucketName)
        .file(fileName)
        .getSignedUrl(options);

    /* You can use this URL with any user agent, for example:
     * ```
     * curl -X PUT -H 'Content-Type: application/octet-stream' --upload-file audio.mp3 <url>
     * ```
     */
    return url;
};

const fileExists = async (bucketName, fileName) =>
    storage.bucket(bucketName).file(fileName).exists();

const configureBucketCORS = async (bucketName, configurations) => {
    await storage.bucket(bucketName).setCorsConfiguration(configurations);
};

const getBucketMetadata = async (bucketName) => {
    const [metadata] = await storage.bucket(bucketName).getMetadata();
    return metadata;
};

module.exports = {
    verifyToken,
    generateUploadSignedURL,
    fileExists,
    configureBucketCORS,
    getBucketMetadata,
};
