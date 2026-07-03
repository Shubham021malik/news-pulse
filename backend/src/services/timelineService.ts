import { ClusterRepository } from "../repositories/clusterRepository";
import { TimelineItem } from "../types";

export class TimelineService {
  constructor(private repo: ClusterRepository) {}

  async getTimeline(source?: string): Promise<TimelineItem[]> {
    return this.repo.getTimelineData(source);
  }
}
