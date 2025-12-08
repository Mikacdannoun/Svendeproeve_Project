// List of Athletes Page
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Athlete } from "../api/client";
import { getAthletes } from "../api/client";

export default function AthletesPage() {
    const [athletes, setAthletes] = useState<Athlete[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getAthletes()
            .then(setAthletes)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-stone-950">
                <p className="text-stone-300 text-lg">Indlæser fighters...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-stone-950 text-stone-100">
      {/* Header */}
      <header className="border-b border-stone-800">
        <div className="w-full px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">
            Combat Analyzer
          </h1>
          <span className="text-xs text-stone-400">
            Svendeprøve • Fighter overview
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="w-full px-4 py-8">
        <h2 className="text-xl font-semibold mb-4">Fighters</h2>

        {athletes.length === 0 ? (
          <p className="text-stone-400">
            Ingen fighters endnu. Opret nogle via API'et (Insomnia) først.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {athletes.map((athlete) => (
              <Link
                key={athlete.id}
                to={`/athletes/${athlete.id}`}
                className="group rounded-xl border border-orange-600 bg-stone-900/40 p-4 hover:bg-stone-900 hover:border-orange-400/60 transition-colors"
              >
                <h3 className="text-lg font-medium group-hover:text-orange-400">
                  {athlete.name}
                </h3>
                <p className="mt-1 text-xs text-stone-400">
                  Oprettet:{" "}
                  {new Date(athlete.createdAt).toLocaleDateString("da-DK")}
                </p>
                <p className="mt-3 text-xs text-stone-500">
                  Klik for at se teknik- og fejlstatistik.
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
    );
}