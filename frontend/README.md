# Autograde Frontend

React frontend for the Autograde workspace. It uses TanStack Start, TanStack
Router, Vite, TypeScript, Tailwind CSS, shadcn components, and Bun.

## Getting Started

```bash
bun install
bun --bun run dev
```

The development server runs on port `3000`.

## PocketBase

Start PocketBase from the repo root before using the app:

```bash
docker compose up --build pocketbase
```

The frontend reads `VITE_POCKETBASE_URL`, defaulting to
`http://127.0.0.1:8090`. Copy `.env.example` to `.env.local` if you need to
override it.

Regenerate PocketBase types with:

```bash
PB_TYPEGEN_EMAIL=admin@example.com PB_TYPEGEN_PASSWORD=change-me-please bun run typegen
```

## Production Build

```bash
bun --bun run build
bun --bun run preview
```

## Testing

```bash
bun --bun run test
```

Vitest is configured for frontend tests. Place tests next to the code they cover
using `*.test.ts` or `*.test.tsx`.

## Project Layout

- `src/routes`: file-based routes.
- `src/components`: shared React components.
- `src/components/ui`: shadcn-generated UI primitives.
- `src/lib`: reusable utilities.
- `src/styles.css`: Tailwind imports, theme tokens, and global styles.

## UI Components

Add more shadcn components with:

```bash
bunx --bun shadcn@latest add <component>
```
