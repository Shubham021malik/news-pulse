import { Router, Request, Response, NextFunction } from "express";
import { ClusterService } from "../services/clusterService";
import { AppError } from "../middleware/errorHandler";

export function createClusterRoutes(
  clusterService: ClusterService
): Router {
  const router = Router();

  router.get(
    "/",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const source = req.query.source as string | undefined;
        const clusters = await clusterService.getAllClusters(source);
        res.json(clusters);
      } catch (err) {
        next(err);
      }
    }
  );

  router.get(
    "/:id",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const cluster = await clusterService.getClusterDetail(req.params.id);

        if (!cluster) {
          throw new AppError("Cluster not found", 404);
        }

        res.json(cluster);
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
}
