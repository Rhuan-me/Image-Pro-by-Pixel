FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY src ./src
RUN mkdir -p /storage/raw && chown -R node:node /storage
USER node
EXPOSE 3003
CMD ["node", "src/server.js"]
