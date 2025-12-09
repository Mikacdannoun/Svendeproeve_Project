import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import prisma from "./prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import path from "path";
import multer from "multer";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret";

const app = express();

const upload = multer({
  dest: path.join(__dirname, "../uploads"),
});

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

interface AuthRequest extends Request {
    userId?: number;
}

function signToken(userId: number) {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }

    const token = authHeader.substring("Bearer ".length);
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { userId: number };
      req.userId = payload.userId;
      next();
    } catch (error) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}

async function buildAthleteDashboard(athleteId: number) {
  // 1) hent athlete
  const athlete = await prisma.athlete.findUnique({
    where: { id: athleteId },
  });

  if (!athlete) {
    const err = new Error("ATHLETE_NOT_FOUND");
    throw err;
  }

  // 2) Hent sessions + antal tags pr. session
  const sessions = await prisma.session.findMany({
    where: { athleteId },
    orderBy: {
      createdAt: "asc",
    },
    include: {
      _count: {
        select: {
          sessionTags: true,
        },
      },
    },
  });

  const sessionStats = sessions.map((s) => ({
    sessionId: s.id,
    videoUrl: s.videoUrl,
    notes: s.notes,
    createdAt: s.createdAt,
    tagCount: s._count.sessionTags,
  }));

  const sessionCount = sessionStats.length;
  const totalTags = sessionStats.reduce((sum, s) => sum + s.tagCount, 0);
  const averageTagsPerSession = sessionCount > 0 ? totalTags / sessionCount : 0;

  const recentSessions = [...sessionStats].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  .slice(0, 5);

  // 3) Top-tags via SessionTag groupBy 
  const grouped = await prisma.sessionTag.groupBy({
    by: ["tagId"],
    where: {
      session: {
        athleteId,
      },
    },
    _count: {
      _all: true,
    },
  });

  let topTags: {
    tagId: number;
    name: string;
    description: string | null;
    count: number;
  }[] = [];
  let distinctTagsCount = 0;
  let mostUsedTag:
    | {
        tagId: number;
        name: string;
        description: string | null;
        count: number;
      }
    | null = null;

  if (grouped.length > 0) {
    const sorted = grouped.sort(
      (a, b) => (b._count?._all ?? 0) - (a._count?._all ?? 0)
    );

    const tagIds = sorted.map((g) => g.tagId);

    const tags = await prisma.tag.findMany({
      where: {
        id: {
          in: tagIds,
        },
      },
    });

    const tagMap = new Map<number, (typeof tags)[number]>();
    tags.forEach((t) => tagMap.set(t.id, t));

    topTags = sorted.map((g) => {
      const tag = tagMap.get(g.tagId);
      const count = g._count?._all ?? 0;

      return {
        tagId: g.tagId,
        name: tag?.name ?? "Unknown",
        description: tag?.description ?? null,
        count,
      };
    });

    distinctTagsCount = topTags.length;
    mostUsedTag = topTags[0] ?? null;
  }

  return {
    athlete: {
      id: athlete.id,
      name: athlete.name,
      createdAt: athlete.createdAt,
    },
    summary: {
      sessionCount,
      totalTags,
      averageTagsPerSession,
      distinctTagsCount,
      mostUsedTag,
    },
    recentSessions,
    topTags,
  };
}

// Middleware
app.use(cors());
app.use(express.json());

// Port (fra .env eller fallback)
const PORT = process.env.PORT || 4000;

// Simple health-check route (til Insomnia eller browser)
app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        message: "Combat Analyzer API is running",
    });
});

// GET Hent alle athletes, evt. filtreret på navn
app.get("/api/athletes", async (req, res) => {
    try {
        const { name } = req.query;

        const athletes = await prisma.athlete.findMany({
            where: name
                ? {
                    name: {
                        contains: String(name),
                    },
                }
                : undefined,
                orderBy: {
                    createdAt: 'desc',
                },
        });
        
        res.json(athletes);
    } catch (error) {
        console.error("Error fetching athletes:", error);
        res.status(500).json({ error: "Failed to fetch athletes" });
    }
});

// POST /api/athletes - opret en ny athlete
app.post("/api/athletes", async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || typeof name !== "string") {
            return res.status(400).json({ error: "Name is required and must be a string" });
        }
        const athlete = await prisma.athlete.create({
            data: { name },
        });
        res.status(201).json(athlete);
    } catch (error) {
        console.error("Error creating athlete:", error);
        res.status(500).json({ error: "Failed to create athlete" });
    }
});

