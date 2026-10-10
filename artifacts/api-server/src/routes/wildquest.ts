import { Router, type IRouter } from "express";
import { GenerateWildquestBody, GenerateWildquestResponse } from "@workspace/api-zod";
import { askGemma, isGemmaConfigured } from "../lib/gemma";
import { requestLimit } from "../middlewares/request-limit";

const router: IRouter = Router();
const safeMissionWarning =
  "Observe from a respectful distance. Never approach or touch wildlife, disturb nests, feed wild animals, handle unknown plants or fungi, or share precise locations of endangered species.";

router.post(
  "/wildquest/generate",
  requestLimit("gemma-wildquest", 10),
  async (req, res): Promise<void> => {
    if (!isGemmaConfigured()) {
      res.status(503).json({ error: "Gemma mission generation is not configured." });
      return;
    }
    const parsedBody = GenerateWildquestBody.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(400).json({ error: "Provide a short mission context." });
      return;
    }

    try {
      const context = parsedBody.data;
      const generated = await askGemma([
        {
          role: "system",
          content:
            "Create one practical, low-impact outdoor nature observation mission. It must be safe for a beginner. Never recommend approaching dangerous wildlife, disturbing nests, touching unknown plants or fungi, feeding animals, collecting organisms, or sharing precise locations of endangered species. Return JSON only with title, description, durationMinutes (3-30), difficulty (Easy or Moderate), instructions (3-5 short strings), observe (2-4 short strings), and safetyGuidance.",
        },
        {
          role: "user",
          content: `Mission context: ${context.context}. ${context.country ? `Country context: ${context.country}.` : ""} ${context.species ? `Species context: ${context.species}.` : ""} Use only safe, non-invasive observation and do not claim sightings are guaranteed.`,
        },
      ]);
      const generatedObject =
        generated && typeof generated === "object"
          ? (generated as Record<string, unknown>)
          : {};
      const mission = {
        title: typeof generatedObject.title === "string" ? generatedObject.title.slice(0, 120) : "",
        description:
          typeof generatedObject.description === "string"
            ? generatedObject.description.slice(0, 360)
            : "",
        durationMinutes:
          typeof generatedObject.durationMinutes === "number"
            ? Math.max(3, Math.min(30, Math.round(generatedObject.durationMinutes)))
            : 10,
        difficulty:
          generatedObject.difficulty === "Moderate" ? "Moderate" : "Easy",
        instructions: Array.isArray(generatedObject.instructions)
          ? generatedObject.instructions
              .filter((item): item is string => typeof item === "string")
              .map((item) => item.slice(0, 240))
              .slice(0, 5)
          : [],
        observe: Array.isArray(generatedObject.observe)
          ? generatedObject.observe
              .filter((item): item is string => typeof item === "string")
              .map((item) => item.slice(0, 180))
              .slice(0, 4)
          : [],
        safetyGuidance:
          typeof generatedObject.safetyGuidance === "string"
            ? `${generatedObject.safetyGuidance.slice(0, 400)} ${safeMissionWarning}`
            : safeMissionWarning,
      };
      const riskyPositiveInstruction =
        /\b(?:approach|touch|handle|feed|collect|disturb)\b.{0,50}\b(?:wildlife|animal|bird|nest|plant|fungus|mushroom)\b/i;
      if (
        mission.instructions.some((item) => riskyPositiveInstruction.test(item)) ||
        mission.observe.some((item) => riskyPositiveInstruction.test(item))
      ) {
        res.status(502).json({
          error: "The generated mission did not pass the safety check. Please try again.",
        });
        return;
      }
      res.json(GenerateWildquestResponse.parse(mission));
    } catch (error) {
      const providerStatus =
        error && typeof error === "object" && "providerStatus" in error
          ? Number(error.providerStatus)
          : null;
      req.log.warn(
        { providerStatus, message: error instanceof Error ? error.message : "Unknown error" },
        "WildQuest generation failed",
      );
      res.status(502).json({
        error:
          providerStatus === 401 || providerStatus === 402 || providerStatus === 403
            ? "OpenRouter could not authorize this request. Check the key and model access in OpenRouter."
            : "A mission could not be generated right now. Please try again shortly.",
      });
    }
  },
);

export default router;
