"use strict";

/**
 * Phase 2.2 — Regression tests for services/hierarchyService.js
 *
 * These tests load the REAL production hierarchyService.js and verify its
 * actual canManage/canDelete behavior against a deterministic, in-memory
 * fixture set. No PostgreSQL connection, no network access, no environment
 * secrets are used or required.
 *
 * Stubbing strategy:
 * hierarchyService.js does `require("../repositories/userRepository")` at
 * module load time. To avoid ever touching the real repository (which talks
 * to Postgres), this file resolves the exact absolute path Node would use
 * for that require() call, and pre-populates Node's module cache at that
 * path with an in-memory stub BEFORE hierarchyService.js is required. When
 * hierarchyService.js then runs its own require("../repositories/userRepository"),
 * Node finds the path already cached and returns the stub's exports instead
 * of loading the real file. hierarchyService.js itself is never modified,
 * copied, or monkey-patched — only its dependency is substituted.
 *
 * Only the two repository functions hierarchyService.js actually calls are
 * stubbed: findActiveAdmins() and findById(id). No unrelated functions are
 * provided.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");

// ---------------------------------------------------------------------------
// Deterministic fixtures
// ---------------------------------------------------------------------------

const SUPER_ADMIN = {
    id: "super-admin",
    role: "Admin",
    status: "Active",
    createdAt: "2026-07-01T00:00:00.000Z" // earliest -> Super Admin
};

const REGULAR_ADMIN = {
    id: "admin-2",
    role: "Admin",
    status: "Active",
    createdAt: "2026-07-05T00:00:00.000Z"
};

const SECOND_ADMIN = {
    id: "admin-3",
    role: "Admin",
    status: "Active",
    createdAt: "2026-07-10T00:00:00.000Z"
};

const REGULAR_USER = {
    id: "user-1",
    role: "User",
    status: "Active"
};

const BLOCKED_USER = {
    id: "user-2",
    role: "User",
    status: "Blocked"
};

const ALL_USERS = [
    SUPER_ADMIN,
    REGULAR_ADMIN,
    SECOND_ADMIN,
    REGULAR_USER,
    BLOCKED_USER
];

// All three admins are Active -> represents the "multiple active admins"
// scenario for TEST 11. findActiveAdmins() must return them ordered by
// createdAt ASC, mirroring the real repository's `ORDER BY created_at ASC`,
// since hierarchyService.getSuperAdmin() simply takes index [0].
const ACTIVE_ADMINS_MULTI = [SUPER_ADMIN, REGULAR_ADMIN, SECOND_ADMIN];

// A single-admin variant of the fixture set, used only for TEST 10 (sole
// Active Admin self-delete), where exactly one Active Admin must exist.
const ACTIVE_ADMINS_SOLE = [SUPER_ADMIN];

function makeStubRepository(activeAdmins) {
    return {
        async findActiveAdmins() {
            return activeAdmins;
        },
        async findById(id) {
            return ALL_USERS.find((u) => u.id === id) || null;
        }
    };
}

// ---------------------------------------------------------------------------
// require.cache injection
// ---------------------------------------------------------------------------

const USER_REPOSITORY_PATH = require.resolve(
    path.join(__dirname, "..", "repositories", "userRepository.js")
);
const HIERARCHY_SERVICE_PATH = require.resolve(
    path.join(__dirname, "..", "services", "hierarchyService.js")
);

function loadHierarchyServiceWithStub(activeAdmins) {

    // Remove any previously cached copies so each call gets a fresh load
    // against the freshly-injected stub (keeps tests independent of order).
    delete require.cache[HIERARCHY_SERVICE_PATH];
    delete require.cache[USER_REPOSITORY_PATH];

    const stub = makeStubRepository(activeAdmins);

    const fakeModule = new Module(USER_REPOSITORY_PATH);
    fakeModule.filename = USER_REPOSITORY_PATH;
    fakeModule.loaded = true;
    fakeModule.exports = stub;

    require.cache[USER_REPOSITORY_PATH] = fakeModule;

    // eslint-disable-next-line global-require, import/no-dynamic-require
    return require(HIERARCHY_SERVICE_PATH);

}

test.after(() => {
    // Leave the module cache as we found it so this test file has no
    // side effects on any other test file that might run in-process.
    delete require.cache[HIERARCHY_SERVICE_PATH];
    delete require.cache[USER_REPOSITORY_PATH];
});

// ---------------------------------------------------------------------------
// canManage
// ---------------------------------------------------------------------------

test("canManage: Regular Admin -> Regular User => true", async () => {
    const hierarchyService = loadHierarchyServiceWithStub(ACTIVE_ADMINS_MULTI);
    const result = await hierarchyService.canManage(
        REGULAR_ADMIN.id,
        REGULAR_USER.id
    );
    assert.equal(result, true);
});

test("canManage: Regular Admin -> another Active Admin => false", async () => {
    const hierarchyService = loadHierarchyServiceWithStub(ACTIVE_ADMINS_MULTI);
    const result = await hierarchyService.canManage(
        REGULAR_ADMIN.id,
        SECOND_ADMIN.id
    );
    assert.equal(result, false);
});

test("canManage: Super Admin -> another Active Admin => true", async () => {
    const hierarchyService = loadHierarchyServiceWithStub(ACTIVE_ADMINS_MULTI);
    const result = await hierarchyService.canManage(
        SUPER_ADMIN.id,
        REGULAR_ADMIN.id
    );
    assert.equal(result, true);
});

test("canManage: Regular Admin -> Super Admin => false", async () => {
    const hierarchyService = loadHierarchyServiceWithStub(ACTIVE_ADMINS_MULTI);
    const result = await hierarchyService.canManage(
        REGULAR_ADMIN.id,
        SUPER_ADMIN.id
    );
    assert.equal(result, false);
});

test("canManage: Regular Admin -> Blocked Regular User => true (current implementation intentionally does not check target status)", async () => {
    const hierarchyService = loadHierarchyServiceWithStub(ACTIVE_ADMINS_MULTI);
    const result = await hierarchyService.canManage(
        REGULAR_ADMIN.id,
        BLOCKED_USER.id
    );
    assert.equal(result, true);
});

// ---------------------------------------------------------------------------
// canDelete
// ---------------------------------------------------------------------------

test("canDelete: Regular Admin -> Regular User => true", async () => {
    const hierarchyService = loadHierarchyServiceWithStub(ACTIVE_ADMINS_MULTI);
    const result = await hierarchyService.canDelete(
        REGULAR_ADMIN.id,
        REGULAR_USER.id
    );
    assert.equal(result, true);
});

test("canDelete: Regular Admin -> another Active Admin => false", async () => {
    const hierarchyService = loadHierarchyServiceWithStub(ACTIVE_ADMINS_MULTI);
    const result = await hierarchyService.canDelete(
        REGULAR_ADMIN.id,
        SECOND_ADMIN.id
    );
    assert.equal(result, false);
});

test("canDelete: Super Admin -> another Active Admin => true", async () => {
    const hierarchyService = loadHierarchyServiceWithStub(ACTIVE_ADMINS_MULTI);
    const result = await hierarchyService.canDelete(
        SUPER_ADMIN.id,
        REGULAR_ADMIN.id
    );
    assert.equal(result, true);
});

test("canDelete: Regular Admin -> Super Admin => false", async () => {
    const hierarchyService = loadHierarchyServiceWithStub(ACTIVE_ADMINS_MULTI);
    const result = await hierarchyService.canDelete(
        REGULAR_ADMIN.id,
        SUPER_ADMIN.id
    );
    assert.equal(result, false);
});

test("canDelete: Sole Active Admin -> self => false", async () => {
    const hierarchyService = loadHierarchyServiceWithStub(ACTIVE_ADMINS_SOLE);
    const result = await hierarchyService.canDelete(
        SUPER_ADMIN.id,
        SUPER_ADMIN.id
    );
    assert.equal(result, false);
});

test("canDelete: Admin self-delete with multiple Active Admins present => true (current implementation: self-target check only compares admins.length > 1, independent of Super Admin status)", async () => {
    const hierarchyService = loadHierarchyServiceWithStub(ACTIVE_ADMINS_MULTI);
    const result = await hierarchyService.canDelete(
        REGULAR_ADMIN.id,
        REGULAR_ADMIN.id
    );
    assert.equal(result, true);
});
