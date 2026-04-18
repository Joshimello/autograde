# AI Code Grading & Hosting Platform

## Overview

This system enables users to upload code submissions, evaluate them against customizable grading specs using AI-assisted analysis, and optionally deploy the resulting application as a hosted static site.

The platform is designed around a clear separation of concerns:

- **Frontend** for user interaction
- **PocketBase** for data, auth, storage, and realtime state
- **Go workers** for executing grading and deployment jobs
- **Docker** for secure, isolated code execution

## Core Architecture

### 1. Frontend (React)

- Allows users to create grading specs
- Handles submission uploads (as zip files)
- Triggers grading and deployment jobs
- Displays live progress and results via realtime updates

### 2. Backend (PocketBase)

- Acts as the **central system of record**
- Provides authentication, file storage, and database collections
- Stores grading specs, submissions, jobs, results, and deployments
- Emits realtime updates when records change

### 3. Workers (Go)

- Long-running background processes
- Listen for job records created in PocketBase
- Execute grading, build, and deployment tasks
- Update job status and results back into PocketBase

### 4. Execution Layer (Docker)

- All code execution happens inside isolated containers
- Used for grading, analysis, and building submissions
- Ensures security and reproducibility

## Core Workflow

1. **Define grading spec**
   - User creates a rubric and grading criteria

2. **Upload submission**
   - User uploads a zipped project to PocketBase

3. **Trigger grading**
   - A job record is created
   - A worker picks it up and evaluates the code in a sandbox

4. **Review results**
   - Scores and feedback are written back
   - Frontend updates in realtime

5. **Optional deployment**
   - If a build is available, user can request hosting
   - Worker publishes the static output and returns a URL

## Design Principles

- **State-driven architecture**
  All system activity is represented as records in PocketBase.

- **Asynchronous execution**
  Long-running tasks are handled by workers, not user requests.

- **Separation of concerns**
  - PocketBase = state + storage
  - Workers = execution
  - Frontend = interaction

- **Sandboxed execution**
  All user code runs in isolated containers.

- **Realtime feedback**
  Users see live updates via PocketBase subscriptions.

## Key Tradeoffs

- Using PocketBase as a lightweight backend simplifies the system but requires careful job handling logic.
- Using collections as a queue is flexible but less feature-rich than dedicated queue systems.
- Docker-based execution provides safety but adds operational complexity.

## Summary

This platform is a **PocketBase-centered, worker-driven system** for grading and deploying code submissions.

- The frontend interacts directly with PocketBase
- Workers react to state changes and perform all heavy computation
- Docker ensures safe execution of untrusted code
- The system remains simple by keeping responsibilities clearly separated
