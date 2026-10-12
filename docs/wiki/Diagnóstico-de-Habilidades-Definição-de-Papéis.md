# Issue 2.2 — Diagnóstico de Habilidades e Definição de Papéis

> **Status:** rascunho inicial. Percepções baseadas na observação do autor; níveis individuais pendentes de autoavaliação de cada integrante.
> **Como preencher:** cada integrante edita **somente a própria coluna** da seção 1 e pode ajustar a seção 1.1 (perfil) e a seção 4 (papéis) se discordar.
> **Escala:** **B** = Básico · **I** = Intermediário · **A** = Avançado

## 1. Matriz de habilidades atuais
| Competência | Consenso inicial | William | Rhuan | Deividi | Arthur | Victor |
|---|------------------|---|---|---|---|---|
| **Frontend** |                  | | | |B| B|
| React | I                | I |I | I |I| I|
| TypeScript/JavaScript | I | I | I| I |I| I|
| HTML/CSS | B                | I | I| I |B | I|
| Consumo de APIs REST | I                | I | I| I |I | A|
| Gerenciamento de estado | I                | B |I | B |I | I|
| **Backend** |                  | | | |A| A|
| Linguagem principal JavaScript | I                | I |I| I |I| I|
| Framework backend | I                | I |I| I |I| A|
| APIs REST | I                | I |I | I |I | A|
| Banco de dados | I                | I |I | I |I | A|
| Autenticação/autorização | I                | I |I | I |I | A|
| Testes | I                | I |I | B |B | I|
| **Ferramentas e práticas** |                  | | | |A | A|
| Git/GitLab | B                | I |I | B |B | A|
| Docker | I                | I |I | B |I | I|
| CI/CD | I                | B | I| B |I | I|
| Testes automatizados | I                | I |I | B |I | I|
| Documentação | B                | I |I | I |B | B|
| Arquitetura de software | I                | I | I| I |I | I|
> "Consenso inicial" = estimativa de que a equipe já trabalhou com essas tecnologias em projetos anteriores. Cada integrante confirma ou corrige na própria coluna. Na versão final, o consolidado será calculado a partir das colunas individuais.

### 1.1 Perfil observado por integrante
| Integrante | Ponto forte | Perfil |
|---|---|---|
| William Schreiner | Orquestração, organização e tomada de decisão | Analítico e organizacional |
| Rhuan Esteves | UX e estilização | Visual/criativo |
| Deividi Santos | Raciocínio lógico e execução | Prático |
| Arthur Oliveira | Backend e decisões técnicas, com visão full stack | Analítico |
| Victor de Paula | Conhecimento amplo de linguagens e frameworks, com domínio do funcionamento interno | Técnico/generalista |

### 1.2 Status da autoavaliação
- [x] William
- [x] Rhuan
- [x] Deividi
- [ ] Arthur
- [x] Victor

## 2. Novas competências necessárias
| # | Tecnologia / conhecimento | Motivo | Nível esperado | Quem precisa | Dependências |
|---|---|---|---|---|---|
| 1 | RabbitMQ (exchanges, filas, DLX) | Espinha dorsal da mensageria assíncrona | Intermediária | Backend (todos) | Docker |
| 2 | Event-Driven Architecture | Base arquitetural do projeto | Intermediária | Todos | — |
| 3 | CQRS + Event Sourcing | Separação escrita/leitura e auditoria | Avançada | Arthur (líder), Deividi | EDA, PostgreSQL |
| 4 | Transactional Outbox Pattern | Evitar dual-write entre banco e broker | Intermediária | Arthur, Deividi | PostgreSQL, RabbitMQ |
| 5 | WebSocket + Redis Pub/Sub | Notificações em tempo real | Intermediária | Backend + Rhuan (cliente) | Redis, JWT |
| 6 | AsyncAPI | Contrato formal de eventos | Básica | Arthur, William | EDA, WebSocket |
| 7 | Python + ONNX/Torch (AI Workers) | Inferência de IA nos workers | Básica–Intermediária | Deividi (+1 apoio) | Python, RabbitMQ |
| 8 | Storage S3/MinIO + URLs assinadas | Binários fora do backend | Básica | Backend | Docker |
| 9 | Resiliência (retry, idempotência, DLQ, circuit breaker) | Tolerância a falhas | Intermediária | Backend | RabbitMQ |
| 10 | Observabilidade e health checks | Operação e testes de falha | Básica | William, Arthur | Docker |
| 11 | API Gateway (rate limiting, roteamento) | Ponto de entrada único | Básica | Arthur, William | JWT, Redis |
| 12 | C4 Model / ADRs | Documentação arquitetural | Básica | Arthur, William | — |

