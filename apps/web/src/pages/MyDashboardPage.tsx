import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import type { AthleteDashboardResponse, Tag, TagCategory, TagOutcome, } from "../api/client";
import { getMyDashboard, uploadMySession, getMyTags, updateMyTag, deleteMyTag, createMyTag, getMyTagUsage, } from "../api/client";

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

  const [tags, setTags] = useState<Tag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagsError, setTagsError] = useState<string | null>(null);
  const [showTagManager, setShowTagManager] = useState(false);

  const [editOutcome, setEditOutcome] = useState<TagOutcome | null>(null);
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState<TagCategory | null>(
    "TECHNICAL_ERROR"
  );
  const [savingTagId, setSavingTagId] = useState<number | null>(null);
  const [deletingTagId, setDeletingTagId] = useState<number | null>(null);
  const [tagActionError, setTagActionError] = useState<string | null>(
  null
  );

  const [dashNewTagName, setDashNewTagName] = useState("");
  const [dashNewTagDescription, setDashNewTagDescription] = useState("");
  const [dashNewTagCategory, setDashNewTagCategory] =
    useState<TagCategory>("TECHNICAL_ERROR");
  const [dashNewTagOutcome, setDashNewTagOutcome] =
    useState<TagOutcome | null>(null);
  const [dashCreatingTag, setDashCreatingTag] = useState(false);
  const [dashCreateTagError, setDashCreateTagError] =
    useState<string | null>(null);

  async function loadTags() {
  try {
    setTagsLoading(true);
    setTagsError(null);
    const data = await getMyTags();
    setTags(data);
  } catch (err) {
    console.error(err);
    setTagsError("Kunne ikke hente tags");
  } finally {
    setTagsLoading(false);
  }
  }

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

  function startEditTag(tag: Tag) {
  setEditingTagId(tag.id);
  setEditName(tag.name);
  setEditDescription(tag.description ?? "");
  setEditCategory(tag.category ?? "TECHNICAL_ERROR");
  setEditOutcome(tag.outcome ?? null);
  setTagActionError(null);
}

function cancelEditTag() {
  setEditingTagId(null);
  setEditName("");
  setEditDescription("");
  setEditCategory("TECHNICAL_ERROR");
  setTagActionError(null);
}

async function handleSaveTag(tagId: number) {
  try {
    setSavingTagId(tagId);
    setTagActionError(null);

    
  const needsOutcome = editCategory === "OFFENSIVE" || editCategory === "DEFENSIVE";

  const updated = await updateMyTag(tagId, {
      name: editName,
      description: editDescription,
      category: editCategory,
      outcome: needsOutcome ? editOutcome : null,
    });

    setTags((prev) =>
      prev.map((t) => (t.id === tagId ? updated : t))
    );
    cancelEditTag();
  } catch (err) {
    console.error(err);
    setTagActionError("Kunne ikke opdatere tag.");
  } finally {
    setSavingTagId(null);
  }
}

async function handleDashboardCreateTag(
  e: FormEvent<HTMLFormElement>
) {
  e.preventDefault();
  setDashCreateTagError(null);

  const trimmedName = dashNewTagName.trim();
  if (!trimmedName) {
    setDashCreateTagError("Navn må ikke være tomt.");
    return;
  }

  const needsOutcome =
    dashNewTagCategory === "OFFENSIVE" ||
    dashNewTagCategory === "DEFENSIVE";

  if (needsOutcome && !dashNewTagOutcome) {
    setDashCreateTagError(
      "Outcome (success/fejl) er påkrævet for offensive/defensive tags."
    );
    return;
  }

  try {
    setDashCreatingTag(true);
    const created = await createMyTag({
      name: trimmedName,
      description: dashNewTagDescription.trim() || undefined,
      category: dashNewTagCategory,
      outcome: needsOutcome ? dashNewTagOutcome ?? undefined : undefined,
    });

    setTags((prev) => [...prev, created]);
    setDashNewTagName("");
    setDashNewTagDescription("");
    setDashNewTagCategory("TECHNICAL_ERROR");
    setDashNewTagOutcome(null);
  } catch (err) {
    console.error(err);
    setDashCreateTagError("Kunne ikke oprette tag.");
  } finally {
    setDashCreatingTag(false);
  }
}

