import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import type { AthleteDashboardResponse } from "../api/client";
import { getMyDashboard, uploadMySession } from "../api/client";

export default function MyDashboardPage() {
  const { user, athlete, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<AthleteDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function loadDashboard() {
    try {
      setError(null);
      setLoading(true);
      const d = await getMyDashboard();
      setData(d);
    } catch (err) {
      console.error(err);
      setError("Kunne ikke hente dashboard data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate("/login");
      return;
    }

    void loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, navigate]);

  async function handleCreateSession(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateError(null);

    if (!videoFile) {
        setCreateError("You have to choose a video-file.");
        return;
    }

    try {
        setCreating(true);
        await uploadMySession(videoFile, notes.trim() || undefined);
        setVideoFile(null);
        setNotes("");
        await loadDashboard();
    } catch (err) {
        console.error(err);
        setCreateError("Couldnt create session. Try again.");
    } finally {
        setCreating(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-950">
        <p className="text-stone-300 text-lg">Indlæser dashboard...</p>
      </div>
    );
  }

  if (!user) {
    // vi er allerede på vej til /login via useEffect
    return null;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-950 text-stone-100">
        <p className="mb-4 text-red-400">{error ?? "Ingen data"}</p>
        <button
          onClick={() => navigate("/")}
          className="text-sky-400 hover:text-sky-300 text-sm underline"
        >
          Back
        </button>
      </div>
    );
  }

  const { summary, recentSessions, topTags } = data;
  const displayName = athlete?.name ?? data.athlete.name;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <header className="border-b border-stone-800">
        <div className="w-full px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {displayName}
            </h1>
            <p className="text-xs text-stone-500">
              Logged in as {user.email}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-stone-400">
            <button
              onClick={() => navigate("/")}
              className="hover:text-sky-400 transition-colors"
            >
              All fighters (dev/admin)
            </button>
            <button
              onClick={logout}
              className="rounded-lg border border-stone-700 px-3 py-1 hover:border-red-500 hover:text-red-400 transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="w-full px-4 py-6 space-y-6">
        {/* Opret ny session */}
        <section className="max-w-xl">
            <h2 className="text-sm font-semibold text-stone-300 mb-2">
                Create new session
            </h2>
            <form
                onSubmit={handleCreateSession}
                className="space-y-3 rounded-xl border border-stone-800 bg-stone-900/40 p-4"
            >
                <div>
                <label className="block text-xs mb-1 text-stone-300">
                    Video-fil
                </label>
                <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setVideoFile(file);
                    }}
                    className="w-full text-sm text-stone-300 file:mr-3 file:rounded-md file:border-0 file:bg-sky-500 file:px-3 file:py-1 file:text-xs file:font-medium file:text-stone-950 hover:file:bg-sky-400"
                />
                {videoFile && (
                    <p className="mt-1 text-xs text-stone-400">
                    Valgt: {videoFile.name}
                    </p>
                )}
                </div>
                <div>
                <label className="block text-xs mb-1 text-stone-300">
                    Notes
                </label>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="Fx: Sparring mod southpaw, fokus på counter hooks..."
                />
                </div>
                {createError && (
                <p className="text-xs text-red-400">{createError}</p>
                )}
                <button
                type="submit"
                disabled={creating}
                className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-stone-950 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                {creating ? "Opretter session..." : "Gem session"}
                </button>
            </form>
        </section>

        {/* Overblik */}
        <section>
          <h2 className="text-sm font-semibold text-stone-300 mb-3">
            Overview
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Sessions" value={summary.sessionCount} />
            <StatCard label="Tags i alt" value={summary.totalTags} />
            <StatCard
              label="Gns. tags / session"
              value={summary.averageTagsPerSession.toFixed(1)}
            />
            <StatCard
              label="Forskellige tags"
              value={summary.distinctTagsCount}
            />
          </div>
        </section>

        {/* Seneste sessions + Top tags */}
        <section className="grid gap-4 md:grid-cols-2">
          <div>
            <h2 className="text-sm font-semibold text-stone-300 mb-2">
              Latest sessions
            </h2>
            <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-3 space-y-2 max-h-80 overflow-y-auto">
              {recentSessions.length === 0 ? (
                <p className="text-sm text-stone-400">
                  No sessions yet.
                </p>
              ) : (
                recentSessions.map((s) => (
                  <div
                    key={s.sessionId}
                    className="rounded-lg border border-stone-800/70 bg-stone-900/60 px-3 py-2 text-xs"
                  >
                    <p className="font-medium text-stone-100">
                      {new Date(s.createdAt).toLocaleString("da-DK")}
                    </p>
                    <p className="text-stone-400">
                      Tags:{" "}
                      <span className="font-semibold text-sky-400">
                        {s.tagCount}
                      </span>
                    </p>
                    <p className="text-stone-500 truncate">
                      Video: {s.videoUrl}
                    </p>
                    {s.notes && (
                      <p className="text-stone-400 mt-1">Note: {s.notes}</p>
                    )}
                    <Link
                        to={`/sessions/${s.sessionId}`}
                        className="inline-block mt-1 text-[11px] text-sky-400 hover:text-sky-300"
                        >
                        Open session and add tags
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-stone-300 mb-2">
              Top tags
            </h2>
            <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-3 space-y-2 max-h-80 overflow-y-auto">
              {topTags.length === 0 ? (
                <p className="text-sm text-stone-400">
                  No tags registered yet.
                </p>
              ) : (
                topTags.map((t) => (
                  <div
                    key={t.tagId}
                    className="flex items-center justify-between rounded-lg border border-stone-800/70 bg-stone-900/60 px-3 py-2 text-xs"
                  >
                    <div>
                      <p className="font-medium text-stone-100">{t.name}</p>
                      {t.description && (
                        <p className="text-stone-500">{t.description}</p>
                      )}
                    </div>
                    <span className="text-sky-400 font-semibold">
                      {t.count}x
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-3">
      <p className="text-xs text-stone-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-stone-50">{value}</p>
    </div>
  );
}


