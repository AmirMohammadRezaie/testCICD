// TEMPORARY: this test fails on purpose to check that branch protection
// blocks a pull request when CI fails. Keep it on the test/ci-failure branch only.
const { test } = require("node:test");
const assert = require("node:assert");

test("intentional failure", () => {
  assert.fail("Intentional CI failure to verify branch protection");
});
