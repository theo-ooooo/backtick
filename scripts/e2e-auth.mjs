// E2E: dev-credentials login -> session -> /write access
const BASE = "http://localhost:3100";
const jar = new Map();
function setCookies(res) {
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [kv] = c.split(";");
    const [k, v] = kv.split("=");
    jar.set(k.trim(), v);
  }
}
const cookieHeader = () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");

// 1) csrf
let res = await fetch(`${BASE}/api/auth/csrf`);
setCookies(res);
const { csrfToken } = await res.json();
console.log("csrf ok:", Boolean(csrfToken));

// 2) credentials callback (dev provider)
res = await fetch(`${BASE}/api/auth/callback/dev`, {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded", cookie: cookieHeader() },
  body: new URLSearchParams({ csrfToken, email: "theo@test.dev", name: "테오", redirect: "false" }),
  redirect: "manual",
});
setCookies(res);
console.log("login status:", res.status, "| session cookie:", [...jar.keys()].some((k) => k.includes("session-token")));

// 3) session check
res = await fetch(`${BASE}/api/auth/session`, { headers: { cookie: cookieHeader() } });
const session = await res.json();
console.log("session user:", session?.user?.email, session?.user?.id ? "(has id)" : "(NO id)");

// 4) /write should NOT redirect to /login anymore (redirects to /settings b/c no handle)
res = await fetch(`${BASE}/write`, { headers: { cookie: cookieHeader() }, redirect: "manual" });
console.log("/write status:", res.status, "location:", res.headers.get("location"));

const ok = Boolean(session?.user?.id);
console.log(ok ? "✅ AUTH E2E PASSED" : "❌ FAILED");
process.exit(ok ? 0 : 1);
