import { Router, Request, Response, NextFunction } from "express";
import { TimelineService } from "../services/timelineService";

export function createTimelineRoutes(
  timelineService: TimelineService
): Router {
  const router = Router();

  router.get(
    "/",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const source = req.query.source as string | undefined;
        const timeline = await timelineService.getTimeline(source);
        res.json(timeline);
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
}