## 3. Curva de aprendizado
| Tecnologia | Nível necessário | Conhecimento atual | Tempo estimado | Esforço | Prioridade | Justificativa |
|---|---|---|---|---|---|---|
| Docker Compose / infra | Intermediário | Básico–Intermediário | 6 h | Baixo | Alta | Ambiente base de todos (semanas 1–3) |
| RabbitMQ | Intermediário | Nenhum–Básico | 16 h | Médio | Alta | Todos os serviços dependem do broker |
| EDA | Intermediário | Básico | 10 h | Médio | Alta | Pré-requisito para CQRS e Outbox |
| Outbox Pattern | Intermediário | Nenhum | 10 h | Médio | Alta | Entrega das semanas 4–6 |
| CQRS | Avançado | Nenhum–Básico | 20 h | Alto | Alta | Impacto direto na arquitetura |
| Event Sourcing | Intermediário | Nenhum | 12 h | Alto | Média | Auditoria; pode ser incremental |
| WebSocket + Redis Pub/Sub | Intermediário | Básico | 12 h | Médio | Média | Semanas 7–8 |
| AsyncAPI | Básico | Nenhum | 6 h | Baixo | Média | Documentação dos contratos |
| Resiliência (DLQ, retry, idempotência) | Intermediário | Nenhum–Básico | 14 h | Médio | Média | Semana 9 |
| Python + ONNX (workers) | Básico | Básico | 15 h | Médio | Média | Inferência; pode usar modelo pronto |
| Storage S3/MinIO | Básico | Nenhum | 5 h | Baixo | Baixa | Integração simples via SDK |
| Observabilidade | Básico | Nenhum | 6 h | Baixo | Baixa | Complementar na fase final |
> Tempos estimados por pessoa que precisa aprender, considerando o conhecimento prévio da equipe. Serão revisados após a autoavaliação.

## 4. Papéis e responsabilidades (proposta inicial, a validar)
| Integrante | Papel principal | Responsabilidades | Tecnologias | Papel secundário | Competências a desenvolver |
|---|---|---|---|---|---|
| William Schreiner | Scrum Master / Coordenação | Cerimônias, backlog, integração do time, decisões de escopo | GitLab, Scrum | DevOps (CI/CD, Docker) | AsyncAPI, observabilidade |
| Arthur Oliveira | Backend Lead / Arquitetura | Image Processing Service, CQRS, Outbox, ADRs, C4 | Backend, PostgreSQL, RabbitMQ | Revisão técnica de MRs | Event Sourcing, resiliência |
| Deividi Santos | Backend Developer (workers e lógica) | AI Workers, consumidores, idempotência, retry/DLQ | Python, RabbitMQ, ONNX | Testes automatizados | Mensageria, ONNX |
| Rhuan Esteves | Frontend Developer / UX | SPA React, telas de upload/progresso, cliente WebSocket | React, TypeScript, CSS | Documentação visual (C4/fluxos) | WebSocket, testes de frontend |
| Victor de Paula | Backend Developer / Especialista em frameworks | Integração entre serviços, API Gateway, Auth Service, apoio técnico em decisões de stack | Frameworks backend, PostgreSQL, Redis, JWT | Revisão técnica de MRs, apoio em testes | Mensageria (RabbitMQ), CQRS |

## 5. Justificativa da distribuição
- **William:** perfil organizacional e de decisão se encaixa em Scrum Master; DevOps como apoio mantém ele próximo da infraestrutura sem sobrecarregar o backend.
- **Arthur:** maior afinidade com backend e decisões técnicas; CQRS e Outbox são as competências de maior curva e impacto arquitetural, então ficam com quem já tem base e visão analítica.
- **Deividi:** forte em lógica e prática, adequado a workers, idempotência e tratamento de falhas.
- **Rhuan:** domínio de UX e estilização; o frontend ganha qualidade com foco dedicado, e o cliente WebSocket é uma competência nova com escopo contido.
- **Victor:** conhecimento profundo de frameworks e de linguagens o torna adequado a serviços que exigem entendimento do funcionamento interno (autenticação, gateway, integração), além de reforçar o code review cruzado.
- **Compartilhamento:** code review cruzado obrigatório (1 aprovação por MR) e pareamento nas tecnologias de maior curva (CQRS, RabbitMQ).

## 6. Plano inicial de aprendizado
| Ordem | Competência | Quem | Quando |
|---|---|---|---|
| 1 | Docker Compose + infra local | Todos | Semanas 1–3 |
| 2 | EDA + RabbitMQ | Backend | Semanas 1–4 |
| 3 | Outbox + CQRS | Arthur, Deividi | Semanas 4–6 |
| 4 | WebSocket + Redis Pub/Sub + AsyncAPI | Backend + Rhuan | Semanas 7–8 |
| 5 | Resiliência + observabilidade | Backend + William | Semana 9 |
| 6 | Python/ONNX (em paralelo) | Deividi | Semanas 3–6 |