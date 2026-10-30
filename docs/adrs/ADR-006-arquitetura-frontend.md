# ADR-002: Fundação da Arquitetura Frontend e Experiência do Usuário (PixPro)

* **Status:** Aceito
* **Data:** Outubro de 2026
* **Autores:** Equipe de Engenharia PixPro

---

## 1. Contexto e Problema

A plataforma PixPro exige uma interface de usuário (UI/UX) moderna, altamente responsiva e capaz de interagir de forma assíncrona com microsserviços de backend pesados (como processamento de imagens por IA, autenticação e mensageria). 

Precisamos definir a stack tecnológica e a fundação arquitetural do frontend (Single Page Application - SPA), estabelecendo padrões claros para gerenciamento de rotas, consumo de APIs via HTTP/WebSocket e o mapeamento das telas essenciais para o fluxo do usuário.

## 2. Decisão

Decidimos adotar **React** combinado com o **Vite** como empacotador de módulos (*bundler*), estruturando uma SPA modular. Para a comunicação com o backend, utilizaremos o **Axios** para requisições HTTP REST padronizadas e conexões **WebSocket** nativas para o recebimento de notificações em tempo real.

### Mapeamento de Funcionalidades do Frontend:
1. **Autenticação (Login / Register):** Telas de acesso e registro com validação de formulários e armazenamento seguro do token JWT de sessão.
2. **Dashboard / Histórico de Imagens:** Listagem centralizada do histórico de ativos enviados pelo usuário, exibindo miniaturas, status atual (*Pendente*, *Processado*, *Erro*) e metadados.
3. **Página de Detalhes da Imagem:** Visualização aprofundada de um ativo específico, permitindo acompanhar o resultado da IA, tags extraídas e opções de download do arquivo processado.
4. **Módulo de Processamento e Efeitos (IA):** Interface interativa para upload de imagens, seleção de modelos de IA / efeitos em tempo real e feedback visual assíncrono.

## 3. Arquitetura C4 (Níveis 1 e 2)

Os diagramas abaixo descrevem a arquitetura do sistema do ponto de vista do contexto e dos containers utilizando PlantUML.

### Nível 1: Diagrama de Contexto do Sistema (System Context)
```plantuml
@startuml
skinparam BackgroundColor transparent
skinparam ArrowColor #2980B9
skinparam ActorBackgroundColor #F39C12
skinparam RectangleBackgroundColor #ECF0F1

actor "Usuário Final" as User
rectangle "Plataforma PixPro" {
    rectangle "Frontend SPA\n(React + Vite)" as Frontend
    rectangle "Backend Services\n(API Gateway, Auth, Workers)" as Backend
}

User --> Frontend : Acessa via navegador (HTTPS)
Frontend --> Backend : Consome APIs REST / WebSocket
@enduml
```

### Nível 2: Diagrama de Containers (Container Diagram)
```plantuml
@startuml
skinparam BackgroundColor transparent
skinparam ArrowColor #2980B9
skinparam ActorBackgroundColor #F39C12
skinparam RectangleBackgroundColor #ECF0F1
skinparam DatabaseBackgroundColor #D5F5E3

actor "Usuário" as User

box "Cliente (Browser)" #F9EBEA
    participant "Frontend SPA\n(React / Vite / TS)" as Frontend
end box

box "Infraestrutura Backend / Docker Swarm" #E8F8F5
    participant "API Gateway\n(Node.js / Redis)" as Gateway
    participant "Auth Service\n(PostgreSQL)" as Auth
    participant "Image Processing\n(RabbitMQ / Workers)" as Worker
end box

User --> Frontend : Interage com a UI
Frontend --> Gateway : HTTP REST (Axios) / WebSocket
Gateway --> Auth : Valida tokens / Credenciais
Gateway --> Worker : Publica tarefas no Event Bus
@enduml
```

### 4. Diagrama de Sequência: Fluxo de Upload e Notificação em Tempo Real
O diagrama abaixo detalha a interação assíncrona entre o Frontend, o Gateway, o Broker e os Workers durante o envio e processamento de uma imagem.

```plantuml
@startuml
skinparam BackgroundColor transparent
skinparam ArrowColor #2980B9
skinparam ParticipantBackgroundColor #ECF0F1

actor "Usuário" as User
participant "Frontend\n(React)" as Frontend
participant "API Gateway" as Gateway
queue "RabbitMQ" as Broker
participant "AI Worker" as Worker
participant "WebSocket" as WS

User -> Frontend: Seleciona imagem e clica em "Processar"
Frontend -> Gateway: POST /api/images/upload (Axios)
activate Gateway
Gateway -> Gateway: Valida JWT e armazena arquivo
Gateway --> Frontend: Retorna 202 Accepted (ID da Tarefa)
deactivate Gateway

== Processamento Assíncrono ==
Gateway -> Broker: Publica evento [ImageUploaded]
Broker -> Worker: Consome tarefa de IA
activate Worker
note right of Worker
  Executa modelo pré-treinado
  (Transfer Learning)
end note
Worker -> Broker: Publica evento [ImageProcessed]
deactivate Worker

== Atualização Visual em Tempo Real ==
Broker -> WS: Notifica conclusão do job
WS -> Frontend: Envia evento via WebSocket
Frontend -> User: Atualiza status na UI (Notificação Toast / Tela de Detalhes)
@enduml
```

### 5. Consequências e Vantagens Técnicas

- Alta Performance de Desenvolvimento: O uso do Vite garante tempos de carregamento instantâneos em ambiente de desenvolvimento (Hot Module Replacement ultrarrápido).

- Desacoplamento Visual: A arquitetura baseada em rotas e componentes no React permite que a equipe de frontend evolua as telas de histórico e detalhes de forma independente dos serviços de backend.

- Experiência Fluida (UX): O uso combinado de REST (Axios) para requisições síncronas e WebSocket para atualizações assíncronas evita o travamento da interface durante o processamento pesado de imagens por IA.