const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const userRepository = require("../repositories/userRepository");
const { generateToken } = require("../utils/jwt");

async function register(req, res) {

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            success: false,
            message: "Missing required fields"
        });
    }

    const exists = await userRepository.findByEmail(email);

    if (exists) {
        return res.status(409).json({
            success: false,
            message: "User already exists"
        });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const userCount = await userRepository.countUsers();

    const isFirstUser = userCount === 0;

    const user = new User({
        id: crypto.randomUUID(),
        name,
        email,
        passwordHash,

        role: isFirstUser ? "Admin" : "Tester",
        status: isFirstUser ? "Active" : "Pending",

        buildLimit: -1,
        exportLimit: -1
    });

    await userRepository.create(user);

    return res.status(201).json({
        success: true,
        message: "Registration request created",
        status: user.status
    });

}

async function login(req, res) {

    const { email, password } = req.body;

    const user = await userRepository.findByEmail(email);

    console.log("========== LOGIN ==========");
    console.log("EMAIL:", email);
    console.log("USER FOUND:", !!user);

    if (user) {
    console.log("DB EMAIL:", user.email);
    }

    if (!user) {
        return res.status(401).json({
            success: false,
            message: "Invalid email or password"
        });
    }

    const passwordValid = await bcrypt.compare(
        password,
        user.password
    );

    console.log("PASSWORD VALID:", passwordValid);

    if (!passwordValid) {
        return res.status(401).json({
            success: false,
            message: "Invalid email or password"
        });
    }

    if (user.status !== "Active") {
        return res.status(403).json({
            success: false,
            message: "Your account is pending administrator approval.",
            status: user.status
        });
    }

    await userRepository.updateLastLogin(user.id);

    const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status
    });

    return res.json({
        success: true,
        token
    });

}

module.exports = {
    register,
    login
};