// GET /api/athletes/:id - hent athlete på id
app.get("/api/athletes/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            return res.status(400).json({ error: "Invalid athlete ID" });
        }
        
        const athlete = await prisma.athlete.findUnique({
            where: { id },
            include: {
                sessions: true, 
            },
        });

        if (!athlete) {
            return res.status(404).json({ error: "Athlete not found" });
        }

        res.json(athlete);
    } catch (error) {
        console.error("Error fetching athlete:", error);
        res.status(500).json({ error: "Failed to fetch athlete" });
    }
});

// PUT /api/athletes/:id - opdater athlete på id
app.put("/api/athletes/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { name } = req.body;

        if (Number.isNaN(id)) {
            return res.status(400).json({ error: "Invalid id" });
        }

        if (!name || typeof name !== "string") {
            return res.status(400).json({ error: "Name is required and must be a string" });
    }

    const athlete = await prisma.athlete.update({
        where: { id },
        data: { name },
    });

    res.json(athlete);
    } catch (error: any) {
    console.error("Error updating athlete:", error);

    if (error.code === 'p2025') {
        // Prisma record not found
        return res.status(404).json({ error: "Athlete not found" });
    }

    res.status(500).json({ error: "Failed to update athlete" });
    }
});

// DELETE /api/athletes/:id - slet athlete
app.delete("/api/athletes/:id", async (req, res) => {
    console.log("DELETE /api/athletes/" + req.params.id);
    try {
        const id = Number(req.params.id);

        if (Number.isNaN(id)) {
            return res.status(400).json({ error: "Invalid id" });
        }

        await prisma.athlete.delete({
            where: { id },
        });

        res.status(204).send();
    } catch (error: any) {
        console.error("Error deleting athlete:", error);

        if (error.code === "p2025") {
            return res.status(404).json({ error: "Athlete not found"});
        }
        res.status(500).json({ error: "Failed to delete athlete" });
    }
});

// POST /api/athletes/:athleteId/sessions - opret ny session for athlete
app.post("/api/athletes/:athleteId/sessions", async (req, res) => {
  try {
    const athleteId = Number(req.params.athleteId);
    const { videoUrl, notes } = req.body;

    if (Number.isNaN(athleteId)) {
      return res.status(400).json({ error: "Invalid athlete id" });
    }

    if (!videoUrl || typeof videoUrl !== "string") {
      return res.status(400).json({ error: "videoUrl is required and must be a string" });
    }

    const session = await prisma.session.create({
      data: {
        athleteId,
        videoUrl,
        notes: notes ?? null,
      },
    });

    res.status(201).json(session);
  } catch (error: any) {
    console.error("Error creating session:", error);
    if (error.code === "P2003") {
      // foreign key failed → athlete findes ikke
      return res.status(404).json({ error: "Athlete not found" });
    }
    res.status(500).json({ error: "Failed to create session" });
  }
});

