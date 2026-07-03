import { PrismaClient } from "@prisma/client";

export class JobRepository {
  constructor(private prisma: PrismaClient) {}

  async create() {
    return this.prisma.ingestJob.create({
      data: {
        status: "pending",
      },
    });
  }

  async updateStatus(id: string, status: string, error?: string) {
    const data: Record<string, unknown> = { status };

    if (status === "running") {
      data.startedAt = new Date();
    } else if (status === "completed") {
      data.completedAt = new Date();
    } else if (status === "failed") {
      data.completedAt = new Date();
      if (error) {
        data.error = error;
      }
    }

    return this.prisma.ingestJob.update({
      where: { id },
      data,
    });
  }

  async findById(id: string) {
    return this.prisma.ingestJob.findUnique({
      where: { id },
    });
  }
}
