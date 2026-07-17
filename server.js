const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const buildRoute = require("./routes/build");

const app = express();
const API_KEY = process.env.API_KEY || "packform_dev_key";
const ALLOWED_ORIGINS = [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "https://packform-one.vercel.app"
];

const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 100,

    standardHeaders: true,
    legacyHeaders: false,

    message: {
        success: false,
        message: "Too many requests"
    }
});

app.use(express.json());
app.use(apiLimiter);
app.use(cors({

    origin: function (origin, callback) {

        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error("Origin not allowed"));

    }

}));
app.use((req, res, next) => {

    if (req.path === "/health") {
        return next();
    }

    const apiKey = req.headers["x-api-key"];

    if (apiKey !== API_KEY) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    next();

});

app.use("/api/build", buildRoute);

app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        app: "PackForm Engine"
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`PackForm Engine started on port ${PORT}`);
});