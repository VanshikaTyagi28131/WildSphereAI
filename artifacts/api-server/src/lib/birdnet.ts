import { execFile, spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";

const execFileAsync = promisify(execFile);
let resolvedPython: string | null | undefined;
let probeUntil = 0;

function pythonCandidates(): string[] {
  const envPython = process.env.BIRDNET_PYTHON;
  return [
    ...(envPython ? [envPython] : []),
    path.resolve(process.cwd(), "../../.pythonlibs/bin/python"),
    path.resolve(process.cwd(), "../.pythonlibs/bin/python"),
    path.resolve(process.cwd(), ".pythonlibs/bin/python"),
    "python3",
  ];
}

export async function getBirdnetPython(): Promise<string | null> {
  if (resolvedPython && probeUntil > Date.now()) return resolvedPython;
  if (resolvedPython === null && probeUntil > Date.now()) return null;

  for (const executable of pythonCandidates()) {
    try {
      await execFileAsync(executable, ["-c", "import birdnet"], {
        timeout: 5_000,
      });
      resolvedPython = executable;
      probeUntil = Date.now() + 5 * 60_000;
      return executable;
    } catch {
      // Try the next Python runtime; no file data is sent during this probe.
    }
  }
  resolvedPython = null;
  probeUntil = Date.now() + 30_000;
  return null;
}

export async function classifyBirdAudio(
  python: string,
  audio: Buffer,
  extension: string,
): Promise<Array<{ commonName: string; scientificName: string; confidence: number }>> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "wildsphere-birdnet-"));
  const audioPath = path.join(tempDir, `${randomUUID()}${extension}`);
  const scriptPath = path.resolve(process.cwd(), "src/lib/birdnet_predict.py");
  try {
    await writeFile(audioPath, audio, { mode: 0o600 });
    const output = await new Promise<string>((resolve, reject) => {
      const child = spawn(python, [scriptPath, audioPath], {
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, PYTHONUNBUFFERED: "1" },
      });
      let stdout = "";
      let stderr = "";
      const timeout = setTimeout(() => {
        child.kill("SIGTERM");
        setTimeout(() => child.kill("SIGKILL"), 2_000).unref();
        reject(new Error("BirdNET analysis timed out"));
      }, 120_000);
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        stdout += chunk;
        if (stdout.length > 100_000) child.kill("SIGTERM");
      });
      child.stderr.on("data", (chunk: string) => {
        if (stderr.length < 8_000) stderr += chunk;
      });
      child.on("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      child.on("close", (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          reject(new Error(`BirdNET exited with code ${code}: ${stderr.slice(-1_000)}`));
          return;
        }
        resolve(stdout);
      });
    });

    const parsed = JSON.parse(output) as {
      candidates?: Array<{
        commonName?: string;
        scientificName?: string;
        confidence?: number;
      }>;
    };
    if (!Array.isArray(parsed.candidates)) {
      throw new Error("BirdNET response had an unexpected shape");
    }
    return parsed.candidates
      .filter(
        (candidate) =>
          typeof candidate.commonName === "string" &&
          typeof candidate.scientificName === "string" &&
          typeof candidate.confidence === "number" &&
          Number.isFinite(candidate.confidence) &&
          candidate.confidence >= 0 &&
          candidate.confidence <= 1,
      )
      .slice(0, 5)
      .map((candidate) => ({
        commonName: candidate.commonName as string,
        scientificName: candidate.scientificName as string,
        confidence: candidate.confidence as number,
      }));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

export function audioExtension(mimetype: string): string {
  const extensions: Record<string, string> = {
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/wave": ".wav",
    "audio/mpeg": ".mp3",
    "audio/mp3": ".mp3",
    "audio/ogg": ".ogg",
    "audio/flac": ".flac",
    "audio/x-flac": ".flac",
    "audio/mp4": ".m4a",
    "audio/x-m4a": ".m4a",
    "audio/aac": ".aac",
  };
  return extensions[mimetype] || ".audio";
}
