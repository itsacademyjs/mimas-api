const privateAPI = require("./privateAPI");
const publicAPI = require("./publicAPI");

const attachRoutes = async (app) => {
    await publicAPI.attachRoutes(app);
    await privateAPI.attachRoutes(app);
};

module.exports = {
    attachRoutes,
};
