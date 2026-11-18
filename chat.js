// Chatbot UI. Talks only to this site's own backend at /api/chat;
// no API keys or external AI URLs are ever used in the browser.
(() => {
  const MAX_HISTORY = 20;
  const REQUEST_TIMEOUT_MS = 30000;

  const log = document.getElementById("chatLog");
  const form = document.getElementById("chatForm");
  const input = document.getElementById("chatInput");
  const sendButton = document.getElementById("chatSend");

  const history = []; // [{ role: "user" | "assistant", content }]

  function addMessage(text, kind) {
    const el = document.createElement("p");
    el.className = `chat-msg chat-msg-${kind}`;
    el.textContent = text; // textContent, never innerHTML: replies can't inject HTML
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function showTyping() {
    const el = document.createElement("div");
    el.className = "chat-msg chat-msg-assistant chat-typing";
    el.setAttribute("aria-label", "Assistant is typing");
    el.append(document.createElement("span"), document.createElement("span"), document.createElement("span"));
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function setBusy(busy) {
    input.disabled = busy;
    sendButton.disabled = busy;
    if (!busy) input.focus();
  }

  async function sendToBackend(messages) {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      // Non-JSON response; handled below.
    }

    if (!response.ok || typeof data?.reply !== "string") {
      throw new Error(data?.error || "Something went wrong. Please try again.");
    }
    return data.reply;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    addMessage(text, "user");
    history.push({ role: "user", content: text });

    setBusy(true);
    const typing = showTyping();

    try {
      const reply = await sendToBackend(history.slice(-MAX_HISTORY));
      typing.remove();
      addMessage(reply, "assistant");
      history.push({ role: "assistant", content: reply });
    } catch (err) {
      typing.remove();
      // Drop the failed message from history so the conversation stays consistent.
      history.pop();
      const message =
        err.name === "TimeoutError" || err.name === "AbortError"
          ? "The request timed out. Please try again."
          : err instanceof TypeError
            ? "Could not reach the server. Check your connection and try again."
            : err.message;
      addMessage(message, "error");
    } finally {
      setBusy(false);
    }
  });
})();
