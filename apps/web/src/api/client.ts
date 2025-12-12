const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export interface Athlete {
    id: number;
    name: string;
    createdAt: string;
}

export interface User {
    id: number;
    email: string;
}

export interface DashboardSummary {
    sessionCount: number;
    totalTags: number;
    averageTagsPerSession: number;
    distinctTagsCount: number;
    mostUsedTag: {
        tagId: number;
        name: string;
        description: string | null;
        count: number;
    } | null;
}

export interface DashBoardSession {
    sessionId: number;
    videoUrl: string;
    notes: string | null;
    createdAt: string;
    tagCount: number;
}

export interface AthleteDashboardResponse {
    athlete: Athlete;
    summary: DashboardSummary;
    recentSessions: DashBoardSession[];
    topTags: {
        tagId: number;
        name: string;
        description: string | null;
        count: number;
    }[];
}

export async function createAthlete(name: string): Promise<Athlete> {
    const res = await fetch(`${API_BASE_URL}/api/athletes`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
    });

    if (!res.ok) {
        throw new Error("Failed to create athlete");
    }
    return res.json();
}

// ---- Auth Helpers ---- //

function getToken(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem("token");
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem("token", token);
  } else {
    window.localStorage.removeItem("token");
  }
}

async function apiFetch<T>(
    path: string,
    options: RequestInit = {},
    requireAuth = false
): Promise<T> {
    const headers = new Headers(options.headers);

    if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
    }

    if (requireAuth) {
        const token = getToken();
        if (token) {
            headers.set("Authorization", `Bearer ${token}`);
        }
    }

    const res = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
    });

    if (!res.ok) {
    const ct = res.headers.get("content-type") ?? "";
    const body = ct.includes("application/json") ? await res.json().catch(() => null) : await res.text().catch(() => "");
    const msg =
      typeof body === "string" ? body :
      body?.message ?? body?.error ?? `Request failed: ${res.status}`;
    throw new Error(msg);
  }

  if (res.status === 204 || res.status === 205) {
    return undefined as T;
  }

  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    return (await res.json()) as T;
  }

    return (await res.text()) as unknown as T;
}

// ---- Public / ikke-auth endpoints ---- //

export async function getAthletes(): Promise<Athlete[]> {
    return apiFetch<Athlete[]>("/api/athletes");
}

export async function getAthleteDashboard(
    id: number
): Promise<AthleteDashboardResponse> {
    return apiFetch<AthleteDashboardResponse>(`/api/athletes/${id}/dashboard`);
}

// ---- Auth Endpoints ---- //

export interface AuthResponse {
    token: string;
    user: User;
    athlete: Athlete | null;
}

export async function register(
    email: string,
    password: string,
    name: string
): Promise<AuthResponse> {
    const data = await apiFetch<AuthResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, name }),
    });

    setToken(data.token);
    return data;
}

export async function login(
    email: string,
    password: string
): Promise<AuthResponse> {
    const data = await apiFetch<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
    });

    setToken(data.token);
    return data;
}

export interface MeResponse {
    user: User;
    athlete: Athlete | null;
}

export async function getMe(): Promise<MeResponse> {
    return apiFetch<MeResponse>("/api/me", {}, true);
}

export async function getMyDashboard(): Promise<AthleteDashboardResponse> {
    return apiFetch<AthleteDashboardResponse>("/api/my/dashboard", {}, true);
}

export interface Session {
    id: number;
    athleteId: number;
    videoUrl: string;
    notes: string | null;
    createdAt: string;
    updatedAt?: string;
}

export interface Tag {
    id: number;
    name: string;
    description: string | null;
    category: TagCategory | null;
    outcome: TagOutcome | null;
    athleteId: number | null;
    createdAt: string;
    updatedAt: string;
}

export type TagCategory =
  | "TECHNICAL_ERROR"
  | "TECHNICAL_STRENGTH"
  | "TACTICAL_DECISION"
  | "OFFENSIVE"
  | "DEFENSIVE"
  | "PHYSICAL"
  | "MENTAL";

export async function getMyTags(): Promise<Tag[]> {
    return apiFetch<Tag[]>("/api/my/tags", {}, true);
}

export interface CreateTagInput {
    name: string;
    description?: string;
    category: TagCategory;
    outcome?: TagOutcome;
}

export async function createMyTag(input: CreateTagInput): Promise<Tag> {
    return apiFetch<Tag>(
        "/api/my/tags",
        {
            method: "POST",
            body: JSON.stringify(input),
        },
        true
    );
}

export interface SessionTag {
    id: number;
    sessionId: number;
    tagId: number;
    timestampSec: number | null;
    note: string | null;
    tag: Tag;
}

export interface SessionWithTags extends Session {
    sessionTags: SessionTag[];
}

export async function createMySession(
    videoUrl: string,
    notes?: string
): Promise<Session> {
    return apiFetch<Session>(
        "/api/my/sessions",
        {
            method: "POST",
            body: JSON.stringify({
                videoUrl,
                notes,
            }),
        },
        true // requireAuth
    );
}

export async function uploadMySession(
    file: File,
    notes?: string
): Promise<Session> {
    const form = new FormData();
    form.append("video", file);
    if (notes && notes.trim()) {
        form.append("notes", notes.trim());
    }

    return apiFetch<Session>(
        "/api/my/sessions/upload",{
            method: "POST",
            body: form,
        },
        true
    );
}

export async function getMySession(
    sessionId: number
): Promise<SessionWithTags>{
    return apiFetch<SessionWithTags>(
        `/api/my/sessions/${sessionId}`,
    {},
    true // requireAuth
    );
}

export interface AddSessionTagInput {
    tagId: number;
    timestampSec?: number;
    note?: string;
}

export async function addTagToMySession(
    sessionId: number,
    input: AddSessionTagInput
): Promise<SessionTag> {
    return apiFetch<SessionTag>(
        `/api/my/sessions/${sessionId}/tags`,
        {
            method: "POST",
            body: JSON.stringify(input),
        },
        true // requireAuth
    );
}


export interface UpdateTagInput {
  name?: string;
  description?: string;
  category?: TagCategory | null;
  outcome?: TagOutcome | null;
}

export async function updateMyTag(
  tagId: number,
  input: UpdateTagInput
): Promise<Tag> {
  return apiFetch<Tag>(
    `/api/my/tags/${tagId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
    true
  );
}

export async function getMySessionsWithTags(): Promise<SessionWithTags[]> {
  return apiFetch<SessionWithTags[]>(
    "/api/my/sessions?includeTags=true",
    {},
    true
  );
}

export async function deleteMyTag(tagId: number): Promise<void> {
  await apiFetch<void>(
    `/api/my/tags/${tagId}`,
    {
      method: "DELETE",
    },
    true
  );
}

export type TagOutcome = "SUCCESS" | "FAIL";

export async function getMyTagUsage(tagId: number): Promise<number> {
  const result = await apiFetch<{ usageCount: number }>(
    `/api/my/tags/${tagId}/usage`,
    {},
    true
  );
  return result.usageCount;
}
