# VIVENTIUM START
# Purpose: Viventium-owned addition copied into LibreChat fork.
# Details: docs/requirements_and_learnings/05_Open_Source_Modifications.md#librechat-viventium-additions
# VIVENTIUM END
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run generate
RUN npm run build

FROM node:20-alpine AS release

WORKDIR /app

COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package*.json ./

ENV NODE_ENV=production
RUN npm ci --ignore-scripts --omit=dev

# Use shell form entrypoint so that CMD arguments are properly word-split
# This allows Azure Container Apps --args to be passed as a string and parsed correctly
# Example: --args "--http :6274 --org-mode -v" becomes separate arguments
ENTRYPOINT ["/bin/sh", "-c", "exec node dist/index.js $@", "--"]
