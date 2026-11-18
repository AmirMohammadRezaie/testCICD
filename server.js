const { createApp } = require("./src/app");

const port = Number(process.env.PORT) || 3000;

const app = createApp({
  apiKey: process.env.CHAT_API_KEY,
  baseUrl: process.env.CHAT_API_BASE_URL,
  model: process.env.CHAT_MODEL,
  timeoutMs: Number(process.env.CHAT_TIMEOUT_MS) || 20000,
  trustProxy: process.env.TRUST_PROXY === "true",
});

app.listen(port, () => {
  const configured = Boolean(
    process.env.CHAT_API_KEY && process.env.CHAT_API_BASE_URL && process.env.CHAT_MODEL
  );
  console.log(`Server running at http://localhost:${port}`);
  console.log(
    configured
      ? "Chat API: configured"
      : "Chat API: not configured (set CHAT_API_KEY, CHAT_API_BASE_URL and CHAT_MODEL)"
  );
});
