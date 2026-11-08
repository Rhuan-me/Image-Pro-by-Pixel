# PixPro — Documento de Design de Arquitetura Baseada em Eventos (EDA) e CQRS

**Projeto Final PixPro — Capstone DS5**  
**Equipe:** Grupo 3  
**Status do Documento:** Aprovado / Versão 2.0 (EDA + CQRS)  
**Data:** Novembro de 2026  
**Referência das Issues:**
* **Issue 5.2** — *Arquitetura de Eventos, Diagramas e Documento de Design (Foco: Visualização)*
* **Issue 6.2** — *Design da Arquitetura CQRS e Diagramação de Fluxos*

---

## 1. Introdução e Contexto do Problema

O **PixPro** é uma plataforma inteligente e distribuída para processamento de imagens, focada na aplicação de modelos avançados de Inteligência Artificial (Transfer Learning, melhoria estética, otimização com Sharp e detecção de objetos). 

Nas abordagens arquiteturais tradicionais síncronas e monolíticas em dados (CRUD único onde o cliente mantém uma conexão HTTP aberta aguardando o término da inferência e onde leituras de histórico disputam locks com gravações intensivas), o sistema sofre com:
* **Gargalos severos de latência e concorrência:** Conexões HTTP presas por dezenas de segundos reduzem a disponibilidade do API Gateway.
* **Contenção de Banco de Dados (Leitura vs. Escrita):** Consultas frequentes de galerias, filtros e históricos paginados (`JOINs` pesados) concorrem diretamente com transações de escrita de novos uploads e atualizações de estado dos workers de IA.
* **Risco crítico de *Timeouts* e Acoplamento Rígido:** A indisponibilidade momentânea do serviço de inferência derruba o endpoint de upload.

Para resolver essas vulnerabilidades, adotou-se uma **Arquitetura Orientada a Eventos (EDA)** combinada com **CQRS (Command Query Responsibility Segregation)**, fundamentada em mensageria assíncrona com **RabbitMQ**, separação estrita entre **Write Model** e **Read Model**, armazenamento desacoplado com **CDN** e notificações em tempo real via **WebSockets**.

---

## 2. Topologia do Barramento de Mensageria (RabbitMQ)

A topologia do broker foi projetada para garantir desacoplamento total entre produtores (Command Side / Workers) e consumidores (AI Workers, Read Model Projector e Notification Service):

| Elemento | Nome / Identificador | Tipo | Propriedades | Papel na Arquitetura EDA + CQRS |
| :--- | :--- | :---: | :---: | :--- |
| **Exchange Principal** | `pixpro.events` | `topic` | `durable: true` | Ponto central de entrada do Event Bus para publicação de eventos de domínio. |
| **Fila de Inferência** | `image-queue` | `classic` | `durable: true` | Fila onde os eventos `ImageUploaded` aguardam consumo pelos workers de IA. |
| **Fila de Projeção CQRS** | `read-model-sync-queue` | `classic` | `durable: true` | Fila dedicada ao **Read Model Projector** para atualizar assincronamente as projeções de leitura e cache Redis (`image.*`, `project.*`). |
| **Fila de Retry** | `image.retry.delay` | `classic` | `durable: true`, TTL | Fila com retenção temporária para execução de retries com backoff exponencial. |
| **Dead Letter Exchange**| `pixpro.dlx` | `direct`| `durable: true` | Roteador exclusivo para mensagens rejeitadas definitivamente. |
| **Dead Letter Queue** | `image.processing.dlq`| `classic` | `durable: true` | Fila morta para isolamento de mensagens com falha e auditoria operacional. |

---

## 3. Arquitetura CQRS (Command Query Responsibility Segregation)

### 3.1 Identificação dos Microsserviços com Separação de Leitura e Escrita

A análise de domínio definiu quais microsserviços exigem segregação CQRS e quais operam em modelo transacional direto:

