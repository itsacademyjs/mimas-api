require("dotenv").config();

const mongoose = require("mongoose");
const http = require("http");

const { initialize } = require("./app");

const { PORT, DATABASE_URL } = process.env;

mongoose.set("debug", true);
mongoose.connection.on("error", console.error.bind(console, " ❌ "));
mongoose.connection.once("open", () => {
    console.log(" ✅ Database connection successfully established.");
    const app = initialize();
    http.createServer(app).listen(PORT, () => {
        console.log(
            ` 🎉 You can access the server at http://localhost:${PORT}`
        );
    });
});
mongoose.connect(DATABASE_URL, {
    useNewUrlParser: true,
});
