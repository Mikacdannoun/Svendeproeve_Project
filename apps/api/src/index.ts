import express from "express";
import cors from "cors";
import dotenv from "dotenv";

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

// Dummy route til senere (fx liste af atleter)
app.get("/api/athletes", (req, res) => {
    const athletes = [
        { id: 1, name: "Test Fighter 1" },
        { id: 2, name: "Test Fighter 2" },
    ];

    res.json(athletes);
});

// 404 fallback
app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
});

// Start server
app.listen(PORT, () => {
    console.log('API running on http:/localhost:${PORT}');
});