| Microsserviço | Modelo Adotado | Justificativa de Design |
| :--- | :---: | :--- |
| **Image Processing Service** | **CQRS + EDA** | **Alta assimetria de carga:** O *Write Model* valida uploads, persiste binários no Storage/CDN e registra estados transacionais com Outbox. O *Read Model* atende consultas rápidas de status e histórico paginado sem bloquear a ingestão de novas imagens. |
| **Project & Asset Service** | **CQRS + EDA** | **Leituras intensivas e agregadas:** Enquanto comandos alteram metadados pontuais de projetos e ativos, as consultas (`CU06`, `CU07`, `CU08`) exigem projeções desnormalizadas indexadas por `userId`, `status`, tags de IA e URLs da CDN, cacheadas no Redis. |
| **Auth Service** | **CRUD Transacional** | **Consistência imediata:** Autenticação, cadastro e emissão de JWT operam sobre registros pontuais de usuários onde a complexidade de projeção assíncrona não traz benefício. |
| **Notification Service** | **Stateless Consumer** | Consome eventos do RabbitMQ e realiza *push* via WebSocket para o cliente sem armazenar estado de domínio próprio. |

### 3.2 Segregação entre Write Model (Command Side) e Read Model (Query Side)

1. **Write Model (Modelo de Comandos):**
   * **Responsabilidade:** Receber intenções de mudança de estado (`UploadImageCommand`, `SubmitProcessingJobCommand`, `ReprocessImageCommand`, `CreateProjectCommand`), validar invariantes de negócio e persistir dados normalizados com consistência forte (ACID) no **PostgreSQL Write Store**.
   * **Publicação Confiável (Transactional Outbox):** Cada mutação grava atomicamente o estado da entidade e o respectivo evento de domínio na tabela `outbox_messages`, garantindo que nenhuma alteração deixe de ser publicada no RabbitMQ.

2. **Read Model (Modelo de Consultas):**
   * **Responsabilidade:** Atender consultas (`GetUserImageHistoryQuery`, `GetImageStatusQuery`, `GetProjectGalleryQuery`) com latência mínima (< 5ms).
   * **Armazenamento Otimizado (Read Store + Redis):** Utiliza projeções desnormalizadas no **PostgreSQL Read Store** (`image_history_view`, `project_gallery_view`) pré-computadas sem necessidade de `JOINs` complexos, combinadas com cache em memória no **Redis** (`cache:user:{userId}:history`).
   * **Sincronização Assíncrona (Read Model Projector):** Um consumidor dedicado escuta a fila `read-model-sync-queue` no RabbitMQ e aplica operações idempotentes de `UPSERT` nas projeções de leitura sempre que um evento de domínio é emitido pelo Write Side ou pelos Workers de IA.

---

## 4. Especificação Formal dos Contratos de Eventos de Domínio (Domain Events)

Padronizados em formato JSON estruturado com cabeçalhos de auditoria, versionamento e rastreabilidade:

### 4.1 Evento `ImageUploaded` (Disparado pelo Command Side após Persistência)
Publicado pelo `image-processing-service` (Write Model) logo após validar o arquivo físico, salvar no Storage/CDN e persistir os metadados no Write Store com status `PENDING`:
```json
{
  "eventId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "eventType": "ImageUploaded",
  "schemaVersion": "1.0",
  "timestamp": "2026-11-01T15:00:00.000Z",
  "data": {
    "imageId": "img_1792624271045_50f91595",
    "userId": "usr_123456789",
    "filePath": "/storage/raw/usr_123456789/img_1792624271045_50f91595.jpg",
    "originalName": "foto_perfil.jpg",
    "mimeType": "image/jpeg",
    "status": "PENDING"
  }
}
```
* **Efeito no Read Model:** O `Read Model Projector` consome o evento via `read-model-sync-queue`, insere o registro inicial na visão `image_history_view` com `status = PENDING` e invalida o cache de listagem do usuário no Redis.

