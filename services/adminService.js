const userRepository = require("../repositories/userRepository");

function mapUser(user) {
    if (!user) {
        return null;
    }

    return {
        id: user.id,
        name: user.name,
        email: user.email,

        role: user.role,
        status: user.status,

        buildLimit: user.build_limit,
        exportLimit: user.export_limit,

        buildsUsed: user.builds_used,
        exportsUsed: user.exports_used,

        createdAt: user.created_at,
        lastLogin: user.last_login
    };
}

async function getUsers() {

    const users = await userRepository.findAll();

    return users.map(mapUser);

}

async function getUserById(id) {

    const user = await userRepository.findById(id);

    return mapUser(user);

}

async function approveUser(email) {

    const user = await userRepository.findByEmail(email);

    if (!user) {
        return null;
    }

    const updated = await userRepository.updateStatus(
        user.id,
        "Active"
    );

    return mapUser(updated);

}

async function blockUser(email) {

    const user = await userRepository.findByEmail(email);

    if (!user) {
        return null;
    }

    const updated = await userRepository.updateStatus(
        user.id,
        "Blocked"
    );

    return mapUser(updated);

}

async function unblockUser(email) {

    const user = await userRepository.findByEmail(email);

    if (!user) {
        return null;
    }

    const updated = await userRepository.updateStatus(
        user.id,
        "Active"
    );

    return mapUser(updated);

}

async function resetUsage(email) {

    const user = await userRepository.findByEmail(email);

    if (!user) {
        return null;
    }

    const updated = await userRepository.resetUsage(
        user.id
    );

    return mapUser(updated);

}

async function setLimits(email, buildLimit, exportLimit) {

    const user = await userRepository.findByEmail(email);

    if (!user) {
        return null;
    }

    const updated = await userRepository.updateLimits(
        user.id,
        buildLimit,
        exportLimit
    );

    return mapUser(updated);

}

module.exports = {
    approveUser,
    blockUser,
    unblockUser,
    resetUsage,
    setLimits,
    getUsers,
    getUserById
};