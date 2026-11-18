// Minimal in-memory, per-IP fixed-window rate limiter.
// Good enough for a single-instance test app; resets when the server restarts.

function createRateLimiter({ windowMs, max }) {
  const hits = new Map(); // ip -> { count, resetAt }

  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(ip);
    }
  }, windowMs);
  cleanup.unref();

  return function rateLimit(req, res, next) {
    const now = Date.now();
    const ip = req.ip || "unknown";
    let entry = hits.get(ip);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(ip, entry);
    }
    entry.count += 1;

    if (entry.count > max) {
      res.set("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
      return res
        .status(429)
        .json({ error: "Too many messages. Please wait a minute and try again." });
    }
    next();
  };
}

module.exports = { createRateLimiter };
