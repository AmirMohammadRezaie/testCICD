const path = require("node:path");
const express = require("express");
const { getChatReply, AiError } = require("./ai-client");
const { createRateLimiter } = require("./rate-limit");

const ROOT = path.join(__dirname, "..");

// Only these files are served to the browser. Everything else in the project
// (server code, package.json, .env, tests) stays private.
const PUBLIC_FILES = ["index.html", "style.css", "script.js", "chat.js"];

const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 2000;
const SYSTEM_PROMPT =
  "You are a friendly, concise assistant on a small demo website. Keep answers short and helpful.";

function validateMessages(body) {
  const messages = body?.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return { error: "Request must include a non-empty \"messages\" array." };
  }
  if (messages.length > MAX_MESSAGES) {
    return { error: `Conversation is too long (max ${MAX_MESSAGES} messages).` };
  }

  const clean = [];
  for (const msg of messages) {
    if (!msg || (msg.role !== "user" && msg.role !== "assistant")) {
      return { error: "Each message role must be \"user\" or \"assistant\"." };
    }
    if (typeof msg.content !== "string" || msg.content.trim() === "") {
      return { error: "Each message must have non-empty text content." };
    }
    if (msg.content.length > MAX_MESSAGE_LENGTH) {
      return { error: `Messages must be ${MAX_MESSAGE_LENGTH} characters or fewer.` };
    }
    clean.push({ role: msg.role, content: msg.content.trim() });
  }

  if (clean[clean.length - 1].role !== "user") {
    return { error: "The last message must be from the user." };
  }
  return { messages: clean };
}

function createApp(config) {
  const {
    apiKey,
    baseUrl,
    model,
    timeoutMs = 20000,
    rateLimit = { windowMs: 60_000, max: 10 },
    trustProxy = false,
  } = config;
  const chatConfigured = Boolean(apiKey && baseUrl && model);

  const app = express();
  app.disable("x-powered-by");
  if (trustProxy) app.set("trust proxy", 1);

  app.use((req, res, next) => {
    res.set({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'",
    });
    next();
  });

  // --- Frontend -----------------------------------------------------------
  app.get("/", (req, res) => res.sendFile(path.join(ROOT, "index.html")));
  for (const file of PUBLIC_FILES) {
    app.get(`/${file}`, (req, res) => res.sendFile(path.join(ROOT, file)));
  }

  // --- API ----------------------------------------------------------------
  app.post(
    "/api/chat",
    createRateLimiter(rateLimit),
    express.json({ limit: "32kb" }),
    async (req, res) => {
      const result = validateMessages(req.body);
      if (result.error) return res.status(400).json({ error: result.error });

      if (!chatConfigured) {
        return res
          .status(503)
          .json({ error: "The chatbot is not configured on the server yet." });
      }

      try {
        const reply = await getChatReply({
          baseUrl,
          apiKey,
          model,
          timeoutMs,
          messages: [{ role: "system", content: SYSTEM_PROMPT }, ...result.messages],
        });
        res.json({ reply });
      } catch (err) {
        // Log only our own short message: never the key, request or upstream body.
        console.error(`[chat] ${err instanceof AiError ? err.message : "Unexpected error"}`);
        if (err instanceof AiError && err.kind === "timeout") {
          return res
            .status(504)
            .json({ error: "The AI took too long to respond. Please try again." });
        }
        res
          .status(502)
          .json({ error: "The AI service is unavailable right now. Please try again later." });
      }
    }
  );

  app.use("/api", (req, res) => res.status(404).json({ error: "Not found." }));
  app.use((req, res) => res.status(404).type("text").send("Not found"));

  // Malformed JSON, oversized bodies and anything unexpected.
  app.use((err, req, res, next) => {
    if (err.type === "entity.parse.failed") {
      return res.status(400).json({ error: "Request body must be valid JSON." });
    }
    if (err.type === "entity.too.large") {
      return res.status(413).json({ error: "Request is too large." });
    }
    console.error("[server] Unexpected error");
    res.status(500).json({ error: "Something went wrong." });
  });

  return app;
}

module.exports = { createApp, validateMessages, MAX_MESSAGES, MAX_MESSAGE_LENGTH };
