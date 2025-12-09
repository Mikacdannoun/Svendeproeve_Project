import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getMySession, addTagToMySession, getTags } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { SessionWithTags, Tag } from "../api/client";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhsot:4000";

export default function SessionDetailPage() {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();

    const videoRef = useRef<HTMLVideoElement | null>(null);

    const [session, setSession] = useState<SessionWithTags | null>(null);
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedTagId, setSelectedTagId] = useState<number | "">("");
    const [tagNote, setTagNote] = useState("");
    const [addingTag, setAddingTag] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    // Hent session + tags
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login");
      return;
    }

    const id = Number(sessionId);
    if (!sessionId || Number.isNaN(id)) {
      setError("Ugyldigt session-id");
      setLoading(false);
      return;
    }

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [sessionData, tagsData] = await Promise.all([
          getMySession(id),
          getTags(),
        ]);

        setSession(sessionData);
        setTags(tagsData);
      } catch (err) {
        console.error(err);
        setError("Kunne ikke hente session-data");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [authLoading, user, sessionId, navigate]);

  async function handleAddTag(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddError(null);

    if (!session) return;

    const id = selectedTagId === "" ? null : Number(selectedTagId);
    if (!id) {
      setAddError("Du skal vælge et tag.");
      return;
    }

    const video = videoRef.current;
    if (!video) {
      setAddError("Video ikke klar.");
      return;
    }

    const currentTimeSeconds = Math.floor(video.currentTime);

    try {
      setAddingTag(true);
      await addTagToMySession(session.id, {
        tagId: id,
        timestampSec: currentTimeSeconds,
        note: tagNote.trim() || undefined,
      });

      // reload session så vi ser det nye tag
      const updated = await getMySession(session.id);
      setSession(updated);
      setTagNote("");
    } catch (err) {
      console.error(err);
      setAddError("Kunne ikke tilføje tag. Prøv igen.");
    } finally {
      setAddingTag(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-950">
        <p className="text-stone-300 text-lg">Indlæser session...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-950 text-stone-100 px-4">
        <p className="mb-4 text-red-400">{error ?? "Session ikke fundet"}</p>
        <button
          onClick={() => navigate("/dashboard")}
          className="text-sky-400 hover:text-sky-300 text-sm underline"
        >
          Tilbage til dashboard
        </button>
      </div>
    );
  }

  const videoSrc =
    session.videoUrl.startsWith("http") || session.videoUrl.startsWith("/")
      ? `${API_BASE_URL}${session.videoUrl}`
      : `${API_BASE_URL}/${session.videoUrl}`;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 px-4 py-6">
      {/* Header */}
      <header className="mb-4 flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate("/dashboard")}
            className="text-xs text-stone-400 hover:text-sky-400 transition-colors"
          >
            ← Tilbage til dashboard
          </button>
          <h1 className="text-xl font-semibold mt-2">
            Session #{session.id}
          </h1>
          <p className="text-xs text-stone-500">
            Oprettet:{" "}
            {new Date(session.createdAt).toLocaleString("da-DK")}
          </p>
        </div>
      </header>

      {/* Layout: video + tagging */}
      <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
        {/* Video */}
        <div className="space-y-3">
          <div className="rounded-xl border border-stone-800 bg-black overflow-hidden">
            <video
              ref={videoRef}
              controls
              className="w-full max-h-[70vh]"
              src={videoSrc}
              onLoadedMetadata={(e) => { 
                const v = e.currentTarget;
                setDuration(v.duration || 0);
              }}
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                setCurrentTime(v.currentTime || 0);
              }}
            />
          </div>
          {/* Tag timeline under video */}
            <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>
                Time: {Math.floor(currentTime)}s
                {duration > 0 && ` / ${Math.floor(duration)}s`}
                </span>
            </div>

            <div className="relative h-3 rounded-full bg-slate-800 overflow-hidden">
                {/* Fyldt progress (hvor du er i videoen) */}
                {duration > 0 && (
                <div
                    className="absolute inset-y-0 left-0 bg-sky-500/40"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                />
                )}

                {/* Tag markers */}
                {duration > 0 &&
                session.sessionTags
                    .filter((st) => st.timestampSec != null)
                    .map((st) => {
                    const pos = Math.min(
                        100,
                        Math.max(0, (st.timestampSec! / duration) * 100)
                    );

                    return (
                        <button
                        key={st.id}
                        type="button"
                        className="absolute top-0 h-full"
                        style={{ left: `${pos}%` }}
                        onClick={() => {
                            if (videoRef.current && st.timestampSec != null) {
                            videoRef.current.currentTime = st.timestampSec;
                            }
                        }}
                        >
                        <span
                            className="block w-[6px] h-full bg-red-400 hover:bg-red-300"
                            title={`${st.tag.name} @ ${st.timestampSec}s`}
                        />
                        </button>
                    );
                    })}
            </div>
            </div>
          {session.notes && (
            <p className="text-sm text-stone-300">
              <span className="font-semibold">Session note:</span>{" "}
              {session.notes}
            </p>
          )}
        </div>

        {/* Tagging panel */}
        <div className="space-y-4">
          <section className="rounded-xl border border-stone-800 bg-stone-900/50 p-4">
            <h2 className="text-sm font-semibold text-stone-200 mb-2">
              Tilføj tag ved nuværende tidspunkt
            </h2>
            <form onSubmit={handleAddTag} className="space-y-3 text-xs">
              <div>
                <label className="block mb-1 text-stone-300">
                  Vælg tag
                </label>
                <select
                  value={selectedTagId}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedTagId(value === "" ? "" : Number(value));
                  }}
                  className="w-full rounded-lg border border-stone-700 bg-stone-950 px-2 py-2 text-xs text-stone-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="">-- Vælg tag --</option>
                  {tags.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.description ? ` – ${t.description}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-1 text-stone-300">
                  Note (valgfrit)
                </label>
                <textarea
                  value={tagNote}
                  onChange={(e) => setTagNote(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-stone-700 bg-stone-950 px-2 py-2 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="Fx: Hands down efter combo, står stille på linjen..."
                />
              </div>
              {addError && (
                <p className="text-[11px] text-red-400">{addError}</p>
              )}
              <button
                type="submit"
                disabled={addingTag}
                className="rounded-lg bg-sky-500 px-3 py-2 text-xs font-medium text-stone-950 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {addingTag
                  ? "Tilføjer tag..."
                  : "Tilføj tag ved nuværende tid"}
              </button>
            </form>
          </section>

          {/* Liste over tags i denne session */}
          <section className="rounded-xl border border-stone-800 bg-stone-900/50 p-4">
            <h2 className="text-sm font-semibold text-stone-200 mb-2">
              Tags i denne session
            </h2>
            {session.sessionTags.length === 0 ? (
              <p className="text-xs text-stone-400">
                Ingen tags endnu. Afspil videoen og tilføj tags ved relevante tidspunkter.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {session.sessionTags.map((st) => (
                  <div
                    key={st.id}
                    className="rounded-lg border border-stone-800 bg-stone-900/70 px-3 py-2 text-xs flex items-start justify-between gap-2"
                  >
                    <div>
                      <p className="font-semibold text-stone-100">
                        {st.tag.name}
                      </p>
                      <p className="text-stone-400">
                        Time:{" "}
                        <span className="font-mono">
                          {st.timestampSec != null
                            ? `${st.timestampSec}s`
                            : "ukendt"}
                        </span>
                      </p>
                      {st.note && (
                        <p className="text-stone-300 mt-1">
                          Note: {st.note}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}