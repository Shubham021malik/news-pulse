# News Pulse — Topic-Clustered News Timeline

A full-stack application that ingests live news articles from multiple RSS feeds, automatically groups related articles into topic clusters using TF-IDF and cosine similarity, and displays them on an interactive timeline.

## Architecture

```
Python Scraper  ──►  Node.js Backend  ──►  Next.js Frontend
      │                    │
      └────────────────────┴──►  Supabase PostgreSQL
```

- **Python Scraper** — RSS ingestion (BBC, NPR, Guardian), full-text extraction, TF-IDF clustering
- **Node.js Backend** — Express REST API with Prisma ORM, TypeScript
- **Next.js Frontend** — React, TypeScript, Tailwind CSS, interactive timeline
- **Database** — Supabase PostgreSQL (articles, clusters, ingest_jobs)

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Scraper | Python, feedparser, trafilatura, scikit-learn, NLTK |
| Backend | Node.js, Express, TypeScript, Prisma |
| Frontend | Next.js 14, React 18, TypeScript, TailwindCSS |
| Database | Supabase PostgreSQL |

## Setup

### Prerequisites
- Python 3.11+, Node.js 20+, PostgreSQL (Supabase)

### Install & Run

```bash
# Python scraper
cd scraper && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt

# Backend
cd backend && npm install && cp .env.example .env
# Edit .env → set DATABASE_URL (Supabase connection string)
npx prisma generate && npx prisma db push && npm run dev       # Port 4000

# Frontend
cd frontend && npm install && cp .env.example .env
# Edit .env → set NEXT_PUBLIC_API_URL=http://localhost:4000/api
npm run dev                                                    # Port 3000

# Run scraper manually
cd scraper && python src/main.py --quick
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/clusters` | List clusters (?source=bbc) |
| GET | `/api/clusters/:id` | Cluster detail with articles |
| GET | `/api/timeline` | Timeline data with intensity |
| GET | `/api/sources` | Available news sources |
| POST | `/api/ingest/trigger` | Trigger Python scraper, returns job ID |
| GET | `/api/ingest/status/:jobId` | Poll job status |

## Topic Grouping

**Method**: TF-IDF Vectorization + Cosine Similarity + Connected Components

1. **Text Prep** — Title + summary lowercased, stop words removed
2. **TF-IDF** — scikit-learn `TfidfVectorizer` converts text to vectors
3. **Similarity** — Pairwise cosine similarity computed
4. **Clustering** — Connected components graph (threshold: 0.3)
5. **Labels** — Top 3 TF-IDF terms per cluster

### Limitations
- Cross-source story merging not implemented
- Single articles below threshold remain unclustered
- Full reclustering on each run (not incremental)

## News Sources

| Source | RSS Feed |
|--------|----------|
| BBC News | `http://feeds.bbci.co.uk/news/rss.xml` |
| NPR | `https://feeds.npr.org/1001/rss.xml` |
| The Guardian | `https://www.theguardian.com/world/rss` |

## Deployment

| Component | Platform | Notes |
|-----------|----------|-------|
| Frontend | Vercel | Set `NEXT_PUBLIC_API_URL` |
| Backend | Render | Set `DATABASE_URL`, `FRONTEND_URL`, `PYTHON_PATH`, `SCRAPER_PATH` |
| Database | Supabase | Hosted PostgreSQL |
| Python Pipeline | On-demand via `/api/ingest/trigger` | Runs as subprocess |

## Folder Structure

```
news-pulse/
├── scraper/          # Python RSS ingestion + clustering
├── backend/          # Node.js Express API
├── frontend/         # Next.js React app
└── README.md
```
