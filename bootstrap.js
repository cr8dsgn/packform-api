const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const db = require("./utils/db");
const User = require("./models/User");

async function bootstrap() {

    const database = await db;

    if (database.data.users.length > 0) {

        console.log("");
        console.log("Database already initialized.");
        console.log("");

        return;
    }

    const password = "S115M248k";

    const passwordHash = await bcrypt.hash(
        password,
        10
    );

    const admin = new User({

        id: crypto.randomUUID(),

        name: "Behruz",

        email: "admin@synaptiq.ai",

        passwordHash,

        role: "Admin",

        status: "Active"

    });

    database.data.users.push(admin);

    await database.write();

    console.log("");
    console.log("==================================");
    console.log(" PackForm Bootstrap Completed");
    console.log("==================================");
    console.log("");
    console.log("Admin:");
    console.log("admin@synaptiq.ai");
    console.log("");
    console.log("Password:");
    console.log(password);
    console.log("");

}

bootstrap();