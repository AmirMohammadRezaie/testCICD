const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const chatJs = fs.readFileSync(path.join(root, "chat.js"), "utf8");

test("index.html has the chatbot section and loads chat.js", () => {
  assert.match(html, /<section[^>]*id="chat"/);
  assert.match(html, /id="chatForm"/);
  assert.match(html, /<script src="chat.js"><\/script>/);
});

test("chat.js talks only to the local /api/chat endpoint", () => {
  assert.ok(chatJs.includes('fetch("/api/chat"'));
  assert.ok(!/https?:\/\//.test(chatJs), "chat.js must not call external URLs");
  assert.ok(!/CHAT_API_KEY|Authorization|Bearer/i.test(chatJs), "chat.js must not handle credentials");
});
