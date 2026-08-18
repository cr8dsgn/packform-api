"use strict";

/**
 * Phase 2.3 — Authentication regression tests.
 *
 * SCOPE ACTUALLY COVERED (see the "LIMITATIONS" block below for what is
 * intentionally NOT covered and why):
 *
 *   B. authController.login()   — the REAL production function, unmodified.
 *   D. middleware/adminAuth.js  — the REAL production function, unmodified.
 *
 * Both are exercised with their dependency boundaries stubbed via
 * require.cache injection (the same technique used in
 * tests/hierarchyService.test.js), never by reimplementing their internal
 * logic. bcrypt password comparison is NOT stubbed — the real `bcryptjs`
 * package (already a project dependency; no new dependency added) computes
 * a real hash for the fixture password and login() calls the real
 * bcrypt.compare() against it, so the password-check branch is genuinely
 * exercised, not simulated.
 *
 * ---------------------------------------------------------------------
 * LIMITATIONS — read before treating this file as complete coverage
 * ---------------------------------------------------------------------
 *
 * A. API KEY BOUNDARY (server.js) — NOT TESTED HERE.
 *    The API-key check in server.js is inline Express middleware, not an
 *    exported function, so there is no way to call "the real production
 *    check" in isolation without either (a) modifying server.js to expose
 *    it separately — explicitly disallowed by this phase's instructions —
 *    or (b) booting the actual server.js process, which transitively
 *    requires every route/controller/service/repository file in the
 *    backend (routes/build.js, routes/export.js, routes/user.js,
 *    routes/plans.js, utils/postgres.js, services/usageService.js, etc.).
 *    Most of those files were never attached in this conversation, so
 *    reconstructing them to boot a real server would mean guessing their
 *    contents — which risks testing invented behavior instead of the real
 *    implementation. Per this phase's explicit instruction ("if the
 *    current architecture prevents a clean full HTTP integration test
 *    without modifying server.js, do NOT change it... explicitly document
 *    the limitation"), this boundary is documented as untested rather than
 *    faked.
 *
 * C. utils/jwt.js — NOT DIRECTLY UNIT TESTED.
 *    utils/jwt.js was never attached in this conversation. Its actual
 *    exported functions, signing algorithm, and verification behavior are
 *    UNKNOWN. Per this phase's explicit instruction ("Do not invent
 *    exported functions. Only test functions that actually exist."), no
 *    tests are written against assumed jwt.js internals. Both
 *    authController.login() and middleware/adminAuth.js depend on it
 *    (`generateToken` / `verifyToken` respectively); those two dependency
 *    points are stubbed here (see STUBS below) purely so the real
 *    controller/middleware code that CALLS them can be verified. This
 *    confirms login() calls generateToken() and returns its result as
 *    `token`, and confirms adminAuth correctly branches on verifyToken()
 *    succeeding vs throwing — but it does not confirm anything about
 *    jwt.js's own internal correctness, which remains unverified pending
 *    that file being made available.
 *
 * models/User.js, repositories/userRepository.js, services/userService.js
 * were also never attached. Where authController.js/adminAuth.js require
 * them, they are stubbed at the exact function names actually called
 * (findAuthByEmail, updateLastLogin, getUserById) with in-memory fixtures —
 * the same minimal-surface-stub principle used in Phase 2.2. Every stub
 * file on disk also throws immediately if it is ever actually loaded for
 * real, as a safety net proving the require.cache injection worked.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");
const bcrypt = require("bcryptjs");

// ---------------------------------------------------------------------------
// Module path resolution (mirrors the real project layout)
// ---------------------------------------------------------------------------

const AUTH_CONTROLLER_PATH = require.resolve(
    path.join(__dirname, "..", "controllers", "authController.js")
);
const ADMIN_AUTH_PATH = require.resolve(
    path.join(__dirname, "..", "middleware", "adminAuth.js")
);
const USER_MODEL_PATH = require.resolve(
    path.join(__dirname, "..", "models", "User.js")
);
const USER_REPOSITORY_PATH = require.resolve(
    path.join(__dirname, "..", "repositories", "userRepository.js")
);
const USER_SERVICE_PATH = require.resolve(
    path.join(__dirname, "..", "services", "userService.js")
);
const JWT_UTIL_PATH = require.resolve(
    path.join(__dirname, "..", "utils", "jwt.js")
);

function injectStub(resolvedPath, exportsValue) {
    const fakeModule = new Module(resolvedPath);
    fakeModule.filename = resolvedPath;
    fakeModule.loaded = true;
    fakeModule.exports = exportsValue;
    require.cache[resolvedPath] = fakeModule;
}

function clearCache(...resolvedPaths) {
    for (const p of resolvedPaths) {
        delete require.cache[p];
    }
}

// ---------------------------------------------------------------------------
// Deterministic fixtures
// ---------------------------------------------------------------------------

const TEST_PASSWORD = "correct-horse-battery-staple";
const TEST_PASSWORD_HASH = bcrypt.hashSync(TEST_PASSWORD, 10);

const ACTIVE_AUTH_USER = {
    id: "user-active-1",
    email: "active@example.com",
    password: TEST_PASSWORD_HASH,
    role: "Tester",
    status: "Active"
};

const PENDING_AUTH_USER = {
    id: "user-pending-1",
    email: "pending@example.com",
    password: TEST_PASSWORD_HASH,
    role: "Tester",
    status: "Pending"
};

const GENERATED_TOKEN = "stub-generated-token";

// ---------------------------------------------------------------------------
// Minimal mock Express req/res
// ---------------------------------------------------------------------------

function mockReq(overrides = {}) {
    return {
        body: {},
        headers: {},
        ...overrides
    };
}

function mockRes() {
    return {
        statusCode: 200,
        body: undefined,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.body = payload;
            return this;
        }
    };
}

// ---------------------------------------------------------------------------
// B. LOGIN REGRESSION — authController.login()
// ---------------------------------------------------------------------------

function loadAuthControllerWithStubs({ findAuthByEmailResult, updateLastLoginCalls }) {

    clearCache(
        AUTH_CONTROLLER_PATH,
        USER_MODEL_PATH,
        USER_REPOSITORY_PATH,
        JWT_UTIL_PATH
    );

    // models/User.js is required at module load time by authController.js
    // (used only inside register(), which this batch does not exercise),
    // but the require() call itself must resolve or authController.js
    // cannot load at all.
    injectStub(USER_MODEL_PATH, class User {
        constructor(data) {
            Object.assign(this, data);
        }
    });

    injectStub(USER_REPOSITORY_PATH, {
        async findAuthByEmail() {
            return findAuthByEmailResult;
        },
        async updateLastLogin(id) {
            if (updateLastLoginCalls) {
                updateLastLoginCalls.push(id);
            }
        }
    });

    injectStub(JWT_UTIL_PATH, {
        generateToken() {
            return GENERATED_TOKEN;
        }
    });

    return require(AUTH_CONTROLLER_PATH);

}

test("login: user not found => 401 Invalid email or password", async () => {
    const authController = loadAuthControllerWithStubs({
        findAuthByEmailResult: null
    });
    const req = mockReq({ body: { email: "nobody@example.com", password: "irrelevant" } });
    const res = mockRes();

    await authController.login(req, res);

    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, {
        success: false,
        message: "Invalid email or password"
    });
});

test("login: incorrect password => 401 Invalid email or password", async () => {
    const authController = loadAuthControllerWithStubs({
        findAuthByEmailResult: ACTIVE_AUTH_USER
    });
    const req = mockReq({
        body: { email: ACTIVE_AUTH_USER.email, password: "definitely-wrong-password" }
    });
    const res = mockRes();

    await authController.login(req, res);

    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, {
        success: false,
        message: "Invalid email or password"
    });
});

test("login: pending account, correct password => 403 pending-approval message", async () => {
    const authController = loadAuthControllerWithStubs({
        findAuthByEmailResult: PENDING_AUTH_USER
    });
    const req = mockReq({
        body: { email: PENDING_AUTH_USER.email, password: TEST_PASSWORD }
    });
    const res = mockRes();

    await authController.login(req, res);

    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.body, {
        success: false,
        message: "Your account is pending administrator approval.",
        status: "Pending"
    });
});

test("login: valid active user => 200, success true, token present, updateLastLogin called", async () => {
    const updateLastLoginCalls = [];
    const authController = loadAuthControllerWithStubs({
        findAuthByEmailResult: ACTIVE_AUTH_USER,
        updateLastLoginCalls
    });
    const req = mockReq({
        body: { email: ACTIVE_AUTH_USER.email, password: TEST_PASSWORD }
    });
    const res = mockRes();

    await authController.login(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.token, GENERATED_TOKEN);
    assert.deepEqual(updateLastLoginCalls, [ACTIVE_AUTH_USER.id]);
});

// ---------------------------------------------------------------------------
// D. AUTHORIZATION BOUNDARY — middleware/adminAuth.js
// ---------------------------------------------------------------------------

function loadAdminAuthWithStubs({ verifyTokenImpl, getUserByIdResult }) {

    clearCache(
        ADMIN_AUTH_PATH,
        JWT_UTIL_PATH,
        USER_SERVICE_PATH
    );

    injectStub(JWT_UTIL_PATH, {
        verifyToken: verifyTokenImpl
    });

    injectStub(USER_SERVICE_PATH, {
        async getUserById() {
            return getUserByIdResult;
        }
    });

    return require(ADMIN_AUTH_PATH);

}

function throwingVerify() {
    throw new Error("invalid signature");
}

function okVerify(payload) {
    return () => payload;
}

test("adminAuth: missing Authorization header => 401 Authorization token required", async () => {
    const adminAuth = loadAdminAuthWithStubs({
        verifyTokenImpl: throwingVerify,
        getUserByIdResult: null
    });
    const req = mockReq({ headers: {} });
    const res = mockRes();
    let nextCalled = false;

    await adminAuth(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, {
        success: false,
        message: "Authorization token required"
    });
    assert.equal(nextCalled, false);
});

test("adminAuth: malformed Authorization header (no Bearer prefix) => 401 Invalid token", async () => {
    // authHeader.replace("Bearer ", "") is a no-op here, so the full
    // malformed string is passed to verifyToken() as-is, which rejects it —
    // this reflects the actual current implementation, not an invented one.
    const adminAuth = loadAdminAuthWithStubs({
        verifyTokenImpl: throwingVerify,
        getUserByIdResult: null
    });
    const req = mockReq({ headers: { authorization: "garbage-not-bearer-format" } });
    const res = mockRes();
    let nextCalled = false;

    await adminAuth(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, {
        success: false,
        message: "Invalid token"
    });
    assert.equal(nextCalled, false);
});

test("adminAuth: invalid Bearer token => 401 Invalid token", async () => {
    const adminAuth = loadAdminAuthWithStubs({
        verifyTokenImpl: throwingVerify,
        getUserByIdResult: null
    });
    const req = mockReq({ headers: { authorization: "Bearer some.invalid.token" } });
    const res = mockRes();
    let nextCalled = false;

    await adminAuth(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, {
        success: false,
        message: "Invalid token"
    });
    assert.equal(nextCalled, false);
});

test("adminAuth: valid token, user not found => 401 User not found", async () => {
    const adminAuth = loadAdminAuthWithStubs({
        verifyTokenImpl: okVerify({ id: "ghost-id" }),
        getUserByIdResult: null
    });
    const req = mockReq({ headers: { authorization: "Bearer valid.token.value" } });
    const res = mockRes();
    let nextCalled = false;

    await adminAuth(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, {
        success: false,
        message: "User not found"
    });
    assert.equal(nextCalled, false);
});

test("adminAuth: valid token, non-Active user => 403 User is blocked", async () => {
    const adminAuth = loadAdminAuthWithStubs({
        verifyTokenImpl: okVerify({ id: "admin-1" }),
        getUserByIdResult: { id: "admin-1", role: "Admin", status: "Blocked" }
    });
    const req = mockReq({ headers: { authorization: "Bearer valid.token.value" } });
    const res = mockRes();
    let nextCalled = false;

    await adminAuth(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.body, {
        success: false,
        message: "User is blocked",
        status: "Blocked"
    });
    assert.equal(nextCalled, false);
});

test("adminAuth: valid token, Active non-Admin user => 403 Admin access required", async () => {
    const adminAuth = loadAdminAuthWithStubs({
        verifyTokenImpl: okVerify({ id: "user-1" }),
        getUserByIdResult: { id: "user-1", role: "User", status: "Active" }
    });
    const req = mockReq({ headers: { authorization: "Bearer valid.token.value" } });
    const res = mockRes();
    let nextCalled = false;

    await adminAuth(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.body, {
        success: false,
        message: "Admin access required"
    });
    assert.equal(nextCalled, false);
});

test("adminAuth: valid token, Active Admin user => next() called, req.user set", async () => {
    const activeAdmin = { id: "admin-1", role: "Admin", status: "Active" };
    const adminAuth = loadAdminAuthWithStubs({
        verifyTokenImpl: okVerify({ id: "admin-1" }),
        getUserByIdResult: activeAdmin
    });
    const req = mockReq({ headers: { authorization: "Bearer valid.token.value" } });
    const res = mockRes();
    let nextCalled = false;

    await adminAuth(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, true);
    assert.deepEqual(req.user, activeAdmin);
    // No status()/json() call should have happened on the success path.
    assert.equal(res.body, undefined);
});

test.after(() => {
    clearCache(
        AUTH_CONTROLLER_PATH,
        ADMIN_AUTH_PATH,
        USER_MODEL_PATH,
        USER_REPOSITORY_PATH,
        USER_SERVICE_PATH,
        JWT_UTIL_PATH
    );
});
