# PixPro — API Gateway

Camada de entrada e ponto de contato externo único do **PixPro** para o frontend SPA. O API Gateway é responsável por roteamento transparente, proxy reverso, padronização de erros e preocupações transversais (cross-cutting concerns) sem conter regras de negócio dos domínios.

---

## 📌 Funcionalidades Principais

- **Proxy Reverso Transparente:** Redirecionamento de tráfego síncrono para os microsserviços downstream (`Auth Service`, `Project Service`, etc.).
- **Preservação de Contrato:** Encaminha requisições e respostas intactas (verbos HTTP, headers, payloads e status codes).
- **Tratamento Padronizado de Erros:** Erros de indisponibilidade de serviços (`503 Service Unavailable`, `504 Gateway Timeout`) retornam formato JSON uniforme.
- **Middlewares Transversais:**
  - Headers de segurança HTTP via `helmet`.
  - Controle de `CORS` configurável.
  - Logging estruturado de tráfego via `morgan`.
  - Injeção e propagação de `X-Correlation-Id` para rastreamento distribuído.
- **Health Check & Observabilidade:** Endpoints `/health` e `/live`.

---

## ⚙️ Variáveis de Ambiente

Configure o arquivo `.env` com base no `.env.example`:

| Variável | Padrão | Descrição |
| :--- | :--- | :--- |
| `PORT` | `8000` | Porta onde o API Gateway escutará. |
| `NODE_ENV` | `development` | Ambiente (`development`, `test`, `production`). |
| `CORS_ORIGIN` | `*` | Origens permitidas para requisições CORS. |
| `LOG_FORMAT` | `dev` | Formato dos logs HTTP (`dev`, `combined`, etc.). |
| `PROXY_TIMEOUT` | `30000` | Timeout máximo em ms para respostas de downstream. |
| `AUTH_SERVICE_URL` | `http://localhost:3001` | URL base do Microsserviço de Autenticação. |
| `PROJECT_SERVICE_URL` | `http://localhost:3002` | URL base do Microsserviço de Projetos. |
| `IMAGE_PROCESSING_SERVICE_URL` | `http://localhost:3003` | URL base do Microsserviço de Processamento de Imagens. |

---

## 🚀 Como Executar Localmente

### 1. Instalar Dependências
```bash
cd backend/services/api-gateway
npm install
```

### 2. Executar em Modo de Desenvolvimento
```bash
npm run dev
```

### 3. Executar Testes Automatizados
```bash
npm test
```

---

## 🐳 Execução via Docker

### Construir a imagem:
```bash
docker build -t pixpro-api-gateway .
```

### Executar o contêiner:
```bash
docker run -d -p 8000:8000 \
  -e AUTH_SERVICE_URL=http://host.docker.internal:3001 \
  --name pixpro-gateway \
  pixpro-api-gateway
```

Ou usando o `docker-compose.yml` na raiz do repositório:
```bash
docker compose up -d api-gateway
```

---

## 📡 Rotas Mapeadas

| Método | Caminho do Gateway | Destino | Descrição |
| :---: | :--- | :--- | :--- |
| `GET` | `/health` | API Gateway Local | Status e saúde do Gateway. |
| `GET` | `/live` | API Gateway Local | Liveness probe simples. |
| `ALL` | `/api/v1/auth/*` | `AUTH_SERVICE_URL/*` | Encaminhamento para Auth Service. |
| `ALL` | `/auth/*` | `AUTH_SERVICE_URL/*` | Alias para rotas de autenticação. |

---

## 🛡️ Formato de Resposta de Erro Padronizado

Quando um microsserviço downstream está inacessível ou falha:

```json
{
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "O serviço 'Auth Service' está temporariamente indisponível. Por favor, tente novamente mais tarde.",
    "status": 503,
    "timestamp": "2026-10-09T19:40:00.000Z",
    "path": "/api/v1/auth/login",
    "correlationId": "f78d91b4-4b5c-482a-a5fb-71d37b67b1b3"
  }
}
```
