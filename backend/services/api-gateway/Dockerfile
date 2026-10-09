# Imagem base leve e segura com Node.js
FROM node:20-alpine AS base

# Define o diretório de trabalho
WORKDIR /app

# Instala dependências
COPY package*.json ./
RUN npm ci --omit=dev

# Copia código-fonte da aplicação
COPY src/ ./src/

# Define usuário não-root por segurança
USER node

# Expõe a porta padrão do API Gateway
EXPOSE 8000

# Variáveis de ambiente padrão para contêiner
ENV NODE_ENV=production \
    PORT=8000

# Comando padrão de inicialização
CMD ["node", "src/server.js"]
