// File: apps/server/src/index.ts
import express from "express";
import cors from "cors";
import { Readable } from "node:stream";
import type { ReadableStream as NodeWebStream } from "node:stream/web";

const app = express();
const PORT = Number(process.env.PORT ?? 3000);
const AGENT_URL = process.env.AGENT_URL ?? "http://localhost:8000";

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/chat", async (req, res) => {
  // If the browser disconnects, cancel the request to Python
  const controller = new AbortController();
  res.on("close", () => controller.abort());

  try {
    const upstream = await fetch(`${AGENT_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
      signal: controller.signal,
    });

    if (!upstream.ok || !upstream.body) {
      res.status(502).json({ error: "Agent service error", status: upstream.status });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // Pipe Python's stream straight through to the browser
    Readable.fromWeb(upstream.body as unknown as NodeWebStream).pipe(res);
  } catch (err) {
    if (controller.signal.aborted) return;
    if (!res.headersSent) {
      res.status(502).json({ error: "Agent service unreachable" });
    } else {
      res.end();
    }
  }
});

app.listen(PORT, () => {
  console.log(`Gateway listening on http://localhost:${PORT}`);
});