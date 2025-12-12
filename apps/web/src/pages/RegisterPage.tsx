import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function RegisterPage() {
    const { register, loading, user } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [fighterName, setFighterName] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false); 

    if (!loading && user) {
        navigate("/dashboard");
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError(null);
        try {
            setSubmitting(true);
          await register(email, password, fighterName);
          navigate("/dashboard");
        } catch (err) {
        console.error(err);
        setError("Registration failed, try again.");
        } finally {
        setSubmitting(false);
        }
    }

    return (
    <div className="min-h-screen flex items-center justify-center bg-stone-950 text-stone-100 px-4">
      <div className="w-full max-w-md rounded-xl border border-stone-800 bg-stone-900/60 p-6 space-y-4">
        <h1 className="text-xl font-semibold">Opret konto</h1>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs mb-1 text-stone-300">
              Email
            </label>
            <input
              type="email"
              className="w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-xs mb-1 text-stone-300">
              Fighter navn
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              value={fighterName}
              onChange={(e) => setFighterName(e.target.value)}
              placeholder="Fx: Jonas 'The Machine' Hansen"
            />
          </div>
          <div>
            <label className="block text-xs mb-1 text-stone-300">
              Password
            </label>
            <input
              type="password"
              className="w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-stone-950 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Opretter..." : "Opret konto"}
          </button>
        </form>
        <p className="text-xs text-stone-400">
          Har du allerede en konto?{" "}
          <Link
            to="/login"
            className="text-orange-400 hover:text-orange-300"
          >
            Log ind
          </Link>
        </p>
      </div>
    </div>
  );
}