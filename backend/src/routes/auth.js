import { Router } from "express";

const router = Router();

function getExpectedPassword(username) {
  const u = String(username || "").trim();
  if (u === "Obed") return process.env.AUTH_OBED_PASSWORD ?? "";
  if (u === "Lupita") return process.env.AUTH_LUPITA_PASSWORD ?? "";
  return null;
}

router.post("/login", (req, res) => {
  const { username, password } = req.body ?? {};
  const expected = getExpectedPassword(username);

  if (expected === null || !password) {
    return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
  }

  const a = String(password);
  const b = String(expected);
  if (a.length !== b.length || !timingSafeEqualString(a, b)) {
    return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
  }

  req.session.username = String(username).trim();
  req.session.save((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "No se pudo guardar la sesión" });
    }
    return res.json({ ok: true, username: req.session.username });
  });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("rg.sid", { path: "/" });
    res.json({ ok: true });
  });
});

router.get("/me", (req, res) => {
  if (!req.session?.username) {
    return res.status(401).json({ error: "No autorizado" });
  }
  res.json({ username: req.session.username });
});

function timingSafeEqualString(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  let mismatch = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const ca = i < a.length ? a.charCodeAt(i) : 0;
    const cb = i < b.length ? b.charCodeAt(i) : 0;
    mismatch |= ca ^ cb;
  }
  return mismatch === 0;
}

export default router;
