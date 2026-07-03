import { ClusterRepository } from "../repositories/clusterRepository";
import { ClusterResponse, ClusterDetailResponse } from "../types";

export class ClusterService {
  constructor(private repo: ClusterRepository) {}

  async getAllClusters(source?: string): Promise<ClusterResponse[]> {
    return source ? this.repo.findBySource(source) : this.repo.findAll();
  }

  async getClusterDetail(id: string): Promise<ClusterDetailResponse | null> {
    return this.repo.findById(id);
  }
}
