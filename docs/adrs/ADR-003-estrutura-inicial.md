# Configuração de Repositório Git e Ambiente de Desenvolvimento de Backend

## Objetivo

Configurar a estrutura inicial do repositório e o ambiente local de desenvolvimento do backend do PixPro, garantindo uma organização adequada dos serviços e uma infraestrutura comum para execução local.

## Estrutura do Repositório

A estrutura inicial do backend será organizada da seguinte forma:

```text
pixpro/
├── backend/
│   └── services/
│       ├── auth-service/
│       ├── project-service/
│       └── image-processing-service/
│
├── docs/
│   └── adrs/
│       └── ADR-001-divisao-modulos-backend.md
│
├── infrastructure/
│
├── .gitignore
├── docker-compose.yml
└── README.md
````

A pasta `backend/services` será utilizada para organizar os microsserviços do backend definidos na arquitetura do projeto.

A pasta `docs/adrs` será utilizada para armazenar os registros de decisões arquiteturais do projeto.

## Estratégia de Branches

O projeto utilizará GitFlow como estratégia inicial de organização das branches.

### Branches principais

* `main`: contém a versão estável do projeto.
* `develop`: utilizada para integração das funcionalidades em desenvolvimento.

### Branches de desenvolvimento

* `feature/*`: desenvolvimento de novas funcionalidades ou tarefas.
* `bugfix/*`: correção de problemas encontrados durante o desenvolvimento.

Exemplo:

```text
develop
   │
   ├── feature/issue-1.3-backend-environment
   │
   └── bugfix/database-connection
```

As alterações deverão ser integradas através de Merge Requests.

A branch `main` deverá ser protegida e não deverá receber commits diretamente.

## Convenção de Branch

Cada Issue deverá possuir uma branch própria quando aplicável.

Para a Issue 1.3:

```text
feature/issue-1.3-backend-environment
```

Fluxo:

```text
develop
   ↓
feature/issue-1.3-backend-environment
   ↓
Merge Request
   ↓
develop
```

## Git Ignore

O repositório deverá possuir um `.gitignore` adequado aos ambientes de desenvolvimento utilizados pelo backend.

Entre os arquivos e diretórios ignorados estão:

* arquivos de IDE;
* `node_modules`;
* arquivos `bin` e `obj` do .NET;
* arquivos de ambiente `.env`;
* logs;
* arquivos temporários;
* diretórios de build;
* arquivos gerados automaticamente.

Arquivos de configuração que contenham credenciais ou informações sensíveis não deverão ser versionados.

## Ambiente de Desenvolvimento

O ambiente local será executado utilizando Docker Compose.

A infraestrutura inicial será composta pelos seguintes serviços:

| Serviço             | Porta | Função                    |
| ------------------- | ----: | ------------------------- |
| PostgreSQL          |  5432 | Persistência de dados     |
| Redis               |  6379 | Cache                     |
| RabbitMQ            |  5672 | Mensageria                |
| RabbitMQ Management | 15672 | Administração do RabbitMQ |

O PostgreSQL será utilizado como banco de dados transacional.

O Redis será utilizado como mecanismo de cache.

O RabbitMQ será utilizado inicialmente como broker de mensagens para comunicação assíncrona entre os serviços.

A decisão definitiva entre RabbitMQ e Kafka permanece como uma decisão arquitetural futura, conforme definido no ADR-001.

## Docker Compose

O arquivo `docker-compose.yml` deverá conter somente a infraestrutura necessária para o desenvolvimento inicial do backend.

```yaml
services:

  postgres:
    image: postgres:16
    container_name: pixpro-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: pixpro
      POSTGRES_USER: pixpro
      POSTGRES_PASSWORD: pixpro
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U pixpro -d pixpro"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7
    container_name: pixpro-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  rabbitmq:
    image: rabbitmq:4-management
    container_name: pixpro-rabbitmq
    restart: unless-stopped
    environment:
      RABBITMQ_DEFAULT_USER: pixpro
      RABBITMQ_DEFAULT_PASS: pixpro
    ports:
      - "5672:5672"
      - "15672:15672"
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "-q", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
  rabbitmq_data:
```

## Execução do Ambiente

Para iniciar os serviços:

```bash
docker compose up -d
```

Para verificar o estado dos containers:

```bash
docker compose ps
```

Para validar a configuração:

```bash
docker compose config
```

Para parar os serviços:

```bash
docker compose down
```

Para remover os containers e seus volumes:

```bash
docker compose down -v
```

## Validação dos Serviços

### PostgreSQL

```bash
docker exec pixpro-postgres pg_isready -U pixpro -d pixpro
```

Resultado esperado:

```text
pixpro:5432 - accepting connections
```

### Redis

```bash
docker exec pixpro-redis redis-cli ping
```

Resultado esperado:

```text
PONG
```

### RabbitMQ

```bash
docker exec pixpro-rabbitmq rabbitmq-diagnostics -q ping
```

Resultado esperado:

```text
Ping succeeded
```

O painel de gerenciamento do RabbitMQ estará disponível em:

```text
http://localhost:15672
```

Credenciais locais:

```text
Usuário: pixpro
Senha: pixpro
```

## Proteção da Branch Main

A branch `main` deverá ser protegida no GitLab.

As configurações recomendadas são:

* impedir push direto;
* exigir Merge Request;
* exigir revisão antes do merge;
* permitir merge somente após as validações necessárias.

## Critérios de Aceitação

A Issue será considerada concluída quando:

* [x] O repositório possuir estrutura organizada para os serviços de backend.
* [x] A pasta `docs/adrs` estiver criada.
* [x] O `.gitignore` estiver configurado.
* [x] A estratégia GitFlow estiver documentada.
* [x] A branch `main` estiver protegida.
* [x] O `docker-compose.yml` estiver configurado.
* [x] PostgreSQL estiver funcionando localmente.
* [x] Redis estiver funcionando localmente.
* [x] RabbitMQ estiver funcionando localmente.
* [x] Os serviços puderem ser iniciados através de `docker compose up -d`.
* [x] Os serviços puderem ser validados sem erros.

## Resultado Esperado

Ao final da configuração, qualquer integrante da equipe deverá conseguir preparar o ambiente de desenvolvimento do backend executando:

```bash
git clone <repositorio>
cd pixpro
docker compose up -d
```

Com isso, a infraestrutura básica necessária para o desenvolvimento dos microsserviços estará disponível localmente.

