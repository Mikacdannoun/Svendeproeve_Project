const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export interface Athlete {
    id: number;
    name: string;
    createdAt: string;
}

export async function getAthletes(): Promise<Athlete[]> {
    const res = await fetch(`${API_BASE_URL}/api/athletes`);
    if (!res.ok) throw new Error("Failed to fetch athletes");
    return res.json();
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

export async function getAthleteDashboard(
    id: number
): Promise<AthleteDashboardResponse> {
    const res = await fetch(`${API_BASE_URL}/api/athletes/${id}/dashboard`);
    if (!res.ok) throw new Error("Failed to fetch athlete dashboard");
    return res.json();
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