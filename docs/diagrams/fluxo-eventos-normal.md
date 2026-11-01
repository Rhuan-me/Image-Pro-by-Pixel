# Diagrama 1.1: Fluxo Normal de Eventos e Requisições no Ecossistema

## 1. Objetivo

Este diagrama modela o **caminho feliz (Happy Path)** da arquitetura orientada a eventos do **PixPro**. Ele descreve como uma imagem enviada pelo usuário é recepcionada, validada, persistida em metadados, processada assincronamente por modelos de inteligência artificial através do barramento **RabbitMQ**, e finalmente notificada ao cliente em tempo real via **WebSockets**.

---

## 2. Diagrama Visual em Alta Resolução

![Fluxo Normal de Eventos e Requisições](fluxo-eventos-normal.png)

> **Nota:** Arquivo vetorial de alta definição disponível em [`fluxo-eventos-normal.svg`](fluxo-eventos-normal.svg) e código fonte em [`fluxo-eventos-normal.puml`](fluxo-eventos-normal.puml).

---

## 3. Diagrama em Sintaxe Mermaid (Renderização Nativa)

```mermaid
sequenceDiagram
    autonumber
    actor Client as Usuário / Web SPA (React)
    participant Gateway as API Gateway (Node.js)
    participant ImgService as Image Processing Service
    participant Storage as Storage / CDN (S3/MinIO)
    participant DB as PostgreSQL (Sequelize)
    participant Bus as RabbitMQ (Exchange: pixpro.events)
    participant Queue as Fila (image-queue)
    participant Worker as AI Worker Pool (Python)
    participant Notif as Notification Service (WebSocket)

    Note over Client,Gateway: 1. Upload e Iniciação
    Client->>Gateway: POST /api/images/upload (Multipart)
    Gateway->>Gateway: Valida JWT & Rate-Limiting
    Gateway->>ImgService: Proxy HTTP: POST /api/images/upload
    ImgService->>ImgService: Valida Mime Type e Tamanho (10MB)
    ImgService->>Storage: Salva binário bruto (/storage/raw/...)
    ImgService->>DB: Image.create() [Status: PENDING]
    
    Note over ImgService,Queue: 2. Publicação no Event Bus
    ImgService->>Bus: Publica evento [ImageUploaded] (Routing Key: image.uploaded)
    Bus->>Queue: Enfileira mensagem persistente
    ImgService-->>Gateway: HTTP 202 Accepted
    Gateway-->>Client: HTTP 202 Accepted (Status: PENDING)

    Note over Queue,Worker: 3. Processamento Assíncrono (IA)
    Queue->>Worker: Entrega evento [ImageUploaded]
    Worker->>Storage: Baixa imagem bruta
    Worker->>Worker: Executa Inferência (Transfer Learning / MobileNet)
    Worker->>Storage: Salva imagem processada (/storage/processed/...)
    Worker->>DB: Image.update() [Status: PROCESSED, Métricas]
    
    Note over Worker,Client: 4. Notificação em Tempo Real
    Worker->>Bus: Publica evento [ImageProcessed]
    Worker->>Queue: basic.ack (Remove da fila)
    Bus->>Notif: Roteia evento para Notification Service
    Notif-->>Client: WebSocket Push (Status: PROCESSED, URL da Imagem)
```

---

## 4. Detalhamento Técnico das Etapas

1. **Recepção e Segurança (API Gateway):**
   * O cliente envia a requisição autenticada via token JWT no cabeçalho `Authorization`.
   * O API Gateway valida a assinatura do JWT, aplica rate-limiting com Redis e encaminha a requisição via proxy para o `image-processing-service` preservando o `X-Correlation-ID`.

2. **Ingestão e Desacoplamento (Image Processing Service):**
   * O serviço valida se o arquivo possui um tipo MIME permitido (`image/jpeg`, `image/png`, `image/webp`) e tamanho inferior a 10MB.
   * O binário é gravado no storage e os metadados são registrados no PostgreSQL via Sequelize com status `PENDING`.
   * O serviço publica o evento `ImageUploaded` na exchange `pixpro.events` com routing key `image.uploaded`.
   * O cliente recebe imediatamente a resposta **HTTP 202 Accepted**, garantindo tempo de resposta na casa de milissegundos.

3. **Inferência Computacional (AI Workers):**
   * Os workers de IA consomem tarefas concorrentemente da fila durável `image-queue`.
   * O modelo de IA executa a inferência em background sem concorrer com os servidores web.
   * O resultado gerado é salvo na pasta de ativos processados e os metadados são atualizados no banco de dados para `PROCESSED`.

4. **Notificação Push em Tempo Real (WebSocket Service):**
   * O worker publica o evento `ImageProcessed` no barramento.
   * O serviço de WebSocket distribui o evento instantaneamente para o cliente correto, atualizando a interface gráfica do usuário sem necessidade de recarregar a página (*Zero HTTP Polling*).
