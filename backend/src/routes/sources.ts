import { Router, Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";

export function createSourcesRoutes(prisma: PrismaClient): Router {
  const router = Router();

  router.get(
    "/",
    async (_req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await prisma.article.findMany({
          distinct: ["source"],
          select: { source: true, sourceLabel: true },
          orderBy: { source: "asc" },
        });
        res.json(result);
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
}
