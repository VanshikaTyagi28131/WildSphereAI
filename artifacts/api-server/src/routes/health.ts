import { Router, type IRouter } from "express";
import {
  GetConfigStatusResponse,
  HealthCheckResponse,
} from "@workspace/api-zod";
import { getBirdnetPython } from "../lib/birdnet";
import { GEMMA_MODEL, isGemmaConfigured } from "../lib/gemma";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/health", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/config/status", async (_req, res): Promise<void> => {
  const birdnetConfigured = (await getBirdnetPython()) !== null;
  res.json(
    GetConfigStatusResponse.parse({
      gemma: {
        configured: isGemmaConfigured(),
        model: GEMMA_MODEL,
        provider: "OpenRouter",
      },
      birdAudio: {
        configured: birdnetConfigured,
        model: "BirdNET Acoustic 3.0",
        provider: "Local ONNX inference",
      },
      biodiversity: {
        configured: true,
        provider: "iNaturalist public API",
      },
    }),
  );
});

export default router;
