import { useEffect, useState } from "react";
import { apiFetch, parseJson } from "./api/client.js";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";

export default function App() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await apiFetch("/api/auth/me");
      const data = await parseJson(res);
      if (cancelled) return;
      if (res.ok && data?.username) setUser(data.username);
      else setUser(null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (user === undefined) {
    return (
      <div className="layout">
        <p className="sub">Cargando…</p>
      </div>
    );
  }

  if (!user) {
    return <Login onLoggedIn={(u) => setUser(u)} />;
  }

  return <Dashboard username={user} onLogout={() => setUser(null)} />;
}
