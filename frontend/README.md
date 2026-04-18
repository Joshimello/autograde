# Autograde Frontend

React frontend for the Autograde workspace. It uses TanStack Start, TanStack
Router, Vite, TypeScript, Tailwind CSS, shadcn components, and Bun.

## Getting Started

```bash
bun install
bun --bun run dev
```

The development server runs on port `3000`.

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
