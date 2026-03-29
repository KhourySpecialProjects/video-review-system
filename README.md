# Angelman Syndrome Video Management Portal

A secure web-based platform for managing and reviewing caregiver-recorded seizure videos for Angelman Syndrome clinical research. Built in collaboration with Dr. Wen-Hann Tan and the Angelman Syndrome Clinical Research Group at Boston Children's Hospital.

---

## Overview

The portal supports four user roles — caregivers, clinical reviewers, site coordinators, and system administrators — each with clearly defined access boundaries. Core features include secure video upload, streaming, timestamped annotation, video clipping, and a full audit trail.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript, Vite, React Router v7 (data layer mode) |
| Styling | Tailwind CSS v4, shadcn/ui |
| Backend | Go, chi v5 |
| Database | PostgreSQL 16, pgx v5, goose migrations |
| Infrastructure | Docker, AWS Amplify, AWS App Runner, AWS RDS, AWS S3 |

---

## Repository Structure

```
angelman-video-portal/
├── frontend/          # React SPA — Vite + React Router + Tailwind + shadcn/ui
├── backend/           # Go REST API — chi + pgx + goose
├── docker-compose.yml # Full local stack — frontend, backend, postgres
└── .env.local         # Local environment variables (not committed)
```

---

## Prerequisites

Make sure the following are installed before getting started:

- [Node.js](https://nodejs.org/) v20+
- [Go](https://go.dev/dl/) v1.22+
- [Docker](https://www.docker.com/) + Docker Compose
- [AWS CLI](https://aws.amazon.com/cli/)

---

## Quick Start (Docker)

The easiest way to run the full stack locally is with Docker Compose.

### 1. Configure AWS credentials

```bash
aws configure sso
```
when running this up session name as whatever you want
SSO Start url should be the link from the invitation email
SSO region should be us-east-1
SSO regristration scopres just click enter
Sign in on the web browser
default client region should be us-east-1
default format just click enter
profile name needs to be "default"


### 2. Create `.env` in the project root
```bash
./scripts/pull-env.sh
```

### 3. Start all services

```bash
docker-compose up --build
```

| Service  | URL                    |
|----------|------------------------|
| Frontend | http://localhost:3000  |
| Backend  | http://localhost:8080  |
| Postgres | localhost:5432         |

### 4. Stop all services

```bash
docker-compose down
```

To also remove the database volume:

```bash
docker-compose down -v
```

---

## Running Services Individually

See [`frontend/README.md`](./frontend/README.md) and [`backend/README.md`](./backend/README.md) for per-service setup instructions.

---

## User Roles

| Role | Access |
|---|---|
| Caregiver | Upload and view their own videos only |
| Clinical Reviewer | Stream, annotate, clip, and note all videos |
| Site Coordinator | Manage caregiver accounts and videos within their site |
| System Administrator | Full system access, manage all accounts and audit logs |

---

## AWS Deployment

```
Users → AWS Amplify (Frontend SPA)
               ↓ API calls
        AWS App Runner (Go Backend)
               ↓
          AWS RDS (PostgreSQL)
               ↓
          AWS S3 (Video Storage)
```

Refer to the deployment sections in each service README for full instructions.