import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import prisma from "./prisma";
import { Request, Response } from "express";

dotenv.config();

const app = express();

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



// 404 fallback
app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
});

// Start server
app.listen(PORT, () => {
    console.log('API running on http:/localhost:${PORT}');
});