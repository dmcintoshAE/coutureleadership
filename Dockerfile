FROM node:24-slim AS build
WORKDIR /app
COPY dist/ ./dist/

FROM node:24-slim
WORKDIR /app
COPY --from=build /app/dist ./dist
RUN mkdir -p /data/speaking-inquiries /data/accounts && chown -R node:node /data
USER node
CMD ["node", "dist/index.js"]
ENV HOST=0.0.0.0 PORT=3002
ENV ACCOUNTS_DIR=/data/accounts
EXPOSE 3002