// GET /api/athletes/:athleteId/sessions - hent alle sessions for athlete
app.get("/api/athletes/:athleteId/sessions", async (req, res) => {
  try {
    const athleteId = Number(req.params.athleteId);
    const { search } = req.query;

    if (Number.isNaN(athleteId)) {
      return res.status(400).json({ error: "Invalid athlete id" });
    }

    const sessions = await prisma.session.findMany({
      where: {
        athleteId,
        notes: search
          ? {
              contains: String(search),
            }
          : undefined,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(sessions);
  } catch (error) {
    console.error("Error fetching sessions:", error);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

// GET /api/tags?search=guard - hent tags + søg tags
app.get("/api/tags", async (req, res) => {
    try {
        const search =
            typeof req.query.search === "string" ? req.query.search : undefined;

        const tags = await prisma.tag.findMany({
            where: search
                ? {
                    name: {
                        contains: search,
                    },
                }
            : undefined,
            orderBy: {
                name: "asc",
            },
        });

        res.json(tags);
    } catch (error) {
        console.error("Error fetching tags:", error);
        res.status(500).json({ error: "Failed to fetch tags" });
    }
});

// POST /api/tags - opret ny tag
app.post("/api/tags", async (req: Request, res: Response) => {
    try {
        const { name, description } = req.body;
        
        if (!name || typeof name !== "string") {
            return res.status(400).json({ error: "Name is required and must be a string" });
        }

        const tag = await prisma.tag.create({
            data: {
                name,
                description: description ?? null,
            },
        });

        res.status(201).json(tag);
        } catch (error: any) {
            console.error("Error creating tag:", error);

            // Hvis name er unik og der allerede findes et tag med samme navn
            if (error.code === "P2002") {
                return res.status(409).json({ error: "Tag with this name already exists" });
        }

        res.status(500).json({ error: "Failed to create tag", code: error.code, message: error.message, });
    }
});

// POST /api/sessions/:sessionId/tags - tilføj et tag til en session
// body: { "tagId": 1, "timestampSec": 45, "note": Drops guard after jab" } - eksempel
app.post("/api/sessions/:sessionId/tags", async (req, res) => {
    try {
        const sessionId = Number(req.params.sessionId);
        const { tagId, timestampSec, note } = req.body;

        if (Number.isNaN(sessionId)) {
            return res.status(400).json({ error: "Invalid session ID" });
        }

        if (!tagId || typeof tagId !== "number") {
            return res.status(400).json({ error: "tagId is required and must be a number" });
        }

        const sessionTag = await prisma.sessionTag.create({
            data: {
                sessionId,
                tagId,
                timestampSec:
                    typeof timestampSec === "number" ? timestampSec : null,
                note: note ?? null,
            },
            include: {
                tag: true,
            },
        });

        res.status(201).json(sessionTag);
    } catch (error: any) {
        console.error("Error creating sessionTag:", error);

        // Fremmednøgle fejl: session eller tag findes ikke
        if (error.code === "p2003") {
            return res.status(400).json({ error: "Session or tag not found" });
        }

        res.status(500).json({ error: "Failed to create sessionTag" });
    }
});

// GET /api/sessions/:sessionId/tags - hent alle tags på en session
app.get("/api/sessions/:sessionId/tags", async (req, res) => {
  try {
    const sessionId = Number(req.params.sessionId);

    if (Number.isNaN(sessionId)) {
      return res.status(400).json({ error: "Invalid session id" });
    }

    const sessionTags = await prisma.sessionTag.findMany({
      where: { sessionId },
      include: {
        tag: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    res.json(sessionTags);
  } catch (error) {
    console.error("Error fetching session tags:", error);
    res.status(500).json({ error: "Failed to fetch session tags" });
  }
});

// DELETE /api/sessions/:sessionId/tags/:sessionTagId - slet et tag fra en session
app.delete(
  "/api/sessions/:sessionId/tags/:sessionTagId",
  async (req, res) => {
    try {
      const sessionId = Number(req.params.sessionId);
      const sessionTagId = Number(req.params.sessionTagId);

      if (Number.isNaN(sessionId) || Number.isNaN(sessionTagId)) {
        return res
          .status(400)
          .json({ error: "Invalid session id or tag id" });
      }

      await prisma.sessionTag.delete({
        where: { id: sessionTagId },
      });

      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting session tag:", error);

      if (error.code === "P2025") {
        return res
          .status(404)
          .json({ error: "SessionTag not found" });
      }

      res.status(500).json({ error: "Failed to delete session tag" });
    }
  }
);

// GET /api/athletes/:athleteId/stats/tags - hent statistik over tags for en athlete
app.get(
  "/api/athletes/:athleteId/stats/tags",
  async (req: Request<{ athleteId: string }>, res: Response) => {
    try {
      const athleteId = Number(req.params.athleteId);

      if (Number.isNaN(athleteId)) {
        return res.status(400).json({ error: "Invalid athlete id" });
      }

      // 1) Gruppér SessionTags pr. tagId for denne athlete
      const grouped = await prisma.sessionTag.groupBy({
        by: ["tagId"],
        where: {
          session: {
            athleteId,
          },
        },
        _count: {
          _all: true,
        },
      });

      if (grouped.length === 0) {
        return res.json({
          athleteId,
          totalTagApplications: 0,
          topTags: [],
        });
      }

      // Sorter i JS efter count (desc)
      const sorted = grouped.sort(
        (a, b) => (b._count?._all ?? 0) - (a._count?._all ?? 0)
      );

      const tagIds = sorted.map((g) => g.tagId);

      // 2) Hent tags for de IDs
      const tags = await prisma.tag.findMany({
        where: {
          id: {
            in: tagIds,
          },
        },
      });

      // 3) Join data til et pænt response
      const tagMap = new Map<number, (typeof tags)[number]>();
      tags.forEach((t) => tagMap.set(t.id, t));

      const topTags = sorted.map((g) => {
        const tag = tagMap.get(g.tagId);
        const count = g._count?._all ?? 0;

        return {
          tagId: g.tagId,
          name: tag?.name ?? "Unknown",
          description: tag?.description ?? null,
          count,
        };
      });

      const totalTagApplications = topTags.reduce(
        (sum, t) => sum + t.count,
        0
      );

      res.json({
        athleteId,
        totalTagApplications,
        topTags,
      });
    } catch (error) {
      console.error("Error fetching athlete tag stats:", error);
      res.status(500).json({ error: "Failed to fetch athlete tag stats" });
    }
  }
);

// GET /api/athletes/:athleteId/stats/sessions - session stats for en athlete
app.get(
  "/api/athletes/:athleteId/stats/sessions",
  async (req: Request<{ athleteId: string }>, res: Response) => {
    try {
      const athleteId = Number(req.params.athleteId);

      if (Number.isNaN(athleteId)) {
        return res.status(400).json({ error: "Invalid athlete id" });
      }

      // Hent alle sessions for athlete + antal tags pr. session
      const sessions = await prisma.session.findMany({
        where: { athleteId },
        orderBy: {
          createdAt: "asc",
        },
        include: {
          _count: {
            select: {
              sessionTags: true,
            },
          },
        },
      });

      if (sessions.length === 0) {
        return res.json({
          athleteId,
          sessionCount: 0,
          totalTags: 0,
          averageTagsPerSession: 0,
          sessions: [],
        });
      }

      const sessionStats = sessions.map((s) => ({
        sessionId: s.id,
        videoUrl: s.videoUrl,
        notes: s.notes,
        createdAt: s.createdAt,
        tagCount: s._count.sessionTags,
      }));

      const totalTags = sessionStats.reduce(
        (sum, s) => sum + s.tagCount,
        0
      );

      const averageTagsPerSession = totalTags / sessions.length;

      res.json({
        athleteId,
        sessionCount: sessions.length,
        totalTags,
        averageTagsPerSession,
        sessions: sessionStats,
      });
    } catch (error) {
      console.error("Error fetching athlete session stats:", error);
      res.status(500).json({ error: "Failed to fetch athlete session stats" });
    }
  }
);

// GET /api/athletes/:athleteId/dashboard
app.get(
  "/api/athletes/:athleteId/dashboard",
  async (req: Request<{ athleteId: string }>, res: Response) => {
    try {
      const athleteId = Number(req.params.athleteId);

      if (Number.isNaN(athleteId)) {
        return res.status(400).json({ error: "Invalid athlete id" });
      }

      const dashboard = await buildAthleteDashboard(athleteId);
      res.json(dashboard);
    } catch (error) {
      console.error("Error in /api/athletes/:athleteId/dashboard:", error);
      if (error instanceof Error && error.message === "ATHLETE_NOT_FOUND") {
        return res.status(404).json({ error: "Athlete not found" });
      }
      res.status(500).json({ error: "Failed to fetch athlete dashboard" });
    }
  }
);

// GET /api/my/dashboard
app.get(
  "/api/my/dashboard",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        include: {
          athlete: true,
        },
      });

      if (!user || !user.athlete) {
        return res
          .status(404)
          .json({ error: "Athlete profile not found for this user" });
      }

      const dashboard = await buildAthleteDashboard(user.athlete.id);
      res.json(dashboard);
    } catch (error) {
      console.error("Error in /api/my/dashboard:", error);
      res.status(500).json({ error: "Failed to fetch my dashboard" });
    }
  }
);

// POST /api/auth/register - opret ny bruger
app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, password, name } = req.body as {
        email?: string;
        password?: string;
        name?: string;
      };

      if (!email || !password || !name) {
        return res.status(400).json({ error: "Email, password and name is required" });
      }

      const trimmedEmail = email.toLowerCase().trim();
      const existing = await prisma.user.findUnique({
        where: { email: trimmedEmail },
      });

      if (existing) {
        return res.status(409).json({ error: "User with this email already exists" });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters long" });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          email: trimmedEmail,
          passwordHash,
          athlete: {
            create: {
              name,
            },
          },
        },
        include: {
          athlete: true,
        },
      });

      const token = signToken(user.id);

      res.status(201).json({
        token,
        user: {
          id: user.id,
          email: user.email,
        },
        athlete: user.athlete,
      });
    } catch (error) {
      console.error("Error in /api/auth/register:", error);
      res.status(500).json({ error: "Failed to register user" });
    }
});

