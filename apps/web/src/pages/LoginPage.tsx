import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function LoginPage() {
    const { login, loading, user } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState ("");
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    
    useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [loading, user, navigate]);

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    try {
      setSubmitting(true);
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Login fejlede. Tjek email/password.");
    } finally {
      setSubmitting(false);
    }
  }

    return (
    <div className="min-h-screen flex items-center justify-center bg-stone-950 text-stone-100 px-4">
      <div className="w-full max-w-md rounded-xl border border-stone-800 bg-stone-900/60 p-6 space-y-4">
        <h1 className="text-xl font-semibold">Log ind</h1>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs mb-1 text-stone-300">
              Email
            </label>
            <input
              type="email"
              className="w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-xs mb-1 text-stone-300">
              Password
            </label>
            <input
              type="password"
              className="w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-stone-950 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Logger ind..." : "Log ind"}
          </button>
        </form>
        <p className="text-xs text-stone-400">
          Ingen konto?{" "}
          <Link
            to="/register"
            className="text-sky-400 hover:text-sky-300"
          >
            Opret bruger
          </Link>
        </p>
      </div>
    </div>
  );
}