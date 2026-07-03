import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const cluster1 = await prisma.cluster.create({
    data: {
      label: "Global Economy Updates",
      articleCount: 2,
      startTime: new Date("2024-01-15T08:00:00Z"),
      endTime: new Date("2024-01-15T18:00:00Z"),
    },
  });

  const cluster2 = await prisma.cluster.create({
    data: {
      label: "Technology Breakthroughs",
      articleCount: 2,
      startTime: new Date("2024-01-16T09:00:00Z"),
      endTime: new Date("2024-01-16T20:00:00Z"),
    },
  });

  await prisma.article.createMany({
    data: [
      {
        title: "Global Markets Rally on Economic Data",
        url: "https://example.com/global-markets-rally",
        source: "BBC News",
        summary: "Stock markets worldwide surged following positive economic indicators from major economies.",
        publishedAt: new Date("2024-01-15T10:00:00Z"),
        clusterId: cluster1.id,
      },
      {
        title: "Central Banks Announce New Policy Measures",
        url: "https://example.com/central-banks-policy",
        source: "Reuters",
        summary: "Major central banks coordinate new policy measures to address inflation concerns.",
        publishedAt: new Date("2024-01-15T14:00:00Z"),
        clusterId: cluster1.id,
      },
      {
        title: "AI Research Team Achieves Major Milestone",
        url: "https://example.com/ai-milestone",
        source: "TechCrunch",
        summary: "A breakthrough in natural language processing promises more efficient AI systems.",
        publishedAt: new Date("2024-01-16T11:00:00Z"),
        clusterId: cluster2.id,
      },
      {
        title: "Quantum Computing Progress Accelerates",
        url: "https://example.com/quantum-computing",
        source: "Wired",
        summary: "New quantum processor demonstrates error correction capabilities at scale.",
        publishedAt: new Date("2024-01-16T16:00:00Z"),
        clusterId: cluster2.id,
      },
    ],
  });

  console.log("Seed data created successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