### 4.2 Evento `ImageProcessed` (Disparado pelo Worker em Sucesso)
Publicado pelo worker de IA após o término da inferência e disponibilização do ativo processado na CDN:
```json
{
  "eventId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "eventType": "ImageProcessed",
  "schemaVersion": "1.0",
  "timestamp": "2026-11-01T15:00:06.432Z",
  "data": {
    "imageId": "img_1792624271045_50f91595",
    "userId": "usr_123456789",
    "processedFilePath": "/storage/processed/usr_123456789/img_1792624271045_50f91595_out.jpg",
    "cdnUrl": "http://localhost:8080/cdn/processed/usr_123456789/img_1792624271045_50f91595_out.jpg",
    "status": "PROCESSED",
    "aiMetadata": {
      "modelUsed": "Sharp-AI-Pipeline-v1",
      "confidence": 0.965,
      "processingTimeMs": 1420,
      "tags": ["portrait", "outdoor", "enhanced"]
    }
  }
}
```
* **Efeito no Read Model:** O `Read Model Projector` atualiza assincronamente a linha correspondente em `image_history_view` com a `cdnUrl`, métricas de IA, tags indexadas e `status = PROCESSED`, atualizando também o cache no Redis.

### 4.3 Evento `ProcessingError` (Disparado pelo Worker em Falha Irreversível)
Publicado quando todas as tentativas de reprocessamento forem esgotadas antes de despachar a mensagem para a DLQ:
```json
{
  "eventId": "98765432-10ab-cdef-1234-567890abcdef",
  "eventType": "ProcessingError",
  "schemaVersion": "1.0",
  "timestamp": "2026-11-01T15:00:15.111Z",
  "data": {
    "imageId": "img_1792624271045_50f91595",
    "userId": "usr_123456789",
    "status": "FAILED",
    "errorCode": "AI_INFERENCE_TIMEOUT",
    "errorMessage": "O tempo limite de execução do modelo de IA foi excedido após 3 tentativas.",
    "retryCount": 3
  }
}
```
* **Efeito no Read Model:** O `Read Model Projector` atualiza a projeção de leitura para `status = FAILED` com o motivo da falha para exibição imediata no histórico do usuário.

---

## 5. Diagrama 1.1: Fluxo de Eventos e Arquitetura CQRS (Write Model vs. Read Model)

### 5.1 Representação Visual Integrada

![Diagrama 1.1: Fluxo Normal de Eventos e Arquitetura CQRS](fluxo-eventos-normal.png)

> **Consulte também:** Diagrama de Contêineres C4 atualizado com a segregação CQRS em [`c4-n2-containers.md`](c4-n2-containers.md).

### 5.2 Análise do Fluxo CQRS e EDA
1. **Command Path — Recepção e Escrita Transacional (Write Model):** O cliente envia o comando `POST /api/images/upload` (`multipart/form-data`). O API Gateway autentica o JWT, aplica *Rate Limiting* e roteia a mutação para o **Command API** (`image-processing-service`), que salva o binário no Storage/CDN e grava em transação ACID local no **Write Store** tanto o registro normalizado (`PENDING`) quanto o evento na tabela `outbox_messages`.
2. **Publicação no Event Bus e Projeção Inicial:** O evento `ImageUploaded` é publicado na exchange `pixpro.events` e roteado em *fan-out* para `image-queue` (Workers) e `read-model-sync-queue` (CQRS). A API responde de imediato `HTTP 202 Accepted` ao cliente, enquanto o **Read Model Projector** insere assincronamente a projeção inicial no **Read Store**.
3. **Execução de IA e Sincronização Eventual do Read Model:** Um nó do pool de workers consome a tarefa da `image-queue`, processa a imagem, publica o ativo final na CDN, atualiza o Write Store e emite o evento `ImageProcessed`. O **Read Model Projector** consome `ImageProcessed` da `read-model-sync-queue` e atualiza a visão desnormalizada (`image_history_view`) e o cache no **Redis**.
4. **Notificação Push (WebSocket) e Query Path (Read Model):** O `Notification Service` envia um push via WebSocket (`IMAGE_READY`) ao usuário. Quando o cliente solicita a listagem ou histórico (`GET /api/images/history`), o API Gateway direciona a requisição para a **Query API**, que lê diretamente do **Redis / PostgreSQL Read Store** em milissegundos, sem impactar o banco de escrita.

