# Diagrama 1.1: Fluxo de Eventos e Arquitetura CQRS (Write Model vs. Read Model)

## 1. Objetivo

Este diagrama modela o **fluxo ponta a ponta da arquitetura orientada a eventos (EDA) combinada com CQRS (Command Query Responsibility Segregation)** do **PixPro**. Ele evidencia:
1. **Command Path (Write Model):** Como comandos de mutação (`UploadImageCommand`) são validados, persistidos no **Write Store** (PostgreSQL transacional + tabela Outbox) e transformados em eventos de domínio publicados no **RabbitMQ**.
2. **Processamento e Sincronização Assíncrona:** Como o barramento distribui eventos simultaneamente para o **AI Worker Pool** (inferência computacional) e para o **Read Model Projector** (atualização assíncrona das projeções desnormalizadas e cache Redis).
3. **Query Path (Read Model) e Notificações WebSocket:** Como o cliente recebe o push em tempo real e realiza consultas de alta performance (`GetUserImageHistoryQuery`) diretamente no **Read Store / Redis**, sem onerar o banco de escrita.

---

## 2. Diagrama Visual em Alta Resolução

![Fluxo de Eventos e Arquitetura CQRS](fluxo-eventos-normal.png)

> **Nota:** Arquivo vetorial de alta definição disponível em [`fluxo-eventos-normal.svg`](fluxo-eventos-normal.svg) e código fonte PlantUML em [`fluxo-eventos-normal.puml`](fluxo-eventos-normal.puml).

---

## 3. Diagrama em Sintaxe Mermaid (Renderização Nativa)

```mermaid
sequenceDiagram
    autonumber
    actor Client as Usuário / Web SPA (React)
    participant Gateway as API Gateway (Node.js)
    box rgb(232, 248, 245) CQRS Write Model (Command Side)
        participant CmdService as Command API (Image Processing)
        participant WriteDB as PostgreSQL (Write Store + Outbox)
    end
    participant Storage as Storage / CDN (MinIO/S3/Nginx)
    box rgb(253, 237, 236) Message Broker (RabbitMQ)
        participant Bus as Exchange (pixpro.events)
        participant Queue as Fila IA (image-queue)
        participant SyncQueue as Fila CQRS (read-model-sync-queue)
    end
    participant Worker as AI Worker Pool (Sharp / IA)
    participant Notif as Notification Service (WebSocket)
    box rgb(235, 245, 251) CQRS Read Model (Query Side)
        participant Projector as Read Model Projector
        participant ReadDB as PostgreSQL (Read Store) + Redis
        participant QueryAPI as Query API (Histórico / Galeria)
    end

    Note over Client,WriteDB: 1. Command Path (Write Model): Mutação e Persistência Transacional
    Client->>Gateway: Command: POST /api/images/upload (Multipart + JWT)
    Gateway->>Gateway: Valida JWT & Rate-Limiting
    Gateway->>CmdService: Encaminha UploadImageCommand
    CmdService->>CmdService: Valida Mime Type e Tamanho (10MB)
    CmdService->>Storage: Salva binário bruto (/storage/raw/...)
    CmdService->>WriteDB: Transação ACID: INSERT images (PENDING) + INSERT outbox_messages

    Note over CmdService,ReadDB: 2. Publicação no Broker & Projeção Inicial no Read Model
    CmdService->>Bus: Publica Domain Event [ImageUploaded] (rk: image.uploaded)
    Bus->>Queue: Enfileira tarefa para Workers IA
    Bus->>SyncQueue: Enfileira cópia para sincronização CQRS
    CmdService-->>Gateway: HTTP 202 Accepted
    Gateway-->>Client: HTTP 202 Accepted (Status: PENDING)
    SyncQueue->>Projector: Consome evento [ImageUploaded]
    Projector->>ReadDB: UPSERT image_history_view (status: PENDING) + Invalida Cache Redis

    Note over Queue,ReadDB: 3. Inferência Assíncrona (Worker) & Atualização Eventual do Read Model
    Queue->>Worker: Entrega evento [ImageUploaded]
    Worker->>Storage: Baixa imagem bruta
    Worker->>Worker: Executa Pipeline de IA (Sharp / Transfer Learning)
    Worker->>Storage: Publica imagem processada na CDN (/storage/processed/...)
    Worker->>WriteDB: UPDATE estado transacional (PROCESSED, CdnUrl, Métricas)
    Worker->>Bus: Publica Domain Event [ImageProcessed] (rk: image.processed)
    Worker->>Queue: basic.ack (Remove tarefa da fila)
    Bus->>SyncQueue: Roteia evento para fila de projeção CQRS
    Bus->>Notif: Roteia evento para Notification Service
    SyncQueue->>Projector: Consome evento [ImageProcessed]
    Projector->>ReadDB: UPSERT image_history_view (status: PROCESSED, cdnUrl, tags) + Atualiza Redis

    Note over Notif,QueryAPI: 4. Notificação Push (WebSocket) & Query Path (Read Model)
    Notif-->>Client: WebSocket Push (IMAGE_READY, cdnUrl)
    Client->>Gateway: Query: GET /api/images/history?page=1&status=PROCESSED
    Gateway->>QueryAPI: Roteia consulta para Query Side
    QueryAPI->>ReadDB: Consulta projeção desnormalizada / Redis Cache (< 5ms)
    ReadDB-->>QueryAPI: Retorna lista paginada otimizada
    QueryAPI-->>Gateway: HTTP 200 OK
    Gateway-->>Client: HTTP 200 OK (Exibe galeria e histórico atualizado)
```

