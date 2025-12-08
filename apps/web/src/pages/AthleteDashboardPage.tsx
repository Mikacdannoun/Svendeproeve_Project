// henter data fra dashboard endpointet

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { AthleteDashboardResponse } from "../api/client";
import { getAthleteDashboard } from "../api/client";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "Recharts";

export default function AthleteDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const athleteId = Number(id);

  const [data, setData] = useState<AthleteDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Number.isNaN(athleteId)) {
      setError("Invalid athlete id");
      setLoading(false);
      return;
    }

    getAthleteDashboard(athleteId)
      .then(setData)
      .catch((err) => {
        console.error(err);
        setError("Kunne ikke hente dashboard data");
      })
      .finally(() => setLoading(false));
  }, [athleteId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-950">
        <p className="text-stone-300 text-lg">Indlæser dashboard...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-950 text-stone-100">
        <p className="mb-4 text-red-400">{error ?? "Ingen data"}</p>
        <Link
          to="/"
          className="text-orange-400 hover:text-orange-300 text-sm underline"
        >
          Tilbage til fighters
        </Link>
      </div>
    );
  }

  const { athlete, summary, recentSessions, topTags } = data;

  //Data til grafer
  const tagsPerSessionData = recentSessions.map((s) => ({
    sessionId: s.sessionId,
    // kort dato format
    label: new Date(s.createdAt).toLocaleDateString("da-DK", {
        day: "2-digit",
        month: "2-digit",
    }),
    tagCount: s.tagCount,
  }));

  const topTagsData = topTags.map((t) => ({
    name: t.name,
    value: t.count,
  }));

  // Farver til pie chart
  const PIE_COLORS = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"];

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <header className="border-b border-stone-800">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <Link
              to="/"
              className="text-xs text-stone-400 hover:text-orange-400 transition-colors"
            >
              ← Tilbage til fighters
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight mt-1">
              {athlete.name}
            </h1>
            <p className="text-xs text-stone-500">
              Oprettet:{" "}
              {new Date(athlete.createdAt).toLocaleDateString("da-DK")}
            </p>
          </div>
          <span className="text-xs text-stone-500">
            Combat Analyzer • Dashboard
          </span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Overblik cards */}
        <section>
          <h2 className="text-sm font-semibold text-stone-300 mb-3">
            Overblik
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

        {/* Mest brugte tag */}
        <section>
          <h2 className="text-sm font-semibold text-stone-300 mb-2">
            Mest brugte tag
          </h2>
          <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-4">
            {summary.mostUsedTag ? (
              <>
                <p className="text-sm font-medium text-orange-600">
                  {summary.mostUsedTag.name}
                </p>
                <p className="text-xs text-stone-400 mt-1">
                  Registreret {summary.mostUsedTag.count} gange
                  {summary.mostUsedTag.description &&
                    ` – ${summary.mostUsedTag.description}`}
                </p>
              </>
            ) : (
              <p className="text-sm text-stone-400">
                Ingen tags registreret endnu.
              </p>
            )}
          </div>
        </section>

        {/* Seneste sessions + Top tags side om side */}
        <section className="grid gap-4 md:grid-cols-2">
          <div>
            <h2 className="text-sm font-semibold text-stone-300 mb-2">
              Seneste sessions
            </h2>
            <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-3 space-y-2 max-h-80 overflow-y-auto">
              {recentSessions.length === 0 ? (
                <p className="text-sm text-stone-400">
                  Ingen sessions endnu.
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
                      <span className="font-semibold text-orange-600 text-sm">
                        {s.tagCount}
                      </span>
                    </p>
                    <p className="text-stone-500 truncate">
                      Video: {s.videoUrl}
                    </p>
                    {s.notes && (
                      <p className="text-stone-400 mt-1">Note: {s.notes}</p>
                    )}
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
                  Ingen tags registreret endnu.
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
                    <span className="text-orange-600 font-semibold text-sm">
                      {t.count}x
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
        <section className="grid gap-4 md:grid-cols-2">
              {/* Bar chart: tags per session */}
              <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-4">
                <h2 className="text-sm font-semibold text-stone-300 mb-2">
                    Tags pr. session (seneste)
                </h2>
                {tagsPerSessionData.length === 0 ? (
                    <p className="text-sm text-stone-400">
                        Ingen sessions med tags endnu.
                    </p>
                ) : (
                    <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tagsPerSessionData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#1f2937"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      stroke="#9ca3af"
                      tickLine={false}
                      fontSize={12}
                    />
                    <YAxis
                      stroke="#9ca3af"
                      tickLine={false}
                      fontSize={12}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#020617",
                        borderColor: "#1f2937",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="tagCount" fill="#e44219ff" radius={[4, 4, 0, 0]} activeBar={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
                )}
              </div>
              {/* Pie chart: top tags */}
          <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-4">
            <h2 className="text-sm font-semibold text-stone-300 mb-2">
              Fordeling af top tags
            </h2>
            {topTagsData.length === 0 ? (
              <p className="text-sm text-stone-400">
                Ingen tags registreret endnu.
              </p>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center gap-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topTagsData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={70}
                      innerRadius={35}
                      paddingAngle={2}
                    >
                      {topTagsData.map((entry, index) => (
                        <Cell
                          key={`cell-${entry.name}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#020617",
                        borderColor: "#1f2937",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-2 text-xs text-stone-300">
                  {topTagsData.map((t, index) => (
                    <div
                      key={t.name}
                      className="flex items-center gap-1 border border-stone-700 rounded-full px-2 py-1"
                    >
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{
                          backgroundColor:
                            PIE_COLORS[index % PIE_COLORS.length],
                        }}
                      />
                      <span>{t.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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