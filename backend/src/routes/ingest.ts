import { Router, Request, Response, NextFunction } from "express";
import { IngestService } from "../services/ingestService";
import { AppError } from "../middleware/errorHandler";

export function createIngestRoutes(
  ingestService: IngestService
): Router {
  const router = Router();

  router.post(
    "/trigger",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const job = await ingestService.triggerIngest();
        res.status(201).json(job);
      } catch (err) {
        next(err);
      }
    }
  );

  router.get(
    "/status/:jobId",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const jobStatus = await ingestService.getJobStatus(req.params.jobId);

        if (!jobStatus) {
          throw new AppError("Job not found", 404);
        }

        res.json(jobStatus);
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
}