async function handleDeleteTag(tagId: number) {
  const tag = tags.find((t) => t.id === tagId);
  if (!tag) return;

  try {
    setTagActionError(null);

    // 🔥 hent hvor mange gange tagget er brugt
    const usage = await getMyTagUsage(tagId);

    const confirmDelete = window.confirm(
      usage > 0
        ? `Er du sikker på, at du vil slette tagget "${tag.name}"?\n\nDet er brugt ${usage} gange i dine sessions.`
        : `Er du sikker på, at du vil slette tagget "${tag.name}"?`
    );
    if (!confirmDelete) return;

    setDeletingTagId(tagId);

    await deleteMyTag(tagId);

    setTags((prev) => prev.filter((t) => t.id !== tagId));
  } catch (err: any) {
    console.error(err);
    setTagActionError("Kunne ikke slette tag.");
  } finally {
    setDeletingTagId(null);
  }
}

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate("/login");
      return;
    }

     void (async () => {
      await loadDashboard();
      await loadTags();
      })();
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
          className="text-orange-400 hover:text-orange-300 text-sm underline"
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
            {import.meta.env.DEV && (
              <button
                onClick={() => navigate("/athletes")}
                className="hover:text-orange-400 transition-colors"
              >
                All fighters (dev/admin)
              </button>
            )}
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
        <button onClick={() => navigate("/my/stats")} className="inline-flex items-center rounded-md bg-orange-500 px-4 text-md font-semibold text-stone-950 shadow-md transition hover:brightness-105 active:translate-y-[1px] focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-black">Performance Overview</button>
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
                    className="w-full text-sm text-stone-300 file:mr-3 file:rounded-md file:border-0 file:bg-orange-500 file:px-3 file:py-1 file:text-xs file:font-medium file:text-stone-950 hover:file:bg-orange-400"
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
                    className="w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Fx: Sparring mod southpaw, fokus på counter hooks..."
                />
                </div>
                {createError && (
                <p className="text-xs text-red-400">{createError}</p>
                )}
                <button
                type="submit"
                disabled={creating}
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-stone-950 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                    {s.notes && (
                      <p className="font-medium text-stone-400 mt-1">Note: {s.notes}</p>
                    )}
                    <p className="text-stone-100">
                      {new Date(s.createdAt).toLocaleString("da-DK")}
                    </p>
                    <p className="text-stone-400">
                      Tags:{" "}
                      <span className="font-semibold text-orange-400">
                        {s.tagCount}
                      </span>
                    </p>
                    <p className="text-stone-500 truncate">
                      Video: {s.videoUrl}
                    </p>
                    <Link
                        to={`/sessions/${s.sessionId}`}
                        className="inline-block mt-1 text-[11px] text-orange-400 hover:text-orange-300"
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
                    <span className="text-orange-400 font-semibold">
                      {t.count}x
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
        {/* Tag management */}
        <section className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-stone-300">
              Tags
            </h2>
            <button
              type="button"
              onClick={() => setShowTagManager((prev) => !prev)}
              className="text-xs text-orange-400 hover:text-orange-300"
            >
              {showTagManager ? "Skjul tag-administration" : "Administrer tags"}
            </button>
          </div>

          {showTagManager && (
            <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4 space-y-3">
              {tagActionError && (
                <p className="text-xs text-red-400">{tagActionError}</p>
              )}

              {/* Opret nyt tag-boks */}
              <div className="rounded-lg border border-stone-800 bg-stone-950/70 p-3">
                <h3 className="text-xs font-semibold text-stone-200 mb-2">
                  Opret nyt tag
                </h3>
                <form
                  onSubmit={handleDashboardCreateTag}
                  className="space-y-2 text-xs"
                >
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <label className="block text-[11px] mb-1 text-stone-300">
                        Kategori
                      </label>
                      <select
                        value={dashNewTagCategory}
                        onChange={(e) =>
                          setDashNewTagCategory(
                            e.target.value as TagCategory
                          )
                        }
                        className="w-full rounded-md border border-stone-700 bg-stone-900 px-2 py-1 text-[11px] text-stone-100 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      >
                        <option value="TECHNICAL_ERROR">
                          Tekniske fejl
                        </option>
                        <option value="TECHNICAL_STRENGTH">
                          Tekniske styrker
                        </option>
                        <option value="TACTICAL_DECISION">
                          Taktiske beslutninger
                        </option>
                        <option value="OFFENSIVE">
                          Offensiv succes/fejl
                        </option>
                        <option value="DEFENSIVE">
                          Defensiv succes/fejl
                        </option>
                        <option value="PHYSICAL">
                          Fysisk performance
                        </option>
                        <option value="MENTAL">
                          Mental performance
                        </option>
                      </select>
                    </div>

                    {(dashNewTagCategory === "OFFENSIVE" ||
                      dashNewTagCategory === "DEFENSIVE") && (
                      <div>
                        <label className="block text-[11px] mb-1 text-stone-300">
                          Outcome
                        </label>
                        <select
                          value={dashNewTagOutcome ?? ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            setDashNewTagOutcome(
                              value === ""
                                ? null
                                : (value as TagOutcome)
                            );
                          }}
                          className="w-full rounded-md border border-stone-700 bg-stone-900 px-2 py-1 text-[11px] text-stone-100 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        >
                          <option value="">-- Vælg --</option>
                          <option value="SUCCESS">Succes</option>
                          <option value="FAIL">Fejl</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] mb-1 text-stone-300">
                      Navn
                    </label>
                    <input
                      type="text"
                      value={dashNewTagName}
                      onChange={(e) => setDashNewTagName(e.target.value)}
                      className="w-full rounded-md border border-stone-700 bg-stone-900 px-2 py-1 text-[11px] text-stone-100 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      placeholder="Fx: Guard for lav, Perfekt jab..."
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] mb-1 text-stone-300">
                      Beskrivelse (valgfrit)
                    </label>
                    <textarea
                      value={dashNewTagDescription}
                      onChange={(e) =>
                        setDashNewTagDescription(e.target.value)
                      }
                      rows={2}
                      className="w-full rounded-md border border-stone-700 bg-stone-900 px-2 py-1 text-[11px] text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                  {dashCreateTagError && (
                    <p className="text-[11px] text-red-400">
                      {dashCreateTagError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={dashCreatingTag}
                    className="rounded-md bg-orange-500 px-3 py-1 text-[11px] font-medium text-stone-950 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {dashCreatingTag ? "Opretter..." : "Gem tag"}
                  </button>
                </form>
              </div>

              {/* Liste / besked */}
              {tagsLoading ? (
                <p className="text-xs text-stone-400">Indlæser tags...</p>
              ) : tagsError ? (
                <p className="text-xs text-red-400">{tagsError}</p>
              ) : tags.length === 0 ? (
                <p className="text-xs text-stone-400">
                  Du har ingen tags endnu. Opret et nyt tag ovenfor.
                </p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto text-xs">
                    {tags.map((tag) => {
                      const isEditable = tag.athleteId !== null;
                      const isEditing = editingTagId === tag.id;

                      if (isEditing) {
                        return (
                          <div
                            key={tag.id}
                            className="rounded-lg border border-stone-800 bg-stone-900/80 p-3 space-y-2"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2 py-0.5 rounded-full bg-stone-800 text-[10px] text-stone-200">
                                {formatCategoryLabel(editCategory)}
                              </span>
                              <select
                                value={editCategory ?? "TECHNICAL_ERROR"}
                                onChange={(e) =>
                                  setEditCategory(e.target.value as TagCategory)
                                }
                                className="rounded-md border border-stone-700 bg-stone-950 px-2 py-1 text-[11px] text-stone-100"
                              >
                                <option value="TECHNICAL_ERROR">Tekniske fejl</option>
                                <option value="TECHNICAL_STRENGTH">Tekniske styrker</option>
                                <option value="TACTICAL_DECISION">Taktiske beslutninger</option>
                                <option value="OFFENSIVE">Offensiv succes/fejl</option>
                                <option value="DEFENSIVE">Defensiv succes/fejl</option>
                                <option value="PHYSICAL">Fysisk performance</option>
                                <option value="MENTAL">Mental performance</option>
                              </select>
                            </div>

                            {/* Outcome dropdown kun for OFF/DEF */}
                            {(editCategory === "OFFENSIVE" ||
                              editCategory === "DEFENSIVE") && (
                              <div>
                                <label className="block text-[11px] mb-1 text-stone-300">
                                  Outcome
                                </label>
                                <select
                                  value={editOutcome ?? ""}
                                  onChange={(e) =>
                                    setEditOutcome(
                                      e.target.value === ""
                                        ? null
                                        : (e.target.value as TagOutcome)
                                    )
                                  }
                                  className="rounded-md border border-stone-700 bg-stone-950 px-2 py-1 text-[11px] text-stone-100"
                                >
                                  <option value="">-- Vælg --</option>
                                  <option value="SUCCESS">Succes</option>
                                  <option value="FAIL">Fejl</option>
                                </select>
                              </div>
                            )}

                            <div>
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full rounded-md border border-stone-700 bg-stone-950 px-2 py-1 text-[11px] text-stone-100"
                              />
                            </div>
                            <div>
                              <textarea
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                rows={2}
                                className="w-full rounded-md border border-stone-700 bg-stone-950 px-2 py-1 text-[11px] text-stone-100"
                                placeholder="Beskrivelse (valgfrit)"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleSaveTag(tag.id)}
                                disabled={savingTagId === tag.id}
                                className="rounded-md bg-orange-500 px-3 py-1 text-[11px] font-medium text-stone-950 hover:bg-orange-400 disabled:opacity-50"
                              >
                                {savingTagId === tag.id ? "Gemmer..." : "Gem"}
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditTag}
                                className="text-[11px] text-stone-400 hover:text-stone-200"
                              >
                                Annuller
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={tag.id}
                          className="rounded-lg border border-stone-800 bg-stone-900/70 p-3 flex items-start justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-full bg-stone-700 text-[10px] text-stone-200">
                                {formatCategoryLabel(tag.category)}
                              </span>
                              {tag.athleteId === null && (
                                <span className="text-[10px] text-stone-500">
                                  (global)
                                </span>
                              )}
                            </div>
                            <p className="font-medium text-stone-100 text-xs">
                              {tag.name}
                            </p>
                            {tag.description && (
                              <p className="text-[11px] text-stone-400">
                                {tag.description}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {isEditable ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startEditTag(tag)}
                                  className="text-[11px] text-orange-400 hover:text-orange-300"
                                >
                                  Rediger
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTag(tag.id)}
                                  disabled={deletingTagId === tag.id}
                                  className="text-[11px] text-red-400 hover:text-red-300 disabled:opacity-50"
                                >
                                  {deletingTagId === tag.id
                                    ? "Sletter..."
                                    : "Slet"}
                                </button>
                              </>
                            ) : (
                              <span className="text-[10px] text-stone-500">
                                Kan ikke redigeres
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
              )}
            </div>
          )}
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


function formatCategoryLabel(cat: TagCategory | null): string {
  if (!cat) return "Ukategoriseret";

  switch (cat) {
    case "TECHNICAL_ERROR":
      return "Tekniske fejl";
    case "TECHNICAL_STRENGTH":
      return "Tekniske styrker";
    case "TACTICAL_DECISION":
      return "Taktiske beslutninger";
    case "OFFENSIVE":
      return "Offensiv succes/fejl";
    case "DEFENSIVE":
      return "Defensiv succes/fejl";
    case "PHYSICAL":
      return "Fysisk performance";
    case "MENTAL":
      return "Mental performance";
    default:
      return cat;
  }
}
