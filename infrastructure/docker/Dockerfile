ARG NODE_IMAGE=node:26.13.0-bookworm-slim
FROM ${NODE_IMAGE} AS dependencies
WORKDIR /workspace/apps/portal
COPY apps/portal/package.json apps/portal/package-lock.json ./
RUN npm ci --ignore-scripts

FROM dependencies AS build
ARG APP_ORIGIN=http://localhost:5180
ENV ORIGIN=${APP_ORIGIN}
COPY apps/portal/ ./
RUN npm run check && npm run build

FROM ${NODE_IMAGE} AS production-dependencies
WORKDIR /workspace/apps/portal
COPY apps/portal/package.json apps/portal/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 DEMO_MODE=false
WORKDIR /workspace/apps/portal
COPY --chown=node:node --from=production-dependencies /workspace/apps/portal/node_modules ./node_modules
COPY --chown=node:node --from=build /workspace/apps/portal/.output ./.output
COPY --chown=node:node apps/portal/package.json ./package.json
COPY --chown=node:node database /workspace/database
COPY --chown=node:node apps/portal/tooling/database ./tooling/database
COPY --chown=node:node apps/portal/src/lib/server/security/credentials.mjs ./src/lib/server/security/credentials.mjs
COPY --chown=node:node apps/portal/src/lib/modules/auth/preview-accounts.ts ./src/lib/modules/auth/preview-accounts.ts
COPY --chown=node:node infrastructure/docker/healthcheck.mjs ./tooling/healthcheck.mjs
USER node
EXPOSE 3000
HEALTHCHECK --interval=20s --timeout=5s --start-period=15s --retries=3 CMD ["node", "tooling/healthcheck.mjs"]
CMD ["node", ".output/index.js"]
