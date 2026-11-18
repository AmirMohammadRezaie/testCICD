// Calls an OpenAI-compatible Chat Completions API.
// This is the only file that knows the external API's request/response format.

class AiError extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind; // "timeout" | "upstream" | "bad_response"
  }
}

async function getChatReply({ baseUrl, apiKey, model, messages, timeoutMs }) {
  const url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      throw new AiError("timeout", "AI API request timed out");
    }
    throw new AiError("upstream", "Could not reach the AI API");
  }

  if (!response.ok) {
    // Drain the body without keeping it: it is never logged or returned.
    await response.body?.cancel().catch(() => {});
    throw new AiError("upstream", `AI API responded with HTTP ${response.status}`);
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new AiError("bad_response", "AI API returned invalid JSON");
  }

  const reply = data?.choices?.[0]?.message?.content;
  if (typeof reply !== "string" || reply.trim() === "") {
    throw new AiError("bad_response", "AI API returned no reply text");
  }
  return reply.trim();
}

module.exports = { getChatReply, AiError };