---

## 6. Diagrama 1.2: Ciclo Completo de Tratamento de Erros, Resiliência e DLQ

### 6.1 Representação Visual Integrada

![Diagrama 1.2: Ciclo Completo de Tratamento de Erros, Resiliência e DLQ](ciclo-tratamento-erros-dlq.png)

### 6.2 Análise dos Mecanismos de Resiliência
1. **Detecção da Falha e Isolamento:** Falhas transitórias (como lentidão de storage ou indisponibilidade momentânea de nós de processamento) são capturadas pelo bloco de tratamento do worker.
2. **Backoff Exponencial:** Para não sobrecarregar o sistema com retries imediatos repetitivos, a mensagem é direcionada para uma fila de espera temporizada cujo delay cresce exponencialmente:
   $$\text{Delay}(n) = \text{base} \times 2^{n} \quad (n = \text{tentativa})$$
3. **Prevenção de Head-of-Line Blocking via DLQ:** Caso uma mensagem contenha dados corrompidos (*poison pill*), re-enfileirá-la infinitamente travaria a capacidade de processamento de novos arquivos dos usuários. Atingido o limite de 3 tentativas, o worker emite `basic.nack(requeue = false)`. O RabbitMQ encaminha a mensagem para a **Dead Letter Exchange (`pixpro.dlx`)** e a armazena na **Dead Letter Queue (`image.processing.dlq`)**.
4. **Feedback de Falha e Sincronização CQRS:** O evento `ProcessingError` é emitido, atualizando o Write Store e sincronizando assincronamente o Read Model para `FAILED`, além de enviar um alerta via WebSocket para o usuário.
5. **Reconciliação Administrativa:** A equipe de suporte inspeciona o RabbitMQ Dashboard (`http://localhost:15672`), analisa os cabeçalhos `x-death` e, após a resolução técnica do problema, aciona o recurso de **Shovel / Replay**, movendo as mensagens da DLQ de volta para a fila `image-queue` para reprocessamento com taxa zero de perda de dados.

---

## 7. Mecanismos de Consistência, Idempotência e Observabilidade

1. **Transactional Outbox Pattern:**
   * *Problema mitigado:* Eliminar o risco de inconsistência (*Dual-Write*) entre o Write Store e o RabbitMQ.
   * *Solução:* Salvar o evento na tabela `outbox_messages` dentro da mesma transação ACID do Sequelize e utilizar um relayer para publicar no broker.
2. **Idempotência no Read Model Projector e Workers (Redis / Upsert):**
   * *Problema mitigado:* Reentrega de mensagens pelo RabbitMQ (*At-Least-Once Delivery*) gerando duplicidade na projeção de leitura ou reprocessamento de IA.
   * *Solução:* Controle atômico via `SETNX image:job:<imageId> 1 EX 86400` nos workers e `UPSERT` baseado em `imageId` e `timestamp`/`version` no Read Model Projector.
3. **Métricas de Observabilidade (Prometheus + Grafana):**
   * Monitoramento do *Replication Lag* (atraso de consistência eventual entre o Write Model e o Read Model), profundidade da fila `read-model-sync-queue` e taxa de *Cache Hit* no Redis.

---

## 8. Conclusão

A arquitetura orientada a eventos (EDA) integrada ao padrão **CQRS** implementada e documentada nesta entrega atende integralmente aos requisitos de escalabilidade independente de leitura e escrita, alta disponibilidade e desacoplamento do projeto **PixPro**.
