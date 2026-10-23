# Image Processing Service — PixPro

Microsserviço produtor responsável por receber requisições de upload de imagens, validar arquivos e metadados, simular a persistência em memória (com suporte a PostgreSQL) e disparar o evento assíncrono `ImageUploaded` para o broker RabbitMQ, conforme especificado no [ADR-005](../../docs/adrs/ADR-005-processamento-assincrono-imagens.md).

---

## 🚀 Arquitetura e Papel no Ecossistema

```text
[Cliente / Frontend] 
       │ 
       ▼ POST /api/images/upload (multipart ou JSON)
[Image Processing Service] 
       ├─► 1. Validação de Mime Type e Tamanho (10MB)
       ├─► 2. Simulação de Storage em Memória (Rápido)
       ├─► 3. Gravação no PostgreSQL via Sequelize (Model 'Image' / Tabela 'images')
       └─► 4. Publicação no RabbitMQ (Exchange: 'pixpro.events' | Routing Key: 'image.uploaded')
                  │
                  ▼
          [Fila: image-queue] ──► [AI Worker Pool]
```

---

## 🛠️ Variáveis de Ambiente

| Variável | Padrão Local | Descrição |
| :--- | :--- | :--- |
| `PORT` | `3003` | Porta HTTP do microsserviço |
| `NODE_ENV` | `development` | Ambiente de execução (`development` / `production`) |
| `RABBITMQ_URL` | `amqp://pixpro:dev-rabbit-password@localhost:5672` | URL de conexão com o broker RabbitMQ |
| `RABBITMQ_EXCHANGE` | `pixpro.events` | Exchange do tipo `topic` utilizada para eventos |
| `RABBITMQ_QUEUE` | `image-queue` | Fila durável de processamento |
| `RABBITMQ_ROUTING_KEY` | `image.uploaded` | Chave de roteamento do evento |
| `DATABASE_URL` | `postgres://pixpro:dev-postgres-password@localhost:5432/pixpro` | Conexão com o banco PostgreSQL |
| `MAX_FILE_SIZE_MB` | `10` | Tamanho máximo por arquivo em Megabytes |
| `ALLOWED_MIME_TYPES` | `image/jpeg,image/png,image/webp,image/gif` | Tipos MIME suportados |

---

## 📦 Como Executar

### 1. Instalar Dependências
```bash
npm install
```

### 2. Rodar em Modo Desenvolvimento
```bash
npm run dev
```

### 3. Rodar a Suíte de Testes Automatizados
```bash
npm test
```

---

## 📡 Endpoints da API

### 1. Upload de Imagem
* **Rota:** `POST /api/images/upload` (também acessível via `/api/v1/images/upload`)
* **Headers:** `Content-Type: multipart/form-data` ou `application/json`
* **Campos (Multipart):**
  * `image`: Arquivo binário de imagem (JPEG, PNG, WEBP, GIF).
  * `userId`: *(Opcional)* Identificador do usuário.
* **Exemplo de Chamada (cURL):**
  ```bash
  curl -X POST http://localhost:3003/api/images/upload \
    -F "userId=usr_123456789" \
    -F "image=@foto_perfil.jpg"
  ```
* **Resposta de Sucesso (HTTP 202 Accepted):**
  ```json
  {
    "success": true,
    "message": "Upload aceito com sucesso. Evento de processamento disparado.",
    "data": {
      "imageId": "img_1792624271045_50f91595",
      "userId": "usr_123456789",
      "originalName": "foto_perfil.jpg",
      "mimeType": "image/jpeg",
      "filePath": "/storage/raw/usr_123456789/img_1792624271045_50f91595.jpg",
      "fileSize": 1048576,
      "status": "PENDING",
      "eventId": "48bce22d-fcaf-4513-bed6-0425006f4c41",
      "eventStatus": "PUBLISHED",
      "createdAt": "2026-10-21T22:30:00.000Z"
    }
  }
  ```

### 2. Consulta de Imagem por ID
* **Rota:** `GET /api/images/:id`
* **Exemplo de Chamada:**
  ```bash
  curl http://localhost:3003/api/images/img_1792624271045_50f91595
  ```
* **Resposta:**
  ```json
  {
    "success": true,
    "data": {
      "id": "img_1792624271045_50f91595",
      "userId": "usr_123456789",
      "originalName": "foto_perfil.jpg",
      "mimeType": "image/jpeg",
      "filePath": "/storage/raw/usr_123456789/img_1792624271045_50f91595.jpg",
      "status": "PENDING",
      "createdAt": "2026-10-21T22:30:00.000Z"
    }
  }
  ```

### 3. Diagnóstico e Healthcheck
* **`GET /health`**: Verifica status do microsserviço, conectividade com RabbitMQ e banco de dados.
* **`GET /live`**: Probe de liveness (retorna `{ status: "ALIVE" }`).
* **`GET /ready`**: Probe de readiness (retorna `{ status: "READY" }`).

---

## 📨 Contrato do Evento `ImageUploaded` (RabbitMQ)

Quando uma imagem é recebida, o evento emitido na exchange `pixpro.events` possui rigorosamente a estrutura estipulada pelo **ADR-005**:

```json
{
  "eventId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "eventType": "ImageUploaded",
  "timestamp": "2026-10-21T22:30:00.000Z",
  "data": {
    "imageId": "img_1792624271045_50f91595",
    "userId": "usr_123456789",
    "filePath": "/storage/raw/usr_123456789/img_1792624271045_50f91595.jpg",
    "originalName": "foto_perfil.jpg",
    "mimeType": "image/jpeg"
  }
}
```
