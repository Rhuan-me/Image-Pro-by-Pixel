# PixPro — Plataforma Inteligente de Processamento de Imagens

[![GitLab CI](https://img.shields.io/badge/gitlab--ci-pipeline-blue?logo=gitlab)](https://gitlab.com/jala-university1/cohort-4/PT.CSSD-352.GA.T2.26.M2/SB/grupo-3/pixpro)
[![Architecture](https://img.shields.io/badge/Architecture-Event--Driven%20%7C%20CQRS-green)](docs/adrs/ADR-001-arquitetura-inicial.md)
[![Docker Compose](https://img.shields.io/badge/Environment-Docker%20Compose-blue?logo=docker)](docker-compose.yml)

> Plataforma distribuída de alto desempenho projetada para processamento inteligente de imagens, combinando modelos avançados de Inteligência Artificial para melhoria automática, detecção de objetos e aplicação de efeitos artísticos.

---

## Documentação Oficial & Wiki

A documentação detalhada da arquitetura, casos de uso e governança do time está consolidada na **Wiki do Projeto** e versionada na pasta [`docs/wiki/`](docs/wiki/):

- **[Wiki Home](docs/wiki/Home.md):** Visão geral e mapa de navegação.
- **[1. Visão Geral e Objetivos](docs/wiki/01-Resumo-e-Objetivos.md):** Problemas de concorrência, escalabilidade e processamento em lote.
- **[2. Casos de Uso e Requisitos Funcionais](docs/wiki/02-Casos-de-Uso-e-Requisitos-Funcionais.md):** Especificação detalhada dos casos de uso CU01 a CU10 sob a ótica do backend.
- **[3. Arquitetura e Requisitos Técnicos](docs/wiki/03-Arquitetura-e-Requisitos-Tecnicos.md):** EDA, CQRS, Outbox Pattern, WebSockets com AsyncAPI, persistência e resiliência.
- **[4. Papéis e Organização do Time](docs/wiki/04-Papeis-e-Organizacao-do-Time.md):** Matriz RACI e divisão de responsabilidades técnicas do Grupo 3.
- **[5. Ambiente Local e Diretrizes](docs/wiki/05-Ambiente-Local-e-Diretrizes.md):** Guia de execução com Docker Compose e fluxo de trabalho GitFlow.

---

## 🚀 Como Iniciar o Ambiente de Desenvolvimento

O ambiente local do backend depende de containers para PostgreSQL, Redis e RabbitMQ.

```bash
# 1. Clonar o repositório
git clone https://gitlab.com/jala-university1/cohort-4/PT.CSSD-352.GA.T2.26.M2/SB/grupo-3/pixpro.git
cd pixpro

# 2. Iniciar a infraestrutura via Docker Compose
docker compose up -d

# 3. Validar se os serviços estão operacionais
docker compose ps
```

### Serviços e Acessos Locais:
- **PostgreSQL 16:** `localhost:5432` (user/pass: `pixpro` / `pixpro`)
- **Redis 7:** `localhost:6379`
- **RabbitMQ Broker:** `localhost:5672` (user/pass: `pixpro` / `pixpro`)
- **RabbitMQ Dashboard:** [http://localhost:15672](http://localhost:15672)

Para mais detalhes sobre o ambiente, consulte a [ADR-003](docs/adrs/ADR-003-estrutura-inicial.md).

---

## 🏛️ Registros de Decisão Arquitetural (ADRs) & Diagramas

- **[ADR-001: Divisão dos Módulos e Microsserviços do Backend](docs/adrs/ADR-001-arquitetura-inicial.md)**
- **[ADR-003: Estrutura Inicial e Ambiente de Desenvolvimento](docs/adrs/ADR-003-estrutura-inicial.md)**
- **[Diagrama C4 N1 — Contexto](docs/diagrams/c4-n1-contexto.md)**
- **[Diagrama C4 N2 — Contêineres](docs/diagrams/c4-n2-containers.md)**

---

## 👥 Equipe do Projeto (Grupo 3 - Capstone DS5)

- **William Schreiner** — *Scrum Master*
- **Rhuan** — *Developer*
- **Deividi Santos** — *Developer*
- **Arthur Oliveira** — *Developer*
- **Victor de Paula** — *Developer*
