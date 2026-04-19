# Repository Guidelines

## Project Structure & Module Organization

This repository has two top-level areas:

- `frontend/`: TanStack Start React app built with Vite, TypeScript, Tailwind CSS, and Bun.
- `pocketbase/`: PocketBase container definition in `Dockerfile`.
- `submissions-worker/`: Bun worker that claims grading jobs and launches Docker runner containers.
- `submission-runner/`: Docker image used to extract, build, and grade one submission.
- `policies-worker/`: Bun worker that imports policy documents and creates draft policies.
- `markitdown/`: Docker image for Microsoft MarkItDown document-to-Markdown conversion.

Frontend source lives in `frontend/src`. File-based routes are in `src/routes`, shared UI components are in `src/components`, helpers are in `src/lib`, and global styles/tokens are in `src/styles.css`. Generated router output is `src/routeTree.gen.ts`; avoid hand-editing it.

## Build, Test, and Development Commands

Run frontend commands from `frontend/`:

```bash
bun install
bun --bun run dev
bun --bun run build
bun --bun run test
bun --bun run preview
```

- `bun install`: install dependencies from `bun.lock`.
- `bun --bun run dev`: start Vite on port `3000`.
- `bun --bun run build`: create a production build.
- `bun --bun run test`: run Vitest once.
- `bun --bun run preview`: serve the built app locally.

To build the PocketBase image from the repo root:

```bash
docker build -t autograde-pocketbase ./pocketbase
```

Run the full local stack from the repo root:

```bash
docker compose up --build
```

Run worker checks from `submissions-worker/`:

```bash
bun install
bun run typecheck
bun test
```

Run policy worker checks from `policies-worker/`:

```bash
bun install
bun run typecheck
bun test
```

## Coding Style & Naming Conventions

Use TypeScript and React function components. Keep route files under `src/routes` and export TanStack `Route` definitions with `createFileRoute` or `createRootRoute`. Use configured aliases (`#/components`, `#/lib`, `#/lib/utils`) instead of long relative paths when practical.

The TypeScript config is strict and rejects unused locals and parameters. Match the existing style: two-space indentation, single quotes, no semicolons, PascalCase component files such as `Header.tsx`, and camelCase helper names. Styling is Tailwind-first, with shared design tokens in `src/styles.css`. Shadcn-compatible components should follow `components.json` aliases.

## Testing Guidelines

Vitest is the test runner, with React Testing Library and jsdom available. Place tests near the code they cover using `*.test.ts` or `*.test.tsx`, for example `src/components/Header.test.tsx`. Focus tests on route behavior, user interactions, and helpers. Run `bun --bun run test` before opening a pull request.

## Commit & Pull Request Guidelines

The current history uses Conventional Commits, for example `feat: initial commit`. Continue with concise messages like `feat: add grading dashboard`, `fix: handle empty submissions`, or `test: cover header navigation`.

Pull requests should include a short summary, linked issue when applicable, test results, and screenshots for visible UI changes. Call out configuration, Docker, or generated-file changes explicitly.

## Security & Configuration Tips

Do not commit secrets, local databases, or PocketBase runtime data. If adding PocketBase migrations or hooks, keep them under explicit versioned directories and update the Dockerfile intentionally.
