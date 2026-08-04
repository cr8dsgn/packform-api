class User {

    constructor({

        id,
        name,
        email,
        passwordHash,

        role = "Tester",
        status = "Pending",

        planId = null,

        buildLimit = 0,
        exportLimit = 0,

        bonusBuilds = 0,
        bonusExports = 0,

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

        // New Plans Architecture
        this.planId = planId;

        // Temporary compatibility
        this.buildLimit = buildLimit;
        this.exportLimit = exportLimit;

        // Bonus System
        this.bonusBuilds = bonusBuilds;
        this.bonusExports = bonusExports;

        // Usage
        this.buildsUsed = buildsUsed;
        this.exportsUsed = exportsUsed;

        this.createdAt = createdAt;
        this.lastLogin = lastLogin;

    }

}

module.exports = User;