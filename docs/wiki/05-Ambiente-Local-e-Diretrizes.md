# 5. Ambiente Local e Diretrizes de Desenvolvimento

---

## 5.1 Pré-requisitos

Para executar e desenvolver o backend do **PixPro**, a estação de trabalho deve possuir instalado:
- **Git** (versão 2.40+)
- **Docker** e **Docker Compose v2** (versão 24.0+)
- **Node.js** (LTS v20+) ou **.NET 8 SDK** (conforme serviço desenvolvido)
- **Python 3.11+** (para os workers de inferência de IA)

---

## 5.2 Inicialização da Infraestrutura Local

Toda a camada de infraestrutura transacional e de mensageria é provisionada localmente de forma automatizada via Docker Compose, conforme estabelecido na [ADR-003](file:///docs/adrs/ADR-003-estrutura-inicial.md).

### 1. Iniciar os Contêineres
Na raiz do repositório, execute:
```bash
docker compose up -d
```

### 2. Mapeamento de Portas e Serviços

| Serviço | Contêiner | Porta Externa | Credenciais Padrão | Finalidade |
| :--- | :--- | :---: | :--- | :--- |
| **PostgreSQL 16** | `pixpro-postgres` | `5432` | user: `pixpro`<br/>pass: `pixpro`<br/>db: `pixpro` | Persistência transacional dos microsserviços |
| **Redis 7** | `pixpro-redis` | `6379` | *sem senha* | Caching, sessões e Pub/Sub |
| **RabbitMQ 4** | `pixpro-rabbitmq` | `5672` | user: `pixpro`<br/>pass: `pixpro` | Protocolo AMQP para mensageria assíncrona |
| **RabbitMQ Management** | `pixpro-rabbitmq` | `15672` | user: `pixpro`<br/>pass: `pixpro` | Dashboard web de administração de filas e exchanges |

### 3. Validação do Estado dos Serviços
```bash
# Validar se o PostgreSQL está aceitando conexões
docker exec pixpro-postgres pg_isready -U pixpro -d pixpro

# Validar conectividade com o Redis
docker exec pixpro-redis redis-cli ping

# Validar integridade do RabbitMQ
docker exec pixpro-rabbitmq rabbitmq-diagnostics -q ping
```

---

## 5.3 Estratégia de Branches e GitFlow

O time adota uma estratégia estrita baseada em **GitFlow**:

```text
main (produção / releases estáveis)
  ↑
develop (integração contínua)
  ↑
feature/issue-<num>-<descricao> (desenvolvimento de histórias e tarefas)
bugfix/issue-<num>-<descricao> (correções de bugs identificados)
```

### Regras de Governança do Git:
1. **Proteção da branch `main` e `develop`:** Pushes diretos são bloqueados. Toda integração ocorre via **Merge Request (MR)** no GitLab.
2. **Nomenclatura de Branches:**
   - Para novas funcionalidades: `feature/issue-X.X-nome-resumido`
   - Para documentação: `docs/issue-X.X-nome-resumido`
   - Para correções: `bugfix/issue-X.X-nome-resumido`
3. **Padrão de Mensagens de Commit (Conventional Commits):**
   - `feat: adiciona fila de processamento no rabbitmq`
   - `fix: corrige validacao de tamanho maximo de upload`
   - `docs: atualiza wiki com especificacao de casos de uso`
   - `test: adiciona testes de integracao para o outbox pattern`

---

## 5.4 Comandos Úteis do Docker Compose

```bash
# Visualizar logs em tempo real
docker compose logs -f [postgres | redis | rabbitmq]

# Parar serviços sem perder os dados persistidos nos volumes
docker compose down

# Parar e resetar completamente todos os dados dos bancos e filas
docker compose down -v
```
