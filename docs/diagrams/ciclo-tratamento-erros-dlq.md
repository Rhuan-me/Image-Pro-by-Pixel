# Diagrama 1.2: Ciclo Completo de Tratamento de Erros, Resiliência e DLQ

## 1. Objetivo

Este diagrama modela o ciclo completo de **tolerância a falhas, retentativas com backoff exponencial, isolamento em Dead Letter Queue (DLQ) e reconciliação operacional** do **PixPro**. Ele descreve como a plataforma detecta falhas (transitórias ou permanentes), isola mensagens corrompidas para evitar travamento da fila principal (*head-of-line blocking*), notifica o usuário via WebSocket e permite a recuperação administrativa sem perda de dados.

---

## 2. Diagrama Visual em Alta Resolução

![Ciclo Completo de Tratamento de Erros e DLQ](ciclo-tratamento-erros-dlq.png)

> **Nota:** Arquivo vetorial de alta definição disponível em [`ciclo-tratamento-erros-dlq.svg`](ciclo-tratamento-erros-dlq.svg) e código fonte em [`ciclo-tratamento-erros-dlq.puml`](ciclo-tratamento-erros-dlq.puml).

---

## 3. Diagrama em Sintaxe Mermaid (Renderização Nativa)

```mermaid
sequenceDiagram
    autonumber
    participant Worker as AI Worker (Consumidor)
    participant MainQ as Fila Principal (image-queue)
    participant RetryQ as Fila de Retry com TTL
    participant DLX as Exchange DLX (pixpro.dlx)
    participant DLQ as Fila Morta (image.processing.dlq)
    participant DB as PostgreSQL (Sequelize)
    participant Notif as Notification Service (WebSocket)
    participant Client as Usuário / Web SPA
    participant Admin as SRE / Administrador

    Note over Worker,MainQ: 1. Detecção da Falha Inicial
    MainQ->>Worker: Entrega evento [ImageUploaded] (retryCount: 0)
    Worker->>Worker: Falha detectada (Timeout > 30s ou I/O)

    Note over Worker,RetryQ: 2. Backoff Exponencial (Retries 1 e 2)
    loop Tentativas 1 e 2 (retryCount < 3)
        Worker->>Worker: retryCount++ (Delay: 2^retryCount segundos)
        Worker->>RetryQ: Publica com TTL e x-retry-count
        Worker->>MainQ: basic.ack (Libera fila principal)
        RetryQ->>RetryQ: Aguarda expiração do TTL (2s / 4s)...
        RetryQ->>MainQ: RabbitMQ re-enfileira automaticamente
        MainQ->>Worker: Redelivery da tarefa para nova tentativa
        Worker->>Worker: Falha persiste...
    end

    Note over Worker,DLQ: 3. Esgotamento e Despacho para DLQ
    Worker->>Worker: retryCount >= 3 (Falha Crítica Comprovada)
    Worker->>DLX: basic.nack(requeue = false)
    DLX->>DLQ: Roteia para Dead Letter Queue (image.processing.dlq)
    Note over DLQ: Mensagem isolada com headers x-death.<br/>Fila principal segue desobstruída!

    Note over Worker,Client: 4. Emissão de Erro e Notificação
    Worker->>DB: Image.update() [Status: FAILED, Motivo do Erro]
    Worker->>Notif: Publica evento [ProcessingError]
    Notif-->>Client: WebSocket Push (Alerta: "Falha no processamento")
    Client->>Client: Interface exibe status FAILED

    Note over Admin,Worker: 5. Reconciliação Operacional & Replay
    Admin->>Admin: Alerta recebido! Investiga causa raiz
    Admin->>DLQ: Inspeciona mensagem e corrige o problema
    Admin->>MainQ: Executa Replay/Shovel (DLQ -> image-queue)
    MainQ->>Worker: Worker saudável reprocessa a imagem com SUCESSO!
    Worker->>MainQ: basic.ack final
```

---

## 4. Pilares de Resiliência Modelados

### A. Backoff Exponencial (Exponential Backoff)
Para falhas transitórias (como instabilidade momentânea de rede com o Storage ou contenção temporária de GPU), o sistema aplica retentativas automáticas espaçadas temporalmente:
$$\text{Delay} = \text{base} \times 2^{\text{retryCount}}$$
* **1ª tentativa:** 2 segundos
* **2ª tentativa:** 4 segundos
* **3ª tentativa:** Esgotamento de limite de retentativas.

### B. Prevenção de Bloqueio em Fila (*Head-of-Line Blocking*)
Se um arquivo corrompido for re-enfileirado infinitamente na frente da fila, todo o cluster de IA ficará travado processando o mesmo arquivo inválido. O envio para a **Dead Letter Queue (`image.processing.dlq`)** após 3 tentativas remove a mensagem tóxica do fluxo ativo sem descartá-la.

### C. Rastreabilidade com Metadados `x-death`
Ao ser roteada para a DLQ, a mensagem recebe do broker as seguintes informações de auditoria:
* `reason`: motivo da rejeição (`rejected`).
* `queue`: fila de origem (`image-queue`).
* `count`: total de vezes que a mensagem falhou antes de ser morta.
* `time`: timestamp exato da falha irreversível.

### D. Reconciliação e Operação de Replay (Shovel)
A DLQ é persistente e segura. Quando os engenheiros de SRE corrigem a causa raiz (ex: ampliação de memória dos containers ou restabelecimento do serviço de armazenamento), o plugin **RabbitMQ Shovel** ou uma CLI de automação drena a DLQ de volta para a fila `image-queue`, recuperando o processamento sem que o usuário precise fazer novo upload.
