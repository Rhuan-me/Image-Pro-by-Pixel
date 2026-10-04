# PixPro — Wiki Oficial do Projeto

Bem-vindo à Wiki oficial do **PixPro**, plataforma distribuída e inteligente de processamento de imagens desenvolvida no âmbito do Capstone de Engenharia de Software (Jala University - Cohort 4 - Grupo 3).

Esta Wiki consolida a documentação contratual, arquitetural e funcional da solução, com foco direcionado ao desenvolvimento e governança do **backend distribuído**.

---

## Navegação Rápida

| Seção | Descrição |
| :--- | :--- |
| **[1. Visão Geral e Objetivos](01-Resumo-e-Objetivos)** | Contexto do projeto, problemas a resolver (alta concorrência, processamento em lote) e objetivos do backend distribuído. |
| **[2. Casos de Uso e Requisitos Funcionais](02-Casos-de-Uso-e-Requisitos-Funcionais)** | Detalhamento dos casos de uso (CU01 a CU10), fluxos de dados, regras de negócio e impactos diretos no backend. |
| **[3. Arquitetura e Requisitos Técnicos](03-Arquitetura-e-Requisitos-Tecnicos)** | Decisões técnicas: EDA, CQRS, Outbox Pattern, WebSockets com AsyncAPI, persistência e resiliência. |
| **[4. Papéis e Organização da Equipe](04-Papeis-e-Organizacao-do-Time)** | Estrutura dos membros do Grupo 3, matriz RACI de responsabilidades técnicas e distribuição por domínios de backend. |
| **[5. Ambiente Local e Diretrizes](05-Ambiente-Local-e-Diretrizes)** | Instruções de execução com Docker Compose, convenções do GitFlow, branches e governança do repositório. |

---

## Resumo Executivo da Solução

O **PixPro** redefine a interação com ativos visuais digitais por meio de modelos avançados de Inteligência Artificial para:
- **Melhorias automáticas de imagem** (ajuste de brilho, contraste, nitidez e redução de ruído);
- **Detecção e classificação de objetos** em imagens;
- **Aplicação de filtros e efeitos artísticos** estilizados.

Para suportar **altos volumes de upload, processamento assíncrono intensivo e atualizações em tempo real**, o backend foi concebido sob uma **Arquitetura Orientada a Eventos (EDA)** com microsserviços desacoplados, isolamento de recursos computacionais e tolerância a falhas.

```mermaid
graph LR
    User([Usuário / SPA]) -->|HTTP / REST| Gateway[API Gateway]
    User <..>|WebSocket| NotifSvc[Serviço de Notificações]
    
    subgraph Core Services
        Gateway --> AuthSvc[Auth Service]
        Gateway --> ProjectSvc[Project & Asset Service]
        Gateway --> ImgSvc[Image Processing Service]
    end

    subgraph Event Backbone & Processing
        ImgSvc -->|Publica Tarefas| Broker[(Message Broker<br/>RabbitMQ)]
        Broker --> Worker[AI Processing Workers]
        Worker -->|Eventos de Conclusão| Broker
        Broker -->|Consome Eventos| NotifSvc
        Worker -->|Salva Resultados| Storage[(CDN / Object Storage)]
    end
```

---

## Artefatos e Decisões Arquiteturais no Repositório

Além desta Wiki, a equipe mantém registros formais de decisão (ADRs) e diagramas C4 versionados no código-fonte:
- **ADR-001:** [Divisão dos Módulos e Microsserviços do Backend](file:///docs/adrs/ADR-001-arquitetura-inicial.md)
- **ADR-003:** [Configuração de Repositório Git e Ambiente de Desenvolvimento](file:///docs/adrs/ADR-003-estrutura-inicial.md)
- **C4 Model:** [Diagrama de Contexto N1](file:///docs/diagrams/c4-n1-contexto.md) | [Diagrama de Contêineres N2](file:///docs/diagrams/c4-n2-containers.md)

---
*Wiki mantida pelo Grupo 3 — Capstone DS5 / PT.CSSD-352.GA.T2.26.M2.*
