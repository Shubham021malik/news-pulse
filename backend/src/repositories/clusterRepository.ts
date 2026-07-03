import { PrismaClient } from "@prisma/client";
import { ClusterResponse, ClusterDetailResponse, TimelineItem } from "../types";

export class ClusterRepository {
  constructor(private prisma: PrismaClient) {}

  private toResponse(c: { id: string; label: string; articleCount: number; startTime: Date; endTime: Date }): ClusterResponse {
    return {
      id: c.id,
      label: c.label,
      articleCount: c.articleCount,
      startTime: c.startTime.toISOString(),
      endTime: c.endTime.toISOString(),
    };
  }

  async findAll(): Promise<ClusterResponse[]> {
    const clusters = await this.prisma.cluster.findMany({ orderBy: { startTime: "desc" } });
    return clusters.map((c) => this.toResponse(c));
  }

  async findBySource(source: string): Promise<ClusterResponse[]> {
    const clusters = await this.prisma.cluster.findMany({
      where: { articles: { some: { source } } },
      orderBy: { startTime: "desc" },
    });
    return clusters.map((c) => this.toResponse(c));
  }

  async findById(id: string): Promise<ClusterDetailResponse | null> {
    const cluster = await this.prisma.cluster.findUnique({
      where: { id },
      include: { articles: { orderBy: { publishedAt: "asc" } } },
    });
    if (!cluster) return null;
    return {
      ...this.toResponse(cluster),
      articles: cluster.articles.map((a) => ({
        id: a.id,
        title: a.title,
        url: a.url,
        source: a.source,
        sourceLabel: a.sourceLabel,
        summary: a.summary,
        publishedAt: a.publishedAt.toISOString(),
      })),
    };
  }

  async getTimelineData(source?: string): Promise<TimelineItem[]> {
    const where = source ? { articles: { some: { source } } } : {};
    const clusters = await this.prisma.cluster.findMany({ where, orderBy: { startTime: "asc" } });
    if (clusters.length === 0) return [];
    const maxCount = Math.max(...clusters.map((c) => c.articleCount));
    return clusters.map((c) => ({
      id: c.id,
      label: c.label,
      startTime: c.startTime.toISOString(),
      endTime: c.endTime.toISOString(),
      articleCount: c.articleCount,
      intensity: maxCount > 0 ? c.articleCount / maxCount : 0,
    }));
  }
}
