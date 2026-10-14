# ADR-002: Implementação do Redis no API Gateway e criação do Auth Service

**Status:** Aceita  
**Data:** 11/10/2026

## Contexto

O PixPro precisa de uma infraestrutura de backend organizada em microsserviços, com controle de requisições no API Gateway e um serviço responsável pela autenticação e pelo cadastro de usuários.

Para atender a essas necessidades, foram implementados o Redis como suporte ao controle de requisições e o Auth Service para gerenciar o registro de usuários com segurança.

## Decisão

Foi decidido utilizar o **Redis no API Gateway** e criar um **Auth Service independente**, mantendo a comunicação entre os serviços por meio do API Gateway.

### Redis no API Gateway

O Redis foi adicionado à infraestrutura utilizando Docker Compose para permitir o armazenamento compartilhado de dados utilizados pelo controle de requisições (*rate limiting*).

As configurações incluem:
- Redis 7 com persistência habilitada.
- Autenticação por senha.
- Verificação de integridade do container (*health check*).
- Rede Docker compartilhada entre os serviços.
- Integração com o API Gateway por meio da variável `REDIS_URL`.

O API Gateway utiliza o Redis para auxiliar no controle do número de requisições, especialmente nas rotas relacionadas à autenticação.

### Criação do Auth Service

Foi criado um microsserviço independente utilizando Node.js, Express, PostgreSQL e Sequelize, responsável pelo cadastro de usuários.

As principais implementações incluem:
- Endpoint `POST /api/auth/register`.
- Validação dos dados recebidos utilizando Zod.
- Normalização e validação do endereço de e-mail.
- Hash de senhas utilizando Argon2id.
- Verificação de e-mails já cadastrados.
- Tratamento de erros e respostas HTTP padronizadas.
- Verificação de disponibilidade por meio do endpoint `/health`.
- Configuração de inicialização e encerramento do serviço.
- Execução em container Docker, conectado ao PostgreSQL pela rede interna.

O API Gateway encaminha as requisições para o Auth Service, mantendo um ponto de entrada centralizado para a API.

## Consequências

**Benefícios:**
- Centralização do controle de requisições no API Gateway.
- Possibilidade de compartilhar os dados do *rate limiting* por meio do Redis.
- Separação das responsabilidades de autenticação e roteamento.
- Maior segurança no armazenamento das senhas.
- Facilidade para executar e testar os serviços por meio do Docker Compose.
- Maior organização e possibilidade de evolução independente dos microsserviços.

**Pontos de atenção:**
- O Redis e o PostgreSQL precisam estar disponíveis para o funcionamento adequado das funcionalidades que dependem deles.
- As senhas e demais credenciais devem ser configuradas adequadamente nos ambientes de desenvolvimento e produção.
- O cadastro de usuários deve ser testado tanto diretamente no Auth Service quanto por meio do API Gateway.

## Alternativas consideradas

- **Armazenar o controle de requisições apenas em memória:** não oferece compartilhamento do estado entre diferentes instâncias do API Gateway.
- **Implementar a autenticação diretamente no API Gateway:** aumentaria a responsabilidade desse componente e reduziria a separação entre roteamento e autenticação.
- **Utilizar consultas SQL diretas sem ORM:** foi adotado o Sequelize para organizar o acesso ao banco de dados e o mapeamento das entidades.

## Resultado

A infraestrutura do PixPro passou a contar com Redis integrado ao API Gateway e um Auth Service independente para o cadastro de usuários. Essa implementação estabelece a base para evoluir a autenticação e os demais serviços do sistema.