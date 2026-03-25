export function requireAuth(req, res, next) {
  if (!req.session?.username) {
    return res.status(401).json({ error: "No autorizado" });
  }
  next();
}
