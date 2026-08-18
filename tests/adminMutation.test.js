"use strict";

/**
 * Phase 2.4 — Admin mutation regression tests.
 *
 * DESIGN DECISION (deviation from "stub adminService + rbacService" worth
 * flagging explicitly): this file loads the REAL, unmodified
 * controllers/adminController.js, services/rbacService.js,
 * services/hierarchyService.js, AND services/adminService.js. Only the
 * true bottom of the dependency graph is stubbed with deterministic
 * in-memory fixtures:
 *
 *   repositories/userRepository.js   (the actual Postgres boundary)
 *   services/userStateService.js     (not attached in this batch — UNKNOWN
 *                                      real implementation, stubbed only
 *                                      for the one changeRole transition
 *                                      this file exercises)
 *   repositories/planRepository.js   (not attached in this batch — UNKNOWN
 *                                      real implementation, stubbed only
 *                                      for the one plan name this file
 *                                      looks up)
 *
 * Why: rbacService.js and hierarchyService.js encode real permission/
 * hierarchy semantics (self-target checks, Super Admin checks) that were
 * already unit-tested directly in tests/hierarchyService.test.js. Stubbing
 * them here with a simple true/false toggle would mean the "self-target"
 * and "permission denied" cases in this file are not actually proving
 * anything about the real controller-to-RBAC wiring — they'd just be
 * proving the controller trusts whatever the stub says. Loading the real
 * chain instead means every 403/404/200 in this file is produced by
 * genuinely executing production authorization logic end-to-end through
 * the controller, which is what Phase 2.4's brief specifically asks for
 * ("this batch must verify the REAL controller behavior" / "do not test
 * self-target by directly calling rbacService").
 *
 * MUTATION SPY DESIGN: because adminService.js is real here (not stubbed),
 * "the stubbed mutation service" call-counting requested in the brief is
 * implemented one layer lower, at the actual userRepository write
 * functions (updateStatus, resetUsage, updateLimits, updateRoleAndPlan,
 * deleteByEmail). This is a stricter proof than counting adminService
 * calls would be: it demonstrates the mutation never reaches the
 * data-layer write at all for 404/403 cases, not merely that a
 * higher-level wrapper function wasn't called.
 *
 * OUT OF SCOPE (confirmed by reading admin.js/adminController.js directly,
 * not assumed): adminController.js has no changePlan/assignPlan export,
 * and routes/admin.js has no route for it. That capability lives in
 * plansController.js, which was not attached to this batch. It is not
 * tested here.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");

// ---------------------------------------------------------------------------
// Module path resolution
// ---------------------------------------------------------------------------

const ADMIN_CONTROLLER_PATH = require.resolve(
    path.join(__dirname, "..", "controllers", "adminController.js")
);
const ADMIN_SERVICE_PATH = require.resolve(
    path.join(__dirname, "..", "services", "adminService.js")
);
const RBAC_SERVICE_PATH = require.resolve(
    path.join(__dirname, "..", "services", "rbacService.js")
);
const HIERARCHY_SERVICE_PATH = require.resolve(
    path.join(__dirname, "..", "services", "hierarchyService.js")
);
const USER_STATE_SERVICE_PATH = require.resolve(
    path.join(__dirname, "..", "services", "userStateService.js")
);
const USER_REPOSITORY_PATH = require.resolve(
    path.join(__dirname, "..", "repositories", "userRepository.js")
);
const PLAN_REPOSITORY_PATH = require.resolve(
    path.join(__dirname, "..", "repositories", "planRepository.js")
);

const ALL_PATHS = [
    ADMIN_CONTROLLER_PATH,
    ADMIN_SERVICE_PATH,
    RBAC_SERVICE_PATH,
    HIERARCHY_SERVICE_PATH,
    USER_STATE_SERVICE_PATH,
    USER_REPOSITORY_PATH,
    PLAN_REPOSITORY_PATH
];

function injectStub(resolvedPath, exportsValue) {
    const fakeModule = new Module(resolvedPath);
    fakeModule.filename = resolvedPath;
    fakeModule.loaded = true;
    fakeModule.exports = exportsValue;
    require.cache[resolvedPath] = fakeModule;
}

function clearCache() {
    for (const p of ALL_PATHS) {
        delete require.cache[p];
    }
}

// ---------------------------------------------------------------------------
// Deterministic fixtures
// ---------------------------------------------------------------------------

const STARTER_PLAN = { id: "plan-starter", name: "Starter", buildLimit: 25, exportLimit: 25 };
const TESTER_PLAN = { id: "plan-tester", name: "Tester", buildLimit: 3, exportLimit: 3 };
const ENTERPRISE_PLAN = { id: "plan-enterprise", name: "Enterprise", buildLimit: -1, exportLimit: -1 };

function baseFixtures() {
    return [
        {
            id: "super-admin",
            name: "Super Admin",
            email: "super@example.com",
            role: "Admin",
            status: "Active",
            createdAt: "2026-07-01T00:00:00.000Z",
            bonusBuilds: 0,
            bonusExports: 0,
            buildsUsed: 0,
            exportsUsed: 0,
            lastLogin: null,
            plan: ENTERPRISE_PLAN
        },
        {
            id: "admin-2",
            name: "Regular Admin",
            email: "admin2@example.com",
            role: "Admin",
            status: "Active",
            createdAt: "2026-07-05T00:00:00.000Z",
            bonusBuilds: 0,
            bonusExports: 0,
            buildsUsed: 0,
            exportsUsed: 0,
            lastLogin: null,
            plan: ENTERPRISE_PLAN
        },
        {
            id: "user-1",
            name: "Regular User",
            email: "user1@example.com",
            role: "User",
            status: "Active",
            createdAt: "2026-07-10T00:00:00.000Z",
            bonusBuilds: 2,
            bonusExports: 1,
            buildsUsed: 5,
            exportsUsed: 4,
            lastLogin: null,
            plan: STARTER_PLAN
        }
    ];
}

// ---------------------------------------------------------------------------
// In-memory userRepository stub with mutation call counters
// ---------------------------------------------------------------------------

function makeUserRepositoryStub(initialUsers) {

    const byId = new Map(initialUsers.map((u) => [u.id, { ...u }]));

    const counters = {
        updateStatus: 0,
        resetUsage: 0,
        updateLimits: 0,
        updateRoleAndPlan: 0,
        deleteByEmail: 0
    };

    function findByIdSync(id) {
        const u = byId.get(id);
        return u ? { ...u } : null;
    }

    function findByEmailSync(email) {
        for (const u of byId.values()) {
            if (u.email === email) {
                return { ...u };
            }
        }
        return null;
    }

    const repo = {
        async findById(id) {
            return findByIdSync(id);
        },
        async findByEmail(email) {
            return findByEmailSync(email);
        },
        async findActiveAdmins() {
            return [...byId.values()]
                .filter((u) => u.role === "Admin" && u.status === "Active")
                .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
                .map((u) => ({ ...u }));
        },
        async updateStatus(id, status) {
            counters.updateStatus += 1;
            const u = byId.get(id);
            if (!u) return null;
            u.status = status;
            return { ...u };
        },
        async resetUsage(id) {
            counters.resetUsage += 1;
            const u = byId.get(id);
            if (!u) return null;
            u.buildsUsed = 0;
            u.exportsUsed = 0;
            return { ...u };
        },
        async updateLimits(id, bonusBuilds, bonusExports) {
            counters.updateLimits += 1;
            const u = byId.get(id);
            if (!u) return null;
            u.bonusBuilds = bonusBuilds;
            u.bonusExports = bonusExports;
            return { ...u };
        },
        async updateRoleAndPlan(id, role, planId) {
            counters.updateRoleAndPlan += 1;
            const u = byId.get(id);
            if (!u) return null;
            u.role = role;
            u.plan = [STARTER_PLAN, TESTER_PLAN, ENTERPRISE_PLAN].find((p) => p.id === planId) || null;
            u.buildsUsed = 0;
            u.exportsUsed = 0;
            return { ...u };
        },
        async deleteByEmail(email) {
            counters.deleteByEmail += 1;
            const existing = findByEmailSync(email);
            if (!existing) return null;
            byId.delete(existing.id);
            return existing;
        }
    };

    return { repo, counters };

}

const USER_STATE_SERVICE_STUB = {
    resolveStateForRoleChange(user, newRole) {
        // Only the one transition this test batch actually exercises
        // (User -> Tester) is implemented. userStateService.js was not
        // attached in this batch, so its real transition matrix is
        // UNKNOWN and is not guessed at beyond this single case.
        if (user.role === "User" && newRole === "Tester") {
            return { success: true, role: "Tester", plan: "Tester" };
        }
        return { success: false, message: "Unsupported test transition" };
    }
};

const PLAN_REPOSITORY_STUB = {
    async findByName(name) {
        if (name === "Tester") return TESTER_PLAN;
        if (name === "Starter") return STARTER_PLAN;
        if (name === "Enterprise") return ENTERPRISE_PLAN;
        return null;
    }
};

function loadFreshAdminController(users = baseFixtures()) {

    clearCache();

    const { repo, counters } = makeUserRepositoryStub(users);

    injectStub(USER_REPOSITORY_PATH, repo);
    injectStub(USER_STATE_SERVICE_PATH, USER_STATE_SERVICE_STUB);
    injectStub(PLAN_REPOSITORY_PATH, PLAN_REPOSITORY_STUB);

    const adminController = require(ADMIN_CONTROLLER_PATH);

    return { adminController, counters };

}

test.after(() => {
    clearCache();
});

// ---------------------------------------------------------------------------
// Mock Express req/res
// ---------------------------------------------------------------------------

function mockReq(actorId, body = {}) {
    return { user: { id: actorId }, body };
}

function mockRes() {
    return {
        statusCode: 200,
        body: undefined,
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.body = payload; return this; }
    };
}

const SUPER_ADMIN_ID = "super-admin";
const REGULAR_ADMIN_ID = "admin-2";
const REGULAR_USER_ID = "user-1";
const REGULAR_USER_EMAIL = "user1@example.com";

// ---------------------------------------------------------------------------
// A. APPROVE
// ---------------------------------------------------------------------------

test("approveUser: missing target => 404, mutation not called", async () => {
    const { adminController, counters } = loadFreshAdminController();
    const req = mockReq(SUPER_ADMIN_ID, { email: "nobody@example.com" });
    const res = mockRes();

    await adminController.approveUser(req, res);

    assert.equal(res.statusCode, 404);
    assert.deepEqual(res.body, { success: false, message: "User not found" });
    assert.equal(counters.updateStatus, 0);
});

test("approveUser: permission denied (Regular Admin -> Super Admin) => 403, mutation not called", async () => {
    const { adminController, counters } = loadFreshAdminController();
    const req = mockReq(REGULAR_ADMIN_ID, { email: "super@example.com" });
    const res = mockRes();

    await adminController.approveUser(req, res);

    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.body, { success: false, message: "Permission denied" });
    assert.equal(counters.updateStatus, 0);
});

test("approveUser: allowed (Super Admin -> Regular User) => 200, mutation called exactly once", async () => {
    const { adminController, counters } = loadFreshAdminController();
    const req = mockReq(SUPER_ADMIN_ID, { email: REGULAR_USER_EMAIL });
    const res = mockRes();

    await adminController.approveUser(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { success: true, message: "User approved", status: "Active" });
    assert.equal(counters.updateStatus, 1);
});

// ---------------------------------------------------------------------------
// B. BLOCK
// ---------------------------------------------------------------------------

test("blockUser: missing target => 404, mutation not called", async () => {
    const { adminController, counters } = loadFreshAdminController();
    const req = mockReq(SUPER_ADMIN_ID, { email: "nobody@example.com" });
    const res = mockRes();

    await adminController.blockUser(req, res);

    assert.equal(res.statusCode, 404);
    assert.deepEqual(res.body, { success: false, message: "User not found" });
    assert.equal(counters.updateStatus, 0);
});

test("blockUser: self-target (Regular Admin -> self) => 403 via real rbacService self-check, mutation not called", async () => {
    const { adminController, counters } = loadFreshAdminController();
    const req = mockReq(REGULAR_ADMIN_ID, { email: "admin2@example.com" });
    const res = mockRes();

    await adminController.blockUser(req, res);

    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.body, { success: false, message: "Permission denied" });
    assert.equal(counters.updateStatus, 0);
});

test("blockUser: permission denied (Regular Admin -> Super Admin) => 403, mutation not called", async () => {
    const { adminController, counters } = loadFreshAdminController();
    const req = mockReq(REGULAR_ADMIN_ID, { email: "super@example.com" });
    const res = mockRes();

    await adminController.blockUser(req, res);

    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.body, { success: false, message: "Permission denied" });
    assert.equal(counters.updateStatus, 0);
});

test("blockUser: allowed (Super Admin -> Regular User) => 200, mutation called exactly once", async () => {
    const { adminController, counters } = loadFreshAdminController();
    const req = mockReq(SUPER_ADMIN_ID, { email: REGULAR_USER_EMAIL });
    const res = mockRes();

    await adminController.blockUser(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { success: true, message: "User blocked", status: "Blocked" });
    assert.equal(counters.updateStatus, 1);
});

// ---------------------------------------------------------------------------
// C. UNBLOCK
// ---------------------------------------------------------------------------

test("unblockUser: missing target => 404, mutation not called", async () => {
    const { adminController, counters } = loadFreshAdminController();
    const req = mockReq(SUPER_ADMIN_ID, { email: "nobody@example.com" });
    const res = mockRes();

    await adminController.unblockUser(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal(counters.updateStatus, 0);
});

test("unblockUser: permission denied (Regular Admin -> Super Admin) => 403, mutation not called", async () => {
    const { adminController, counters } = loadFreshAdminController();
    const req = mockReq(REGULAR_ADMIN_ID, { email: "super@example.com" });
    const res = mockRes();

    await adminController.unblockUser(req, res);

    assert.equal(res.statusCode, 403);
    assert.equal(counters.updateStatus, 0);
});

test("unblockUser: allowed (Super Admin -> Regular User) => 200, mutation called exactly once", async () => {
    const { adminController, counters } = loadFreshAdminController();
    const req = mockReq(SUPER_ADMIN_ID, { email: REGULAR_USER_EMAIL });
    const res = mockRes();

    await adminController.unblockUser(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { success: true, message: "User unblocked", status: "Active" });
    assert.equal(counters.updateStatus, 1);
});

// ---------------------------------------------------------------------------
// D. RESET USAGE
// ---------------------------------------------------------------------------

test("resetUsage: missing target => 404, mutation not called", async () => {
    const { adminController, counters } = loadFreshAdminController();
    const req = mockReq(SUPER_ADMIN_ID, { email: "nobody@example.com" });
    const res = mockRes();

    await adminController.resetUsage(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal(counters.resetUsage, 0);
});

test("resetUsage: permission denied (Regular Admin -> Super Admin) => 403, mutation not called", async () => {
    const { adminController, counters } = loadFreshAdminController();
    const req = mockReq(REGULAR_ADMIN_ID, { email: "super@example.com" });
    const res = mockRes();

    await adminController.resetUsage(req, res);

    assert.equal(res.statusCode, 403);
    assert.equal(counters.resetUsage, 0);
});

test("resetUsage: allowed (Super Admin -> Regular User) => 200, mutation called exactly once, usage zeroed in response", async () => {
    const { adminController, counters } = loadFreshAdminController();
    const req = mockReq(SUPER_ADMIN_ID, { email: REGULAR_USER_EMAIL });
    const res = mockRes();

    await adminController.resetUsage(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { success: true, message: "Usage reset", buildsUsed: 0, exportsUsed: 0 });
    assert.equal(counters.resetUsage, 1);
});

// ---------------------------------------------------------------------------
// E. SET LIMITS
// ---------------------------------------------------------------------------

test("setLimits: missing email => 404 (current actual behavior — no 400 guard exists for this field on this endpoint)", async () => {
    const { adminController, counters } = loadFreshAdminController();
    const req = mockReq(SUPER_ADMIN_ID, { buildLimit: 10, exportLimit: 10 });
    const res = mockRes();

    await adminController.setLimits(req, res);

    assert.equal(res.statusCode, 404);
    assert.deepEqual(res.body, { success: false, message: "User not found" });
    assert.equal(counters.updateLimits, 0);
});

test("setLimits: target not found (well-formed but nonexistent email) => 404, mutation not called", async () => {
    const { adminController, counters } = loadFreshAdminController();
    const req = mockReq(SUPER_ADMIN_ID, { email: "nobody@example.com", buildLimit: 10, exportLimit: 10 });
    const res = mockRes();

    await adminController.setLimits(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal(counters.updateLimits, 0);
});

test("setLimits: permission denied (Regular Admin -> Super Admin) => 403, mutation not called", async () => {
    const { adminController, counters } = loadFreshAdminController();
    const req = mockReq(REGULAR_ADMIN_ID, { email: "super@example.com", buildLimit: 10, exportLimit: 10 });
    const res = mockRes();

    await adminController.setLimits(req, res);

    assert.equal(res.statusCode, 403);
    assert.equal(counters.updateLimits, 0);
});

test("setLimits: invalid buildLimit/exportLimit (allowed target) => 400 with real adminService validation message, mutation not called", async () => {
    const { adminController, counters } = loadFreshAdminController();
    const req = mockReq(SUPER_ADMIN_ID, { email: REGULAR_USER_EMAIL, buildLimit: "abc", exportLimit: 5 });
    const res = mockRes();

    await adminController.setLimits(req, res);

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, {
        success: false,
        message: "buildLimit and exportLimit must both be finite numbers"
    });
    assert.equal(counters.updateLimits, 0);
});

test("setLimits: guard order proof — permission denied takes precedence over invalid input (403, not 400)", async () => {
    const { adminController, counters } = loadFreshAdminController();
    const req = mockReq(REGULAR_ADMIN_ID, { email: "super@example.com", buildLimit: "not-a-number", exportLimit: "also-not-a-number" });
    const res = mockRes();

    await adminController.setLimits(req, res);

    // Confirms the actual current order: target lookup -> RBAC -> validation.
    // If validation ran first, this would be 400; the real code checks RBAC
    // before ever calling the function that validates the numbers.
    assert.equal(res.statusCode, 403);
    assert.equal(counters.updateLimits, 0);
});

test("setLimits: valid allowed request => 200 with actual returned bonusBuilds/bonusExports, mutation called exactly once", async () => {
    const { adminController, counters } = loadFreshAdminController();
    const req = mockReq(SUPER_ADMIN_ID, { email: REGULAR_USER_EMAIL, buildLimit: 10, exportLimit: 7 });
    const res = mockRes();

    await adminController.setLimits(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { success: true, message: "Limits updated", bonusBuilds: 10, bonusExports: 7 });
    assert.equal(counters.updateLimits, 1);
});

// ---------------------------------------------------------------------------
// F. CHANGE ROLE
// ---------------------------------------------------------------------------

test("changeRole: target not found => 404, mutation not called", async () => {
    const { adminController, counters } = loadFreshAdminController();
    const req = mockReq(SUPER_ADMIN_ID, { email: "nobody@example.com", role: "Tester" });
    const res = mockRes();

    await adminController.changeRole(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal(counters.updateRoleAndPlan, 0);
});

test("changeRole: permission denied (Regular Admin -> Super Admin) => 403, mutation not called", async () => {
    const { adminController, counters } = loadFreshAdminController();
    const req = mockReq(REGULAR_ADMIN_ID, { email: "super@example.com", role: "Tester" });
    const res = mockRes();

    await adminController.changeRole(req, res);

    assert.equal(res.statusCode, 403);
    assert.equal(counters.updateRoleAndPlan, 0);
});

test("changeRole: successful allowed mutation (Super Admin -> Regular User, User to Tester) => 200, mutation called exactly once", async () => {
    const { adminController, counters } = loadFreshAdminController();
    const req = mockReq(SUPER_ADMIN_ID, { email: REGULAR_USER_EMAIL, role: "Tester" });
    const res = mockRes();

    await adminController.changeRole(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, "Role updated");
    assert.equal(res.body.user.role, "Tester");
    assert.equal(res.body.user.plan.name, "Tester");
    assert.equal(counters.updateRoleAndPlan, 1);
});

// ---------------------------------------------------------------------------
// G. DELETE
// ---------------------------------------------------------------------------

test("deleteUser: target not found => 404, mutation not called", async () => {
    const { adminController, counters } = loadFreshAdminController();
    const req = mockReq(SUPER_ADMIN_ID, { email: "nobody@example.com" });
    const res = mockRes();

    await adminController.deleteUser(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal(counters.deleteByEmail, 0);
});

test("deleteUser: permission denied (Regular Admin -> Super Admin) => 403, mutation not called", async () => {
    const { adminController, counters } = loadFreshAdminController();
    const req = mockReq(REGULAR_ADMIN_ID, { email: "super@example.com" });
    const res = mockRes();

    await adminController.deleteUser(req, res);

    assert.equal(res.statusCode, 403);
    assert.equal(counters.deleteByEmail, 0);
});

test("deleteUser: successful allowed mutation (Super Admin -> Regular User) => 200, mutation called exactly once", async () => {
    const { adminController, counters } = loadFreshAdminController();
    const req = mockReq(SUPER_ADMIN_ID, { email: REGULAR_USER_EMAIL });
    const res = mockRes();

    await adminController.deleteUser(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { success: true, message: "User deleted" });
    assert.equal(counters.deleteByEmail, 1);
});
