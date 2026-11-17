const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const indexPath = path.join(root, "index.html");
const scriptPath = path.join(root, "script.js");

test("index.html exists", () => {
  assert.ok(fs.existsSync(indexPath), "index.html should exist in the project root");
});

test('index.html contains "Hello World!"', () => {
  const html = fs.readFileSync(indexPath, "utf8");
  assert.ok(html.includes("Hello World!"), 'index.html should contain "Hello World!"');
});

test('script.js contains the "It works!" message', () => {
  const js = fs.readFileSync(scriptPath, "utf8");
  assert.ok(js.includes("It works!"), 'script.js should contain "It works!"');
});
