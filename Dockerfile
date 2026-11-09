FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=4000 DATABASE_PATH=/app/data/projects.sqlite UPLOAD_DIR=/app/data/uploads
COPY --from=build /app /app
RUN mkdir -p /app/data && chown -R node:node /app
USER node
EXPOSE 4000
CMD ["node","server/index.mjs"]
