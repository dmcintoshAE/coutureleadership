FROM node:24-slim AS build
WORKDIR /app
COPY dist/ ./dist/

FROM node:24-slim
WORKDIR /app
COPY --from=build /app/dist ./dist
USER node
CMD ["node", "dist/index.js"]
ENV HOST=0.0.0.0 PORT=3002
EXPOSE 3002
