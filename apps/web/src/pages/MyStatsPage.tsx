import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getMySessionsWithTags } from "../api/client";
import type { SessionWithTags, TagCategory, TagOutcome } from "../api/client";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,LineChart, Line } from "Recharts";

function pct(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n * 100)}%`;
}

function formatCategoryLabel(cat: TagCategory | null): string {
  if (!cat) return "Uncategorized";
  switch (cat) {
    case "TECHNICAL_ERROR":
      return "Tekniske fejl";
    case "TECHNICAL_STRENGTH":
      return "Tekniske styrker";
    case "TACTICAL_DECISION":
      return "Taktiske beslutninger";
    case "OFFENSIVE":
      return "Offensiv";
    case "DEFENSIVE":
      return "Defensiv";
    case "PHYSICAL":
      return "Fysisk";
    case "MENTAL":
      return "Mental";
  }
}

export default function MyStatsPage() {
  const { user, athlete, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();

  const displayName = athlete?.name ?? "My stats";

  const [sessions, setSessions] = useState<SessionWithTags[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
  if (sessions.length > 0) {
    console.log("STATS SESSIONS RAW:", sessions);
    console.log("FIRST SESSION TAGS:", sessions[0]?.sessionTags);
  }
}, [sessions]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate("/login");
      return;
    }

    setLoading(true);
    setError(null);

    getMySessionsWithTags()
      .then(setSessions)
      .catch((e) => {
        console.error(e);
        setError("Couldn’t load stats.");
      })
      .finally(() => setLoading(false));
  }, [authLoading, user, navigate]);

  const computed = useMemo(() => {
    const all = sessions.flatMap((s) => s.sessionTags ?? []);

    console.log("CATEGORY COUNTS:", Object.fromEntries(
  all.reduce((m, st) => {
    const k = String(st.tag.category);
    m.set(k, (m.get(k) ?? 0) + 1);
    return m;
  }, new Map<string, number>())
));

    const countBy = (category: TagCategory, outcome: TagOutcome) =>
      all.filter(
        (st) =>
          st.tag.category === category &&
          st.tag.outcome === outcome
      ).length;

    const offSuccess = countBy("OFFENSIVE", "SUCCESS");
    const offFail = countBy("OFFENSIVE", "FAIL");
    const defSuccess = countBy("DEFENSIVE", "SUCCESS");
    const defFail = countBy("DEFENSIVE", "FAIL");

    const offensiveRate =
      offSuccess + offFail > 0 ? offSuccess / (offSuccess + offFail) : NaN;

    const defensiveRate =
      defSuccess + defFail > 0 ? defSuccess / (defSuccess + defFail) : NaN;

    // Most frequent weakness = most used TECHNICAL_ERROR tag name
    const errors = all.filter((st) => st.tag.category === "TECHNICAL_ERROR");
    const errorCounts = new Map<string, number>();
    for (const st of errors) {
      const key = st.tag.name.trim();
      errorCounts.set(key, (errorCounts.get(key) ?? 0) + 1);
    }
    const mostFrequentWeakness =
      [...errorCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const weaknessTrend = mostFrequentWeakness
      ? sessions.map((s) => {
          const count = (s.sessionTags ?? []).filter(
            (st) =>
              st.tag.category === "TECHNICAL_ERROR" &&
              st.tag.name.trim() === mostFrequentWeakness
          ).length;

          return {
            date: new Date(s.createdAt).toLocaleDateString("da-DK"),
            count,
          };
        })
      : [];

    // Dominant strengths
    const strengths = all.filter((st) => st.tag.category === "TECHNICAL_STRENGTH");
    const strengthCounts = new Map<string, number>();
    for (const st of strengths) {
      const key = st.tag.name.trim();
      strengthCounts.set(key, (strengthCounts.get(key) ?? 0) + 1);
    }
    const dominantStrengths = [...strengthCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));

    return {
      sessionCount: sessions.length,
      offensiveRate,
      defensiveRate,
      offSuccess,
      offFail,
      defSuccess,
      defFail,
      mostFrequentWeakness,
      weaknessTrend,
      dominantStrengths,
    };
  }, [sessions]);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <header className="border-b border-stone-800">
        <div className="w-full px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {displayName}
            </h1>
            <p className="text-xs text-stone-500">
              Logged in as {user?.email ?? "—"}
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-stone-400">
            <button
              onClick={() => navigate("/dashboard")}
              className="hover:text-orange-400 transition-colors"
            >
              Back to dashboard
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
        {/* top actions */}
        <section className="max-w-xl">
          <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-stone-200">Stats overview</p>
                <p className="text-xs text-stone-500">
                  Built from your session tags (OFF/DEF outcome, errors, strengths)
                </p>
              </div>
              <span className="text-xs text-stone-400">
                Sessions:{" "}
                <span className="font-semibold text-orange-400">
                  {computed.sessionCount}
                </span>
              </span>
            </div>
          </div>
        </section>

        {loading ? (
          <p className="text-sm text-stone-400">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : (
          <>
            {/* headline cards */}
            <section>
              <h2 className="text-sm font-semibold text-stone-300 mb-3">
                Key stats
              </h2>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Efficiency Rate (Offensiv)"
                  value={pct(computed.offensiveRate)}
                  sub={`${computed.offSuccess} succes • ${computed.offFail} fejl`}
                />
                <StatCard
                  label="Defensive Success Rate"
                  value={pct(computed.defensiveRate)}
                  sub={`${computed.defSuccess} succes • ${computed.defFail} fejl`}
                />
                <StatCard
                  label="Most frequent weakness"
                  value={computed.mostFrequentWeakness ?? "—"}
                  sub={formatCategoryLabel("TECHNICAL_ERROR")}
                />
                <StatCard
                  label="Dominant strengths tracked"
                  value={String(computed.dominantStrengths.length)}
                  sub={formatCategoryLabel("TECHNICAL_STRENGTH")}
                />
              </div>
            </section>

            {/* charts */}
            <section className="grid gap-4 md:grid-cols-2">
              {/* weakness trend */}
              <div>
                <h2 className="text-sm font-semibold text-stone-300 mb-2">
                  Weakness trend
                </h2>

                <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-3">
                  {computed.mostFrequentWeakness ? (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-stone-400">
                          Tracking:{" "}
                          <span className="text-orange-400 font-semibold">
                            {computed.mostFrequentWeakness}
                          </span>
                        </p>
                        <span className="text-[11px] text-stone-500">
                          per session
                        </span>
                      </div>

                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={computed.weaknessTrend}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Line type="monotone" dataKey="count" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-stone-400">
                      No TECHNICAL_ERROR tags yet.
                    </p>
                  )}
                </div>
              </div>

              {/* strengths */}
              <div>
                <h2 className="text-sm font-semibold text-stone-300 mb-2">
                  Dominant strengths
                </h2>

                <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-3">
                  {computed.dominantStrengths.length ? (
                    <>
                      <p className="text-xs text-stone-400 mb-2">
                        Top TECHNICAL_STRENGTH tags (count)
                      </p>

                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={computed.dominantStrengths}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" hide />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="count" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="mt-2 space-y-1">
                        {computed.dominantStrengths.slice(0, 5).map((s) => (
                          <div
                            key={s.name}
                            className="flex items-center justify-between rounded-lg border border-stone-800/70 bg-stone-900/60 px-3 py-2 text-xs"
                          >
                            <span className="text-stone-100 font-medium">
                              {s.name}
                            </span>
                            <span className="text-orange-400 font-semibold">
                              {s.count}x
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-stone-400">
                      No TECHNICAL_STRENGTH tags yet.
                    </p>
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function StatCard(props: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-4">
      <p className="text-xs text-stone-400">{props.label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-stone-100">
        {props.value}
      </p>
      {props.sub && <p className="mt-1 text-xs text-stone-500">{props.sub}</p>}
    </div>
  );
}