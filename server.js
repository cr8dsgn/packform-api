const express = require("express");
const buildRoute = require("./routes/build");

const app = express();

app.use(express.json());
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