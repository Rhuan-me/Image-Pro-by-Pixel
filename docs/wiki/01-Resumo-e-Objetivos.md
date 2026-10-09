# 1. Visão Geral, Problema e Objetivos do Backend

---

## 1.1 Visão Geral do PixPro

O **PixPro** é uma plataforma distribuída e inteligente de processamento de imagens projetada para automatizar o fluxo de trabalho visual de criadores de conteúdo, designers, pesquisadores e empresas que lidam com grandes volumes de mídia digital.

A solução combina modelos avançados de Inteligência Artificial para:
1. **Melhorias automáticas:** Otimização de parâmetros visuais como exposição, saturação, nitidez e redução de ruído.
2. **Detecção e classificação de objetos:** Identificação de elementos visuais em cenas complexas.
3. **Efeitos artísticos estilizados:** Transformação estética de imagens baseada em estilos visuais predefinidos.

A interação do usuário ocorre via aplicação Web (Single Page Application - SPA em React/TypeScript), integrada a um backend robusto construído sobre princípios de **sistemas distribuídos, alta concorrência e desacoplamento assíncrono**.

---

## 1.2 Análise do Problema no Enfoque Tradicional

O crescimento exponencial na produção e consumo de imagens digitais impõe severos gargalos aos sistemas centralizados e monólitos convencionais:

* **Processamento manual lento e síncrono:** Tarefas de inferência de IA ou transformação pesada de imagens bloqueiam a thread de execução do servidor, esgotando pools de conexão HTTP e gerando timeouts frequentes no cliente (`HTTP 504 Gateway Timeout`).
* **Incapacidade de suportar alta concorrência:** Monólitos tradicionais não conseguem isolar cargas computacionalmente intensivas de operações transacionais leves (como autenticação ou listagem de pastas), degradando o sistema como um todo quando múltiplos usuários executam uploads concorrentes.
* **Gargalo no processamento em lote (Batch Processing):** Ao submeter centenas de imagens simultaneamente, soluções locais ou monólitos sequenciais geram saturação de memória RAM e CPU, impedindo a rastreabilidade individualizada do ciclo de vida de cada arquivo.
* **Ausência de feedback em tempo real (Caixa Preta):** O usuário submete uma imagem e não possui visibilidade sobre a fila, o progresso da etapa de inferência ou eventuais falhas parciais.
* **Sobrecarga de tráfego de dados binários:** Fazer tráfego ineficiente de imagens pesadas através de múltiplos microsserviços intermediários eleva o consumo de largura de banda interna e atrasa a resposta da API.

---

## 1.3 Objetivos Estratégicos do Backend Distribuído

Para sanar as limitações descritas, o backend do PixPro foi projetado com os seguintes objetivos arquiteturais e contratuais:

### 1. Suporte a Alta Concorrência de Requisições
- **Isolamento de Domínios:** Segregação estrita entre o plano de controle (APIs síncronas de autenticação, organização de projetos e metadados) e o plano de dados computacional (inferência de IA).
- **Tratamento Não-Bloqueante:** Requisições de processamento retornam imediatamente ao cliente um identificador de tarefa (`Job ID / Task ID`) com status `HTTP 202 Accepted`, delegando o trabalho pesado à fila assíncrona.

### 2. Escalabilidade Horizontal e Desacoplamento via Mensageria
- Adoção de um **Message Broker** robusto (RabbitMQ / Kafka) como espinha dorsal da orquestração assíncrona.
- Os **Workers de Processamento** podem ser escalados horizontalmente de forma elástica, aumentando o número de réplicas de nós computacionais conforme o tamanho da fila de processamento sem afetar a disponibilidade da API pública.

### 3. Processamento em Lote (Batch Processing) Resiliente e Granular
- Decomposição de requisições de lotes em mensagens atômicas independentes no broker.
- Rastreamento granular de cada imagem individual do lote por meio de sua própria máquina de estados (`RECEIVED > QUEUED > PROCESSING > COMPLETED / FAILED`), possibilitando reprocessamentos pontuais e relatórios de progresso parciais sem perda do lote como um todo.

### 4. Transparência e Notificações em Tempo Real
- Fornecimento de canal bidirecional persistente via **WebSockets**, enviando eventos instantâneos de mudança de estado a cada etapa do processamento para a interface do usuário.
- Especificação formal dos contratos de eventos e canais utilizando o padrão **AsyncAPI**.

### 5. Armazenamento e Distribuição Desacoplados (CDN / Object Storage)
- Os binários das imagens são transferidos diretamente para armazenamento de objetos seguro (Storage/CDN), trafegando pelo backend apenas referências, URLs assinadas e metadados estruturados.
- Compartilhamento e download via links temporários protegidos, mitigando acessos não autorizados.

---

## 1.4 Resumo das Metas por Checkpoints do Projeto

Em alinhamento ao cronograma oficial do Capstone, o backend distribuído deverá cumprir os seguintes marcos contratuais de entrega:

| Semanas | Foco Principal | Entregáveis de Backend |
| :---: | :--- | :--- |
| **Semanas 1–3** | Fundação e Ambiente | Estrutura GitFlow, Docker Compose (PostgreSQL, Redis, RabbitMQ), ADRs e C4. |
| **Semanas 4–6** | Event-Driven & CQRS | Integração de microsserviços via broker de mensagens, Outbox Pattern e segregação CQRS. |
| **Semanas 7–8** | WebSocket & AsyncAPI | Canal WebSocket em tempo real documentado via AsyncAPI, persistência de estados. |
| **Semana 9** | Testes e Resiliência | Simulação de falhas distribuídas, Dead Letter Queues (DLQ), idempotência e observabilidade. |
| **Semana 10** | Entrega Final | Demonstração ponta a ponta e apresentação executiva dos artefatos. |
