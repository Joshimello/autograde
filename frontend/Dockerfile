FROM oven/bun:1.3.1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM deps AS development
ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000
CMD ["bun", "--bun", "run", "dev", "--host", "0.0.0.0"]

FROM deps AS build
ARG VITE_POCKETBASE_URL=http://127.0.0.1:8090
ARG VITE_ALLOWED_HOSTS=
ENV VITE_POCKETBASE_URL=$VITE_POCKETBASE_URL
ENV VITE_ALLOWED_HOSTS=$VITE_ALLOWED_HOSTS
COPY . .
RUN bun --bun run build

FROM deps AS production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production
ENV VITE_ALLOWED_HOSTS=
COPY --from=build /app /app
EXPOSE 3000
CMD ["bun", "--bun", "vite", "preview", "--host", "0.0.0.0", "--port", "3000"]
