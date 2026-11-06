FROM node:20-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY src ./src
RUN mkdir -p /storage/raw /storage/processed && chown -R node:node /storage
USER node
CMD ["node", "src/worker.js"]