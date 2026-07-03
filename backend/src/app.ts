import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import logger from "./utils/logger";
import { errorHandler, AppError } from "./middleware/errorHandler";
import { ClusterRepository } from "./repositories/clusterRepository";
import { JobRepository } from "./repositories/jobRepository";
import { ClusterService } from "./services/clusterService";
import { IngestService } from "./services/ingestService";
import { TimelineService } from "./services/timelineService";
import { createClusterRoutes } from "./routes/clusters";
import { createTimelineRoutes } from "./routes/timeline";
import { createIngestRoutes } from "./routes/ingest";
import { createSourcesRoutes } from "./routes/sources";

export function createApp(): express.Application {
  const app = express();

  app.use(cors({
    origin: [process.env.FRONTEND_URL || "http://localhost:3000"],
    credentials: true,
  }));

  app.use(express.json());

  app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.info(`${req.method} ${req.url}`);
    next();
  });

  const prisma = new PrismaClient({
    log: ["error", "warn"],
    datasources: { db: { url: process.env.DATABASE_URL } },
  });

  const clusterRepository = new ClusterRepository(prisma);
  const jobRepository = new JobRepository(prisma);

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use("/api/clusters", createClusterRoutes(new ClusterService(clusterRepository)));
  app.use("/api/timeline", createTimelineRoutes(new TimelineService(clusterRepository)));
  app.use("/api/ingest", createIngestRoutes(new IngestService(jobRepository)));
  app.use("/api/sources", createSourcesRoutes(prisma));

  app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(new AppError("Route not found", 404));
  });

  app.use(errorHandler);

  return app;
}
