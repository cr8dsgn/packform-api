require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const buildRoute = require("./routes/build");
const authRoute = require("./routes/auth");
const adminRoute = require("./routes/admin");
const exportRoute = require("./routes/export");
const userRoute = require("./routes/user");
const plansRoute = require("./routes/plans");

const app = express();

const API_KEY = process.env.API_KEY;

const ALLOWED_ORIGINS = [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:5501",
    "http://localhost:5501",
    "http://127.0.0.1:5503",
    "http://localhost:5503",
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

app.use(helmet());
app.use(express.json());
app.use(apiLimiter);

app.use(cors({
    origin(origin, callback) {

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
app.use("/api/auth", authRoute);
app.use("/api/admin", adminRoute);
app.use("/api/export", exportRoute);
app.use("/api/user", userRoute);
app.use("/api/plans", plansRoute);

app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        app: "PackForm Engine"
    });
});

app.use((err, req, res, next) => {

    if (err && err.message === "Origin not allowed") {
        return res.status(403).json({
            success: false,
            message: "Origin not allowed"
        });
    }

    if (err && err.type === "entity.parse.failed") {
        return res.status(400).json({
            success: false,
            message: "Invalid JSON"
        });
    }

    console.error(err);

    return res.status(err && err.status ? err.status : 500).json({
        success: false,
        message: "Internal server error"
    });

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`PackForm Engine started on port ${PORT}`);
});
