import { spawn } from "child_process";
import path from "path";
import { JobRepository } from "../repositories/jobRepository";
import { JobStatusResponse } from "../types";
import logger from "../utils/logger";

export class IngestService {
  constructor(private jobRepository: JobRepository) {}

  async triggerIngest(): Promise<JobStatusResponse> {
    const job = await this.jobRepository.create();

    const pythonPath = process.env.PYTHON_PATH || "python";
    const scraperPath = path.resolve(
      __dirname,
      process.env.SCRAPER_PATH || "../../../scraper/src/main.py"
    );

    const child = spawn(pythonPath, [scraperPath, "--quick"], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
    });

    let stdoutData = "";
    let stderrData = "";

    child.stdout?.on("data", (data: Buffer) => {
      const text = data.toString();
      stdoutData += text;
      // Log each line from Python in real-time
      for (const line of text.split("\n").filter(Boolean)) {
        logger.info("[Python] " + line);
      }
    });

    child.stderr?.on("data", (data: Buffer) => {
      stderrData += data.toString();
    });

    child.on("error", async (err: Error) => {
      logger.error("Ingest process failed to start", { error: err.message });
      await this.jobRepository.updateStatus(
        job.id,
        "failed",
        err.message
      );
    });

    child.on("close", async (code: number | null) => {
      const summary = stdoutData
        .split("\n")
        .filter(
          (l) =>
            l.includes("Fetched") ||
            l.includes("Inserted") ||
            l.includes("Found") ||
            l.includes("Summary:") ||
            l.includes("No articles")
        )
        .join("; ");

      if (code === 0) {
        logger.info("Ingest completed", { jobId: job.id, summary });
        await this.jobRepository.updateStatus(job.id, "completed");
      } else {
        const errorMsg = stderrData || `Process exited with code ${code}`;
        logger.error("Ingest failed", { jobId: job.id, error: errorMsg, summary });
        await this.jobRepository.updateStatus(job.id, "failed", errorMsg);
      }
    });

    await this.jobRepository.updateStatus(job.id, "running");

    return {
      id: job.id,
      status: "running",
      startedAt: new Date().toISOString(),
      completedAt: null,
      error: null,
    };
  }

  async getJobStatus(jobId: string): Promise<JobStatusResponse | null> {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const job = await this.jobRepository.findById(jobId);
        if (!job) return null;
        return {
          id: job.id,
          status: job.status,
          startedAt: job.startedAt?.toISOString() || null,
          completedAt: job.completedAt?.toISOString() || null,
          error: job.error || null,
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (lastError.message.includes("Timed out fetching a new connection")) {
          logger.warn("Connection pool timeout, retrying...", { attempt: attempt + 1 });
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  }
}
