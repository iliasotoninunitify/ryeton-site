import { EmailMessage } from "cloudflare:email";

const DEFAULTS = { FROM_EMAIL: "forms@ryeton.com", ALLOWED_ORIGIN: "https://ryeton.com" };

const FIELDS = {
  kind: 20, name: 120, email: 160, phone: 40, firm: 160, size: 80, message: 3000,
};

function cors(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function json(env, status, body) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...cors(env) } });
}

const clean = (v, max) => String(v ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, max);
const cleanBody = (v, max) => String(v ?? "").replace(/\r\n/g, "\n").trim().slice(0, max);
const b64 = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));

export default {
  async fetch(request, rawEnv) {
    const env = { ...DEFAULTS, ...rawEnv };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(env) });
    if (request.method !== "POST") return json(env, 405, { ok: false, error: "method" });

    const origin = request.headers.get("Origin");
    if (origin && origin !== env.ALLOWED_ORIGIN) return json(env, 403, { ok: false, error: "origin" });

    let data;
    try {
      const type = request.headers.get("Content-Type") || "";
      data = type.includes("application/json") ? await request.json() : Object.fromEntries(await request.formData());
    } catch {
      return json(env, 400, { ok: false, error: "format" });
    }

    // Spam checks: hidden field must stay empty, and a person takes more than 3 seconds.
    if (data.website) return json(env, 200, { ok: true });
    const elapsed = Date.now() - Number(data.started || 0);
    if (!(elapsed > 3000)) return json(env, 400, { ok: false, error: "too_fast" });

    const f = {};
    for (const [k, max] of Object.entries(FIELDS)) f[k] = k === "message" ? cleanBody(data[k], max) : clean(data[k], max);
    if (!f.name) return json(env, 400, { ok: false, error: "name" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return json(env, 400, { ok: false, error: "email" });
    const kind = f.kind === "investor" ? "Investor" : "Owner";

    const lines = [`${kind} enquiry from ryeton.com`, "", `Name: ${f.name}`, `Email: ${f.email}`];
    if (f.phone) lines.push(`Phone: ${f.phone}`);
    if (f.firm) lines.push(`${kind === "Investor" ? "Fund or firm" : "Firm"}: ${f.firm}`);
    if (f.size) lines.push(`${kind === "Investor" ? "Typical check" : "Units managed"}: ${f.size}`);
    lines.push("", f.message || "(no message)");
    const subject = `${kind}: ${f.name}${f.firm ? `, ${f.firm}` : ""}`;
    const raw = [
      `From: Ryeton website <${env.FROM_EMAIL}>`,
      `To: ${env.TO_EMAIL}`,
      `Reply-To: ${f.email}`,
      `Subject: =?UTF-8?B?${b64(subject)}?=`,
      `Message-ID: <${crypto.randomUUID()}@ryeton.com>`,
      `Date: ${new Date().toUTCString()}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      b64(lines.join("\n")).replace(/.{76}/g, "$&\r\n"),
    ].join("\r\n");

    try {
      await env.MAIL.send(new EmailMessage(env.FROM_EMAIL, env.TO_EMAIL, raw));
    } catch (e) {
      return json(env, 502, { ok: false, error: "send" });
    }
    return json(env, 200, { ok: true });
  },
};