---

## 4. Detalhamento Técnico das Etapas (CQRS + EDA)

1. **Command Path — Recepção e Escrita Transacional (Write Model):**
   * O cliente envia o comando `POST /api/images/upload` autenticado via JWT.
   * O **Command API** (`image-processing-service`) valida o arquivo (`image/jpeg`, `image/png`, `image/webp` até 10MB), persiste o binário no Storage/CDN e realiza uma transação ACID no **Write Store** gravando o estado normalizado (`PENDING`) junto ao registro na tabela `outbox_messages`.
   * O evento de domínio `ImageUploaded` é publicado na exchange `pixpro.events` (`topic`) e o cliente recebe `HTTP 202 Accepted` imediatamente.

2. **Roteamento Fan-out e Projeção Inicial (Broker ➔ Read Model):**
   * A exchange `pixpro.events` distribui o evento `ImageUploaded` para duas filas distintas: `image-queue` (processamento de IA) e `read-model-sync-queue` (sincronização CQRS).
   * O **Read Model Projector** consome da `read-model-sync-queue` e cria o registro inicial na visão desnormalizada `image_history_view` do **Read Store**, garantindo que consultas imediatas ao histórico já reflitam o item como `PENDING`.

3. **Inferência Computacional e Sincronização de Conclusão:**
   * O **AI Worker Pool** consome da `image-queue`, aplica as transformações e modelos de IA, faz o upload do ativo final para o Storage/CDN e emite o evento de domínio `ImageProcessed` (ou `ProcessingError` em caso de falha).
   * O **Read Model Projector** consome `ImageProcessed` de forma assíncrona e executa um `UPSERT` idempotente na tabela de leitura desnormalizada (`image_history_view`), preenchendo a URL da CDN, tags e tempo de inferência, além de atualizar o cache no **Redis**.

4. **Notificação em Tempo Real e Query Path (Read Model):**
   * Paralelamente à atualização do Read Model, o **Notification Service** envia um push via WebSocket (`IMAGE_READY`) ao navegador do usuário.
   * Quando o usuário acessa ou filtra seu histórico (`GET /api/images/history`), a **Query API** consulta exclusivamente o **Redis / PostgreSQL Read Store**, obtendo respostas em menos de 5ms sem realizar `JOINs` complexos e sem disputar locks com as transações de escrita do **Write Store**.
