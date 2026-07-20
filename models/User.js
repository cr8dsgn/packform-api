class User {
    constructor({
        id,
        name,
        email,
        passwordHash,
        role = "Tester",
        status = "Pending",
        buildLimit = 0,
        exportLimit = 0,
        buildsUsed = 0,
        exportsUsed = 0,
        createdAt = new Date(),
        lastLogin = null
    }) {

        this.id = id;
        this.name = name;
        this.email = email;
        this.passwordHash = passwordHash;

        this.role = role;
        this.status = status;

        this.buildLimit = buildLimit;
        this.exportLimit = exportLimit;

        this.buildsUsed = buildsUsed;
        this.exportsUsed = exportsUsed;

        this.createdAt = createdAt;
        this.lastLogin = lastLogin;
    }
}

module.exports = User;