// POST /api/aith/login - login eksisterende bruger
app.post("/api/auth/login", async(req: Request, res: Response) => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return res.status (400).json({ error: "Email and password is required" });
    }

    const trimmedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: trimmedEmail },
      include: {
        athlete: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: "Wrong email or password" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Wrong email or password" });
    }

    const token = signToken(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
      },
      athlete: user.athlete,
    });
  } catch (error) {
    console.error("Error in /api/auth/login:", error);
    res.status(500).json({ error: "Failed to login" });
  }
});

// GET /api/me
app.get("/api/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        athlete: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
      },
      athlete: user.athlete,
    });
  } catch (error) {
    console.error("Error in /api/me:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// "/api/my/sessions"
app.post("/api/my/sessions", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        athlete: true,
      },
    });

    if (!user || !user.athlete) {
      return res.status(404).json({ error: "Athlete profile not found for this user" });
    }

    const { videoUrl, notes } = req.body as {
      videoUrl?: string;
      notes?: string;
    };

    if (!videoUrl || !videoUrl.trim()) {
      return res.status(400).json({ error: "videoUrl is required" });
    }

    const session = await prisma.session.create({
      data: {
        athleteId: user.athlete.id,
        videoUrl: videoUrl.trim(),
        notes: notes?.trim() || null,
      },
    });

    res.status(201).json(session);
  } catch (error) {
    console.error("Error in POST /api/my/sessions:", error);
    res.status(500).json({ error: "Failed to create session" });
  }
});

