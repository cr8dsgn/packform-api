const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const db = require("../utils/db");
const { generateToken } = require("../utils/jwt");

async function register(req, res) {

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            success: false,
            message: "Missing required fields"
        });
    }

    const database = await db;
    const exists = database.data.users.find(
    user => user.email === email
);
    if (exists) {
        return res.status(409).json({
            success: false,
            message: "User already exists"
        });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = new User({
        id: crypto.randomUUID(),
        name,
        email,
        passwordHash
    });

    database.data.users.push(user);
    await database.write();

    return res.status(201).json({
        success: true,
        message: "Registration request created",
        status: user.status
    });

}

async function login(req, res) {

    const { email, password } = req.body;

    const database = await db;

    const user = database.data.users.find(
        user => user.email === email
    );

    if (!user) {
        return res.status(401).json({
            success: false,
            message: "Invalid email or password"
        });
    }

    const passwordValid = await bcrypt.compare(
        password,
        user.passwordHash
    );

    if (!passwordValid) {
        return res.status(401).json({
            success: false,
            message: "Invalid email or password"
        });
    }

    if (user.status !== "Active") {
        return res.status(403).json({
            success: false,
            message: "Account is not active",
            status: user.status
        });
    }

    user.lastLogin = new Date();

    await database.write();

    const token = generateToken(user);

    return res.json({
        success: true,
        token
    });

}

module.exports = {
    register,
    login
};