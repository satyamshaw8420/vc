#!/usr/bin/env node
/**
 * SkillSignal Sessions — Stream Video token server
 * -------------------------------------------------
 * Run:  node token-server.mjs        (port 8002, CORS open — demo only)
 * Env:  STREAM_API_KEY, STREAM_SECRET_KEY   (secret NEVER leaves this process)
 *       STREAM_MODE=dev  → client.devToken()   (Stream "Development" env, auth checks off)
 *       STREAM_MODE=prod → client.createToken() (1h expiry)
 *
 * A local .env file is auto-loaded if present (process.env always wins).
 */
import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { StreamClient } from "@stream-io/node-sdk";

/* ---------- .env loader (zero-dep, allowlisted keys only) ---------- */
const ALLOWED = ["STREAM_API_KEY", "STREAM_SECRET_KEY", "STREAM_MODE", "PORT"];
const envPath = join(dirname(fileURLToPath(import.meta.url)), ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || !ALLOWED.includes(m[1])) continue;
    if (process.env[m[1]]) continue; // real env wins
    process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
}

const API_KEY = process.env.STREAM_API_KEY;
const SECRET_KEY = process.env.STREAM_SECRET_KEY;
const MODE = process.env.STREAM_MODE || "dev";
const PORT = Number(process.env.PORT) || 8002;

if (!API_KEY || !SECRET_KEY) {
  console.error(
    [
      "",
      "✗ SkillSignal token server: missing credentials.",
      "",
      "  Create a .env file next to token-server.mjs:",
      "    STREAM_API_KEY=<your api key>",
      "    STREAM_SECRET_KEY=<your secret key>",
      "    STREAM_MODE=dev",
      "",
      "  Or export them: STREAM_API_KEY=... STREAM_SECRET_KEY=... node token-server.mjs",
      "  The secret key must never be committed to git or shipped to the frontend.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

const client = new StreamClient(API_KEY, SECRET_KEY);

/* ---------- helpers ---------- */
const sanitizeUserId = (raw) => {
  const base = String(raw || "")
    .trim()
    .slice(0, 48)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `guest-${Math.random().toString(36).slice(2, 8)}`;
};

const send = (res, code, body) => {
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(body));
};

/* ---------- server ---------- */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "OPTIONS") return send(res, 204, {});

  if (url.pathname === "/health") {
    return send(res, 200, { ok: true, service: "skillsignal-token", mode: MODE });
  }

  if (url.pathname === "/token" && req.method === "GET") {
    const name = url.searchParams.get("name") || "";
    const userId = sanitizeUserId(name);
    try {
      const token =
        MODE === "prod"
          ? client.createToken({ user_id: userId, exp: Math.floor(Date.now() / 1000) + 3600 })
          : client.devToken(userId);
      return send(res, 200, { token, apiKey: API_KEY, userId, mode: MODE });
    } catch (err) {
      return send(res, 500, { ok: false, error: String(err?.message || err) });
    }
  }

  send(res, 404, { ok: false, error: "Not found. Try GET /token?name=rahul or GET /health" });
});

server.listen(PORT, () => {
  console.log(`\n◆ SkillSignal token server  →  http://localhost:${PORT}`);
  console.log(`  GET /token?name=rahul   (mode: ${MODE})`);
  console.log(`  GET /health\n`);
});
