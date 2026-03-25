import { useState } from "react";
import { apiFetch, parseJson } from "../api/client.js";

export default function Login({ onLoggedIn }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      const data = await parseJson(res);
      if (!res.ok) {
        setError(data?.error || "No se pudo iniciar sesión");
        return;
      }
      onLoggedIn(data.username);
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="layout">
      <h1>Registro de gastos</h1>
      <p className="sub">Inicia sesión (Obed o Lupita)</p>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="user">Usuario</label>
            <input
              id="user"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="pass">Contraseña</label>
            <input
              id="pass"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? <p className="error">{error}</p> : null}
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
      <p className="pwa-hint">
        <strong>Instalar en el celular:</strong> en Android con Chrome suele aparecer
        &quot;Instalar aplicación&quot;. En iPhone, usa Compartir → Agregar a inicio. Si el
        celular de trabajo tiene restricciones, puede que solo puedas usar el navegador sin
        instalar.
      </p>
    </div>
  );
}
