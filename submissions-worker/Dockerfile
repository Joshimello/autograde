FROM oven/bun:1.3.1-alpine

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --production

COPY src ./src

CMD ["bun", "src/index.ts"]
