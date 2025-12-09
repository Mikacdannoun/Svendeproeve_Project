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
        throw new Error(`Request failed: ${res.status}`);
    }

    return res.json() as Promise<T>;
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
}

export async function getTags(): Promise<Tag[]> {
    return apiFetch<Tag[]>("/api/tags");
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
