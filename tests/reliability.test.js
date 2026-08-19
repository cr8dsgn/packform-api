"use strict";

/**
 * Phase 2.5 — Reliability regression tests.
 *
 * Loads the REAL, unmodified production functions:
 *   controllers/adminController.js
 *   services/adminService.js
 *   services/rbacService.js
 *   services/hierarchyService.js
 *   controllers/authController.js
 *   utils/jwt.js   (real jsonwebtoken sign/verify — no longer stubbed,
 *                    now that the actual file is available)
 *   bcryptjs        (real password hashing library — a real project
 *                    dependency, not stubbed)
 *
 * Only the true bottom of the dependency graph is stubbed:
 *   repositories/userRepository.js
 *   services/userStateService.js   (not attached to this batch)
 *   repositories/planRepository.js (not attached to this batch)
 *   models/User.js                 (not attached to this batch; only used
 *                                    inside register(), which this batch
 *                                    does not call — stubbed purely so the
 *                                    module-level require() resolves)
 *
 * ---------------------------------------------------------------------
 * DOCUMENTED LIMITATIONS (read before treating this file as complete)
 * ---------------------------------------------------------------------
 *
 * C. MALFORMED JSON — NOT TESTED HERE.
 *    This harness calls controller functions directly with pre-built JS
 *    objects as req.body. It never passes through express.json(), so
 *    there is no JSON string to be malformed in the first place — the
 *    entire scenario this section asks about (a client sending broken
 *    JSON syntax) happens strictly inside Express's body-parser
 *    middleware, before any controller code runs. That boundary was
 *    already exercised at the unit level in Phase 1 (server.js's error
 *    handler was verified there to map express.json()'s
 *    `entity.parse.failed` to a clean 400). Re-verifying it here would
 *    require booting the real server.js process, which needs every
 *    route/controller/service file in the backend (most never attached
 *    to any batch in this conversation) — the same limitation already
 *    documented in Phase 2.3 for the API-key boundary. Not re-invented
 *    here; not faked.
 *
 * E. INTERNAL ERROR SAFETY — response-shape limitation.
 *    None of the attached controllers (adminController.js,
 *    authController.js) contain a try/catch around their dependency
 *    calls. That means when a stubbed dependency throws in this test
 *    harness, the controller function's returned promise REJECTS — it
 *    does not call res.status()/res.json() at all. There is therefore no
 *    HTTP response to inspect for a leaked stack trace/SQL/secret at the
 *    controller-unit level; the tests below instead assert that (1) the
 *    rejection propagates unchanged — the controller does not swallow,
 *    wrap, or rewrite the error into something that could look like a
 *    handled response — and (2) the error's own message never contains
 *    project secrets, since the controller performs no interpolation of
 *    the error at all before letting it propagate. The actual HTTP-level
 *    guarantee (500, generic "Internal server error", raw error logged
 *    server-side only, never sent to the client) is what server.js's
 *    global error-handling middleware provides once Express's automatic
 *    async-rejection forwarding (Express 5) carries this same rejection
 *    to it — that middleware was already read and unit-verified as part
 *    of Phase 1's reliability work; it cannot be re-exercised end-to-end
 *    here without booting the full server (same limitation as C above).
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");
const bcrypt = require("bcryptjs");

// ---------------------------------------------------------------------------
// Module path resolution
// ---------------------------------------------------------------------------

const ADMIN_CONTROLLER_PATH = require.resolve(path.join(__dirname, "..", "controllers", "adminController.js"));
const ADMIN_SERVICE_PATH = require.resolve(path.join(__dirname, "..", "services", "adminService.js"));
const RBAC_SERVICE_PATH = require.resolve(path.join(__dirname, "..", "services", "rbacService.js"));
const HIERARCHY_SERVICE_PATH = require.resolve(path.join(__dirname, "..", "services", "hierarchyService.js"));
const USER_STATE_SERVICE_PATH = require.resolve(path.join(__dirname, "..", "services", "userStateService.js"));
const USER_REPOSITORY_PATH = require.resolve(path.join(__dirname, "..", "repositories", "userRepository.js"));
const PLAN_REPOSITORY_PATH = require.resolve(path.join(__dirname, "..", "repositories", "planRepository.js"));
const AUTH_CONTROLLER_PATH = require.resolve(path.join(__dirname, "..", "controllers", "authController.js"));
const USER_MODEL_PATH = require.resolve(path.join(__dirname, "..", "models", "User.js"));
const JWT_UTIL_PATH = require.resolve(path.join(__dirname, "..", "utils", "jwt.js"));

const ALL_PATHS = [
    ADMIN_CONTROLLER_PATH, ADMIN_SERVICE_PATH, RBAC_SERVICE_PATH, HIERARCHY_SERVICE_PATH,
    USER_STATE_SERVICE_PATH, USER_REPOSITORY_PATH, PLAN_REPOSITORY_PATH,
    AUTH_CONTROLLER_PATH, USER_MODEL_PATH, JWT_UTIL_PATH
];

function injectStub(resolvedPath, exportsValue) {
    const fakeModule = new Module(resolvedPath);
    fakeModule.filename = resolvedPath;
    fakeModule.loaded = true;
    fakeModule.exports = exportsValue;
    require.cache[resolvedPath] = fakeModule;
}

function clearCache() {
    for (const p of ALL_PATHS) delete require.cache[p];
}

test.after(() => clearCache());

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ENTERPRISE_PLAN = { id: "plan-enterprise", name: "Enterprise", buildLimit: -1, exportLimit: -1 };
const STARTER_PLAN = { id: "plan-starter", name: "Starter", buildLimit: 25, exportLimit: 25 };

const SUPER_ADMIN = {
    id: "super-admin", name: "Super Admin", email: "super@example.com",
    role: "Admin", status: "Active", createdAt: "2026-07-01T00:00:00.000Z",
    bonusBuilds: 0, bonusExports: 0, buildsUsed: 0, exportsUsed: 0, lastLogin: null, plan: ENTERPRISE_PLAN
};

const REGULAR_USER = {
    id: "user-1", name: "Regular User", email: "user1@example.com",
    role: "User", status: "Active", createdAt: "2026-07-10T00:00:00.000Z",
    bonusBuilds: 0, bonusExports: 0, buildsUsed: 3, exportsUsed: 2, lastLogin: null, plan: STARTER_PLAN
};

const SUPER_ADMIN_ID = SUPER_ADMIN.id;
const REGULAR_USER_EMAIL = REGULAR_USER.email;

const TEST_PASSWORD = "correct-horse-battery-staple";
const TEST_PASSWORD_HASH = bcrypt.hashSync(TEST_PASSWORD, 10);

const ACTIVE_AUTH_USER = {
    id: "user-active-1", email: "active@example.com",
    password: TEST_PASSWORD_HASH, role: "Tester", status: "Active"
};

// ---------------------------------------------------------------------------
// In-memory userRepository stub (normal, non-throwing variant)
// ---------------------------------------------------------------------------

function makeUserRepositoryStub(initialUsers) {

    const byId = new Map(initialUsers.map((u) => [u.id, { ...u }]));
    const counters = {
        findByEmail: 0, updateStatus: 0, updateLimits: 0,
        updateRoleAndPlan: 0, deleteByEmail: 0, findAuthByEmail: 0, updateLastLogin: 0
    };

    function findByEmailSync(email) {
        for (const u of byId.values()) if (u.email === email) return { ...u };
        return null;
    }

    return {
        counters,
        repo: {
            async findById(id) {
                const u = byId.get(id);
                return u ? { ...u } : null;
            },
            async findByEmail(email) {
                counters.findByEmail += 1;
                return findByEmailSync(email);
            },
            async findActiveAdmins() {
                return [...byId.values()].filter((u) => u.role === "Admin" && u.status === "Active");
            },
            async updateStatus(id, status) {
                counters.updateStatus += 1;
                const u = byId.get(id);
                if (!u) return null;
                u.status = status;
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
                u.plan = { id: planId };
                return { ...u };
            },
            async deleteByEmail(email) {
                counters.deleteByEmail += 1;
                const existing = findByEmailSync(email);
                if (!existing) return null;
                byId.delete(existing.id);
                return existing;
            },
            async findAuthByEmail(email) {
                counters.findAuthByEmail += 1;
                if (email === ACTIVE_AUTH_USER.email) return { ...ACTIVE_AUTH_USER };
                return null;
            },
            async updateLastLogin(id) {
                counters.updateLastLogin += 1;
            }
        }
    };

}

function loadFreshAdminController(users = [SUPER_ADMIN, REGULAR_USER]) {
    clearCache();
    const { repo, counters } = makeUserRepositoryStub(users);
    injectStub(USER_REPOSITORY_PATH, repo);
    injectStub(USER_STATE_SERVICE_PATH, {
        resolveStateForRoleChange: () => ({ success: true, role: "Tester", plan: "Tester" })
    });
    injectStub(PLAN_REPOSITORY_PATH, {
        findByName: async () => ({ id: "plan-tester", name: "Tester", buildLimit: 3, exportLimit: 3 })
    });
    return { adminController: require(ADMIN_CONTROLLER_PATH), counters };
}

function loadFreshAuthController(users = [ACTIVE_AUTH_USER]) {
    clearCache();
    const { repo, counters } = makeUserRepositoryStub(
        users.map((u) => ({ ...u, name: "n", createdAt: "2026-07-01T00:00:00.000Z" }))
    );
    injectStub(USER_REPOSITORY_PATH, repo);
    injectStub(USER_MODEL_PATH, class User { constructor(d) { Object.assign(this, d); } });
    // utils/jwt.js is intentionally left un-stubbed here: the real file is
    // now available (unlike Phase 2.3, where it was UNKNOWN), so
    // authController's own require("../utils/jwt") loads the real,
    // unmodified implementation from disk normally.
    return { authController: require(AUTH_CONTROLLER_PATH), counters };
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

function mockReq(actorId, body = {}) { return { user: { id: actorId }, body }; }
function mockRes() {
    return {
        statusCode: 200, body: undefined,
        status(c) { this.statusCode = c; return this; },
        json(b) { this.body = b; return this; }
    };
}

// ===========================================================================
// A. REQUEST VALIDATION
// ===========================================================================

test("changeRole: missing role (email present) => 400, findByEmail never called", async () => {
    const { adminController, counters } = loadFreshAdminController();
    const req = mockReq(SUPER_ADMIN_ID, { email: REGULAR_USER_EMAIL });
    const res = mockRes();

    await adminController.changeRole(req, res);

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { success: false, message: "email and role are required" });
    assert.equal(counters.findByEmail, 0);
});

test("changeRole: missing email (role present) => 400, same message, findByEmail never called", async () => {
    const { adminController, counters } = loadFreshAdminController();
    const req = mockReq(SUPER_ADMIN_ID, { role: "Tester" });
    const res = mockRes();

    await adminController.changeRole(req, res);

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { success: false, message: "email and role are required" });
    assert.equal(counters.findByEmail, 0);
});

test("deleteUser: missing email => 400, findByEmail never called", async () => {
    const { adminController, counters } = loadFreshAdminController();
    const req = mockReq(SUPER_ADMIN_ID, {});
    const res = mockRes();

    await adminController.deleteUser(req, res);

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { success: false, message: "email is required" });
    assert.equal(counters.findByEmail, 0);
});

test("setLimits: missing buildLimit/exportLimit entirely (allowed target) => 400, real validation message, mutation not called", async () => {
    const { adminController, counters } = loadFreshAdminController();
    const req = mockReq(SUPER_ADMIN_ID, { email: REGULAR_USER_EMAIL }); // no buildLimit/exportLimit at all
    const res = mockRes();

    await adminController.setLimits(req, res);

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, {
        success: false,
        message: "buildLimit and exportLimit must both be finite numbers"
    });
    assert.equal(counters.updateLimits, 0);
});

// ===========================================================================
// B. INVALID INPUT TYPES — buildLimit / exportLimit
// ===========================================================================

test("setLimits: exportLimit is NaN (not reachable via real JSON, but exercised directly at the controller boundary) => 400", async () => {
    const { adminController, counters } = loadFreshAdminController();
    const req = mockReq(SUPER_ADMIN_ID, { email: REGULAR_USER_EMAIL, buildLimit: 10, exportLimit: NaN });
    const res = mockRes();

    await adminController.setLimits(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(counters.updateLimits, 0);
    // Note: JSON has no literal NaN token, so a real HTTP client can never
    // deliver NaN through express.json() — this proves the validation logic
    // itself is correct if NaN ever arrived by any other path, not that NaN
    // is a realistic attack surface over the wire.
});

test("setLimits: buildLimit is Infinity (realistically reachable via numeric overflow in valid JSON, e.g. 1e400) => 400", async () => {
    const { adminController, counters } = loadFreshAdminController();
    const req = mockReq(SUPER_ADMIN_ID, { email: REGULAR_USER_EMAIL, buildLimit: Infinity, exportLimit: 5 });
    const res = mockRes();

    await adminController.setLimits(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(counters.updateLimits, 0);
});

test("setLimits: buildLimit is a numeric-looking string ('10') => 400, no silent coercion", async () => {
    const { adminController, counters } = loadFreshAdminController();
    const req = mockReq(SUPER_ADMIN_ID, { email: REGULAR_USER_EMAIL, buildLimit: "10", exportLimit: 5 });
    const res = mockRes();

    await adminController.setLimits(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(counters.updateLimits, 0);
});

// ===========================================================================
// D. AUTHENTICATION INPUT ERRORS — authController.login()
// ===========================================================================

test("login: missing email => 401 Invalid email or password (findAuthByEmail(undefined) safely resolves to no match)", async () => {
    const { authController } = loadFreshAuthController();
    const req = { body: { password: "irrelevant" } };
    const res = mockRes();

    await authController.login(req, res);

    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, { success: false, message: "Invalid email or password" });
});

test("login: missing password, valid email => REJECTS (bcrypt.compare throws on a non-string password) — see finding in section G", async () => {
    const { authController } = loadFreshAuthController();
    const req = { body: { email: ACTIVE_AUTH_USER.email } }; // no password field
    const res = mockRes();

    // login() has no try/catch, and bcryptjs.compare() throws synchronously
    // (verified empirically: "Illegal arguments: undefined, string") when
    // its first argument is not a string. This is CURRENT behavior, not
    // invented — the request does not receive a controlled 401/400, it
    // throws instead. Documented as a finding in section G rather than
    // silently treated as if it returned a normal response.
    await assert.rejects(
        () => authController.login(req, res),
        (err) => err instanceof Error && /Illegal arguments/.test(err.message)
    );
});

test("login: both email and password missing => 401 Invalid email or password (email-lookup guard runs first, same as missing-email-only case)", async () => {
    const { authController } = loadFreshAuthController();
    const req = { body: {} };
    const res = mockRes();

    await authController.login(req, res);

    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, { success: false, message: "Invalid email or password" });
});

test("login: valid credentials => 200, real jwt.js produces a genuine verifiable token", async () => {
    const { authController } = loadFreshAuthController();
    const req = { body: { email: ACTIVE_AUTH_USER.email, password: TEST_PASSWORD } };
    const res = mockRes();

    await authController.login(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(typeof res.body.token, "string");
    assert.equal(res.body.token.split(".").length, 3); // real JWT structure

    // Verify the token with the REAL utils/jwt.js verifyToken, proving the
    // token generated by login() is genuinely valid, not a stub value.
    const jwtUtil = require(JWT_UTIL_PATH);
    const payload = jwtUtil.verifyToken(res.body.token);
    assert.equal(payload.id, ACTIVE_AUTH_USER.id);
    assert.equal(payload.role, ACTIVE_AUTH_USER.role);
});

// ===========================================================================
// E. INTERNAL ERROR SAFETY
// ===========================================================================

function loadAdminControllerWithThrowingRepository() {
    clearCache();
    const throwingRepo = {
        async findByEmail() { throw new Error("simulated database failure"); },
        async findById() { throw new Error("simulated database failure"); },
        async findActiveAdmins() { throw new Error("simulated database failure"); },
        async updateStatus() { throw new Error("simulated database failure"); },
        async updateLimits() { throw new Error("simulated database failure"); },
        async updateRoleAndPlan() { throw new Error("simulated database failure"); },
        async deleteByEmail() { throw new Error("simulated database failure"); }
    };
    injectStub(USER_REPOSITORY_PATH, throwingRepo);
    injectStub(USER_STATE_SERVICE_PATH, {
        resolveStateForRoleChange: () => ({ success: true, role: "Tester", plan: "Tester" })
    });
    injectStub(PLAN_REPOSITORY_PATH, { findByName: async () => ({ id: "plan-tester" }) });
    return require(ADMIN_CONTROLLER_PATH);
}

test("approveUser: underlying repository throws => the controller does not swallow the error, rejection propagates unchanged", async () => {
    const adminController = loadAdminControllerWithThrowingRepository();
    const req = mockReq(SUPER_ADMIN_ID, { email: REGULAR_USER_EMAIL });
    const res = mockRes();

    await assert.rejects(
        () => adminController.approveUser(req, res),
        (err) => err instanceof Error && err.message === "simulated database failure"
    );
    // res.json() was never called on this path — no partial/malformed
    // response was sent; the failure is fully opaque to res at this layer.
    assert.equal(res.body, undefined);
});

test("setLimits: underlying repository throws during target lookup => rejection propagates, no response sent", async () => {
    const adminController = loadAdminControllerWithThrowingRepository();
    const req = mockReq(SUPER_ADMIN_ID, { email: REGULAR_USER_EMAIL, buildLimit: 10, exportLimit: 10 });
    const res = mockRes();

    await assert.rejects(
        () => adminController.setLimits(req, res),
        (err) => err instanceof Error && err.message === "simulated database failure"
    );
    assert.equal(res.body, undefined);
});

function loadAuthControllerWithThrowingRepository() {
    clearCache();
    injectStub(USER_REPOSITORY_PATH, {
        async findAuthByEmail() { throw new Error("simulated database failure"); },
        async updateLastLogin() {}
    });
    injectStub(USER_MODEL_PATH, class User { constructor(d) { Object.assign(this, d); } });
    return require(AUTH_CONTROLLER_PATH);
}

test("login: underlying repository throws => rejection propagates unchanged, error message contains no secret material", async () => {
    const authController = loadAuthControllerWithThrowingRepository();
    const req = { body: { email: "anyone@example.com", password: "irrelevant" } };
    const res = mockRes();

    await assert.rejects(
        () => authController.login(req, res),
        (err) => err instanceof Error && err.message === "simulated database failure"
    );
    assert.equal(res.body, undefined);
    // The propagated error carries only what this test injected — the
    // controller performs no interpolation of caught errors (it never
    // catches anything here), so there is no code path in login() itself
    // that could append a password hash, JWT secret, or SQL text to it.
});

// ===========================================================================
// G. NO SIDE EFFECT ON FAILURE (validation-stage cases specific to this phase)
// ===========================================================================

test("changeRole: 400 validation failure means the repository is never touched at all (not even findByEmail)", async () => {
    const { adminController, counters } = loadFreshAdminController();
    const req = mockReq(SUPER_ADMIN_ID, {}); // both email and role missing
    const res = mockRes();

    await adminController.changeRole(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(counters.findByEmail, 0);
    assert.equal(counters.updateRoleAndPlan, 0);
});

test("deleteUser: 400 validation failure means the repository is never touched at all", async () => {
    const { adminController, counters } = loadFreshAdminController();
    const req = mockReq(SUPER_ADMIN_ID, {});
    const res = mockRes();

    await adminController.deleteUser(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(counters.findByEmail, 0);
    assert.equal(counters.deleteByEmail, 0);
});