app.post("/api/my/sessions/upload", authMiddleware, upload.single("video"), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { athlete: true },
    });

    if (!user || !user.athlete) {
      return res.status(404).json({ error: "Athlete profile not found for this user" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Video file is required" });
    }

    const { notes } = req.body as { notes?: string };

    // gem relativ sti, som frontend kan bruge direkte
    const videoUrl = `/uploads/${req.file.filename}`;

    const session = await prisma.session.create({
      data: {
        athleteId: user.athlete.id,
        videoUrl,
        notes: notes?.trim() || null,
      },
    });

    res.status(201).json(session);
  } catch (error) {
    console.error("Error in POST /api/my/sessions/upload:", error);
    res.status(500).json({ error: "Failed to create session with video" });
  }
});

// "/api/my/sessions/:sessionId"
app.get("/api/my/sessions/:sessionId", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const sessionId = Number(req.params.sessionId);
    if (Number.isNaN(sessionId)) {
      return res.status(400).json({ error: "Invalid session id" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { athlete: true },
    });

    if (!user || !user.athlete) {
      return res.status(404).json({ error: "Athlete profile not found for this user" });
    }

    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        athleteId: user.athlete.id,
      },
      include: {
        sessionTags: {
          include: {
            tag: true,
          },
          orderBy: {
            timestampSec: "asc",
          },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json(session);
  } catch (error) {
    console.error("Error in GET /api/my/session/:sessionId:", error);
    res.status(500).json({ error: "Failed to fetch session" });
  }
});

// /api/my/sessions/:sessionId/tags - tilføj tag ved timestamp
app.post("/api/my/sessions/:sessionId/tags", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const sessionId = Number(req.params.sessionId);
    if (Number.isNaN(sessionId)) {
      return res.status(400).json({ error: "Invalid session iD" });
    }

    const { tagId, timestampSec, note } = req.body as {
      tagId?: number;
      timestampSec?: number;
      note?: string;
    };

    if (!tagId) {
      return res.status(400).json({ error: "tagId is required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { athlete: true },
    });

    if (!user || !user.athlete) {
      return res.status(404).json({ error: "Athlete profile not found for this user" });
    }

    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        athleteId: user.athlete.id,
      },
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const created = await prisma.sessionTag.create({
      data: {
        sessionId,
        tagId,
        timestampSec: timestampSec ?? null,
        note: note?.trim() || null,
      },
      include: {
        tag: true,
      },
    });

    res.status(201).json(created);
  } catch (error) {
    console.error("Error in POST /api/my/sessions/:sessionId/tags:", error);
    res.status(500).json({ error: "Failed to create session tag" });
  }
});


// 404 fallback
app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
});

// Start server
app.listen(PORT, () => {
    console.log('API running on http:/localhost:${PORT}');
});