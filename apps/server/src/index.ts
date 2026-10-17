// File: apps/server/src/index.ts
import express from "express";
import cors from "cors";
import agentRouter from "./routes/agentRoutes.js";


const app = express();
const PORT = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});
 
app.use("/api",agentRouter)


app.listen(PORT, () => {
  console.log(`Gateway listening on http://localhost:${PORT}`);
});