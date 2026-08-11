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

        planId: null,
        bonusBuilds: 0,
        bonusExports: 0
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

    const authUser = await userRepository.findAuthByEmail(email);

    console.log("========== LOGIN ==========");
    console.log("EMAIL:", email);
    console.log("USER FOUND:", !!authUser);

    if (authUser) {
    console.log("DB EMAIL:", authUser.email);
    }

    if (!authUser) {
        return res.status(401).json({
            success: false,
            message: "Invalid email or password"
        });
    }

    const passwordValid = await bcrypt.compare(
        password,
        authUser.password
    );

    console.log("PASSWORD VALID:", passwordValid);

    if (!passwordValid) {
        return res.status(401).json({
            success: false,
            message: "Invalid email or password"
        });
    }

    if (authUser.status !== "Active") {
        return res.status(403).json({
            success: false,
            message: "Your account is pending administrator approval.",
            status: authUser.status
        });
    }

    await userRepository.updateLastLogin(authUser.id);

    const token = generateToken({
        id: authUser.id,
        email: authUser.email,
        role: authUser.role,
        status: authUser.status
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