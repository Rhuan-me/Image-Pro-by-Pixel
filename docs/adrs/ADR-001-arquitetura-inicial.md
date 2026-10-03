# ADR-001: Divisão dos Módulos e Microsserviços do Backend

- **Status:** Proposto
- **Data:** 2026-10-03
- **Decisores:** Equipe PixPro
- **Autor:** William Schreiner
- **Escopo:** Backend da plataforma PixPro
- **Relacionados:** Arquitetura geral, EDA, CQRS, Event Sourcing, Outbox Pattern, WebSocket/AsyncAPI

## 1. Contexto

A PixPro é uma plataforma distribuída de processamento inteligente de imagens. O sistema deve permitir upload individual ou em lote, seleção de modelos de IA e parâmetros de processamento tais como: melhorias automáticas, detecção de objetos ou aplicação de efeitos artísticos. Também deve permitir gerenciamento de projetos e imagens, acesso ao histórico, visualização/download/compartilhamento dos resultados e notificações em tempo real sobre o processamento.

O projeto define uma arquitetura baseada em microsserviços, com API Gateway, serviços especializados, broker de mensagens, WebSocket, CDN e bancos de dados separados por responsabilidade. A comunicação assíncrona deverá utilizar um broker de mensagens, com RabbitMQ ou Kafka como alternativas previstas, enquanto o canal de atualização em tempo real será realizado por WebSockets.

A necessidade arquitetural central é separar responsabilidades de negócio e infraestrutura para que operações de processamento intensivo de imagens não bloqueiem as requisições síncronas da aplicação. O processamento deve poder ser distribuído e escalado horizontalmente para atender múltiplos usuários simultaneamente.

O documento de requisitos também estabelece a utilização de arquitetura orientada a eventos (EDA), CQRS e Event Sourcing, além do Outbox Pattern no contexto do curso.

## 2. Problema

Uma arquitetura backend monolítica concentraria autenticação, gerenciamento de projetos, armazenamento e processamento de imagens no mesmo limite de execução. Isso criaria acoplamento entre operações transacionais e tarefas computacionalmente intensivas, dificultando:

- escalar processamento de imagens independentemente das demais funcionalidades;
- processar múltiplas imagens em paralelo;
- manter as requisições HTTP síncronas responsivas;
- acompanhar o estado de processamento de forma rastreável;
- comunicar alterações de estado em tempo real;
- isolar falhas de componentes especializados;
- evoluir modelos e capacidades de IA sem afetar diretamente os demais domínios.

Portanto, é necessário estabelecer uma primeira decomposição arquitetural do backend em módulos e microsserviços com responsabilidades claras e comunicação síncrona e assíncrona bem delimitadas.

## 3. Decisão

O backend será organizado em quatro domínios principais de negócio/infraestrutura:

1. **Gateway/API**
2. **Autenticação e Autorização**
3. **Gerenciamento de Projetos e Ativos**
4. **Processamento de Imagens**

Esses serviços serão complementados por capacidades de infraestrutura para armazenamento, mensageria, notificações em tempo real, persistência transacional e cache.

A divisão proposta é a seguinte.

### 3.1 API Gateway

O API Gateway será o ponto de entrada das requisições externas provenientes do frontend SPA.

Suas responsabilidades serão:

- receber requisições HTTP do frontend;
- encaminhar requisições para os microsserviços apropriados;
- centralizar preocupações transversais de entrada, como autenticação de requisições, autorização de acesso quando aplicável, controle de tráfego e observabilidade;
- ocultar a topologia interna dos microsserviços;
- fornecer uma superfície de API única para o frontend;
- encaminhar comandos de processamento para o domínio responsável sem executar o processamento de imagens.

O Gateway não deverá conter regras de negócio específicas de processamento. Seu papel é intermediar a comunicação entre cliente e backend.

A especificação do projeto prevê Node.js com Express/Axios ou .NET para essa camada. A escolha definitiva da tecnologia permanece uma decisão posterior da equipe perante uma _ADR_.

### 3.2 Serviço de Autenticação e Autorização

Este serviço será responsável pela identidade e pelo controle de acesso dos usuários registrados.

Responsabilidades:

- cadastro de usuários;
- autenticação;
- gerenciamento de credenciais;
- emissão/validação do mecanismo de autenticação adotado;
- autorização baseada no contexto do usuário;
- gerenciamento das operações relacionadas à conta.

O serviço deverá ser isolado dos dados de projetos e dos dados de processamento. Outros serviços não deverão assumir a responsabilidade pela autenticação diretamente.

O usuário anônimo poderá explorar a plataforma, mas não terá acesso ao processamento ou ao gerenciamento de projetos. O usuário registrado terá acesso aos recursos de processamento, projetos, resultados e histórico.

O papel de administrador é opcional conforme o documento do projeto e, caso implementado, deverá possuir permissões específicas para monitoramento e gerenciamento.

### 3.3 Serviço de Gerenciamento de Projetos e Ativos

Este serviço será responsável pela organização lógica dos recursos pertencentes ao usuário.

Responsabilidades:

- criação e gerenciamento de projetos;
- organização de imagens por pastas ou categorias;
- associação entre projetos e imagens;
- consulta de imagens e resultados;
- histórico de processamento;
- operações relacionadas à visualização dos resultados;
- controle dos metadados necessários para localizar os ativos armazenados.

O serviço deverá tratar a organização e o estado lógico dos ativos, não a execução dos modelos de IA.

O armazenamento físico dos arquivos deverá permanecer desacoplado desse serviço, utilizando a capacidade de armazenamento/CDN definida pela arquitetura. Dessa forma, o serviço mantém metadados e referências aos ativos, enquanto o conteúdo binário pode ser armazenado em uma infraestrutura especializada.

### 3.4 Serviço de Processamento de Imagens

Este será o principal domínio computacional da PixPro.

Sua responsabilidade é coordenar o processamento solicitado pelo usuário e executar, ou encaminhar para executores especializados, as operações de IA.

O domínio deverá contemplar três capacidades principais previstas no projeto:

- **melhoria de imagens**;
- **detecção de objetos**;
- **aplicação de efeitos artísticos**.

> A equipe preve que iniciamos com apenas 1 funcionabilidade para assim evoluirmos os modelos para outras features de maneira saudavel.

Também deverá permitir a seleção do modelo de IA e o ajuste dos parâmetros de processamento.

O processamento deverá ser orientado a tarefas assíncronas. Uma requisição de processamento não deverá permanecer bloqueada aguardando a execução completa de uma operação potencialmente pesada.

A responsabilidade do serviço inclui:

- validar a solicitação de processamento;
- registrar a intenção/comando de processamento;
- publicar ou encaminhar a tarefa para o mecanismo de mensageria;
- acompanhar o estado da tarefa;
- coordenar a execução das etapas necessárias;
- registrar sucesso ou falha;
- disponibilizar o resultado para as demais capacidades da plataforma;
- emitir eventos de domínio relacionados à evolução do processamento.

A arquitetura deverá permitir que os consumidores responsáveis pela execução do processamento sejam escalados horizontalmente.

## 4. Fluxo síncrono e assíncrono

A arquitetura adotará uma separação explícita entre operações síncronas e assíncronas.

### 4.1 Fluxo síncrono

Será utilizado quando o cliente necessita de uma resposta imediata para concluir uma operação de controle.

Exemplos:

- cadastro e autenticação;
- consulta de projetos;
- consulta de histórico;
- criação ou atualização de metadados;
- solicitação inicial de processamento;
- consultas de status;
- acesso a informações sobre resultados.

O fluxo conceitual será:

**Frontend > API Gateway > Microsserviço responsável > resposta HTTP**

A operação síncrona deverá ser curta e orientada a controle. O Gateway e os serviços não deverão manter uma requisição HTTP aberta durante uma execução pesada de IA.

### 4.2 Fluxo assíncrono

Será utilizado para operações de processamento que podem exigir tempo e recursos computacionais significativos.

Fluxo conceitual:

**Frontend > API Gateway > Serviço de Processamento > Broker > Consumidor/Worker de processamento > armazenamento do resultado > evento de conclusão**

O broker funciona como mecanismo de desacoplamento entre a solicitação e a execução. Isso permite distribuir tarefas, controlar concorrência e escalar consumidores de processamento conforme a demanda.

O projeto prevê RabbitMQ ou Kafka como alternativas de broker. A escolha definitiva deverá ser registrada em ADR próprio quando a equipe avaliar requisitos de ordenação, retenção, entrega, particionamento, operação e observabilidade. 

## 5. Orquestração do processamento

O processamento deverá ser tratado como uma operação composta por estados e eventos, permitindo rastreabilidade.

Um fluxo conceitual pode ser representado pelas seguintes etapas:

1. solicitação de processamento;
2. validação dos parâmetros;
3. registro da tarefa;
4. publicação da tarefa no broker;
5. consumo por um executor disponível;
6. execução do modelo selecionado;
7. armazenamento do resultado;
8. atualização do estado da tarefa;
9. publicação do evento correspondente;
10. notificação do usuário.

A arquitetura deve permitir que a execução seja distribuída sem exigir que o frontend conheça a topologia dos workers.

Para upload em lote, cada imagem poderá ser tratada como uma unidade de processamento independente, mantendo a possibilidade de acompanhar tanto o estado individual quanto o estado agregado da operação em lote.

## 6. Estados do processamento

O estado do processamento deverá ser persistido de maneira rastreável. Uma primeira máquina de estados conceitual é:

**RECEIVED > PROCESSING > COMPLETED**

Com estados de erro e recuperação associados, por exemplo:

**RECEIVED > PROCESSING > FAILED**

> Dificil de entender ? Acho que não

O modelo definitivo de estados deverá distinguir, quando necessário, etapas como validação, enfileiramento, execução, armazenamento e conclusão.

A mudança de estado deverá gerar eventos que possam ser consumidos pelo componente de notificações e por mecanismos de observabilidade.

## 7. Notificações em tempo real

O WebSocket será responsável pela comunicação de eventos de processamento com o frontend.

O WebSocket não executará o processamento. Ele funcionará como canal de distribuição das mudanças de estado relevantes.

Fluxo conceitual:

**Worker/Serviço de Processamento > evento de domínio > componente de notificações > WebSocket > frontend**

Exemplos de eventos comunicados ao usuário:

- processamento recebido;
- processamento iniciado;
- processamento concluído;
- processamento falhou;
- resultado disponível.

As APIs WebSocket deverão ser documentadas com AsyncAPI, conforme definido no projeto.

## 8. Mensageria e arquitetura orientada a eventos

A comunicação assíncrona será baseada em eventos e mensagens.

Os eventos devem representar fatos ocorridos no domínio, e não comandos HTTP disfarçados. Exemplos conceituais:

- processamento solicitado;
- processamento iniciado;
- imagem processada;
- processamento concluído;
- processamento falhou;
- resultado disponibilizado.

O objetivo é reduzir o acoplamento temporal entre os serviços. Um produtor não deverá depender da disponibilidade imediata de todos os consumidores para concluir uma operação assíncrona.

A adoção de EDA também permitirá que novas capacidades sejam conectadas posteriormente aos eventos existentes sem alterar diretamente o fluxo principal, desde que respeitados os contratos dos eventos.

## 9. Persistência e limites de dados

O projeto prevê PostgreSQL para dados transacionais e Redis para cache de resultados ou filas.

A persistência deverá respeitar os limites dos serviços. Cada microsserviço deverá ser responsável pelos dados pertencentes ao seu domínio, evitando uma base compartilhada como mecanismo de integração entre serviços.

O Serviço de Autenticação deverá manter os dados de identidade e credenciais.

O Serviço de Gerenciamento de Projetos deverá manter os dados de projetos, organização e referências aos ativos.

O Serviço de Processamento deverá manter os dados necessários para rastrear tarefas, parâmetros, estados e resultados do processamento.

O armazenamento de arquivos deverá permanecer em uma infraestrutura especializada de armazenamento/CDN, enquanto os serviços mantêm referências e metadados necessários para sua utilização.

## 10. CQRS e Event Sourcing

A arquitetura seguirá a orientação do projeto de utilizar CQRS e Event Sourcing para as operações de leitura e escrita.

CQRS deverá separar conceitualmente:

- **Commands:** operações que solicitam uma mudança de estado;
- **Queries:** operações destinadas à leitura de informações.

Essa separação é especialmente relevante no processamento de imagens, pois a solicitação de uma operação de IA e a consulta do seu progresso possuem necessidades distintas.

Event Sourcing poderá manter o histórico das mudanças relevantes do domínio de processamento, permitindo reconstruir o histórico de uma operação e aumentar a rastreabilidade.

A forma exata de aplicação de Event Sourcing deverá ser detalhada em uma decisão arquitetural específica, principalmente para definir quais agregados terão seu estado reconstruído por eventos e quais dados poderão permanecer em projeções materializadas.

## 11. Outbox Pattern

O Outbox Pattern deverá ser utilizado para reduzir o risco de inconsistência entre uma alteração persistida e a publicação de um evento.

Por exemplo, quando uma solicitação de processamento altera o estado de uma tarefa e também precisa publicar um evento, a mudança de estado e o registro do evento devem participar de uma operação transacional local.

Posteriormente, um mecanismo de publicação poderá encaminhar o evento registrado na Outbox ao broker.

Isso evita depender de uma sequência frágil do tipo:

**salvar no banco > publicar no broker**

na qual uma falha entre as duas operações poderia deixar o banco atualizado sem que os demais serviços recebessem o evento.

Link para ler mais sobre:[link](https://medium.com/tonaserasa/outbox-pattern-saga-transa%C3%A7%C3%B5es-distribu%C3%ADdas-com-microservices-c9c294b7a045)

## 12. Armazenamento e CDN

O conteúdo binário das imagens não deverá trafegar desnecessariamente entre todos os microsserviços.

A arquitetura deverá utilizar armazenamento especializado/CDN para os arquivos, conforme previsto no projeto.

Os microsserviços deverão trabalhar preferencialmente com:

- identificadores de arquivos;
- metadados;
- referências de armazenamento;
- estados de processamento;
- links protegidos quando o resultado precisar ser disponibilizado ao usuário.

O acesso aos resultados deverá utilizar mecanismos protegidos, conforme requisito do projeto para compartilhamento e download.

#### Observação

Um projeto utilizando CDN padrão, teria uma grande margem de implantação e ficaria inviavel para uma projeto academico. Portanto, o Storage é a origem dos arquivos.

A CDN funciona como uma camada de distribuição/cache próxima do usuário.

No projeto, podemos utilizar algum serviço cloud que combine essas capacidades, ou utilizar uma solução de armazenamento de objetos com uma camada de CDN na frente.

O PDF (Anunciado) não especifica qual provedor deve ser utilizado, apenas estabelece o requisito de armazenamento seguro em CDN. Portanto, escolher AWS, Azure, Cloudflare, Supabase etc. seria uma decisão tecnológica adicional, e não algo determinado pelo documento.

## 13. Isolamento e escalabilidade

O Serviço de Processamento deverá ser isolado dos serviços transacionais porque representa a maior concentração de carga computacional.

A separação permite:

- escalar workers independentemente;
- distribuir tarefas por meio do broker;
- evitar que processamento de IA consuma recursos destinados à autenticação ou gerenciamento;
- aplicar estratégias específicas de recuperação de falhas;
- substituir ou adicionar modelos de IA sem modificar o Gateway ou o domínio de projetos.

Os demais serviços também poderão ser escalados horizontalmente conforme suas necessidades, mas não devem herdar automaticamente o perfil de escala do processamento de imagens.

## 14. Falhas e resiliência

A comunicação assíncrona deverá considerar falhas de consumidores, indisponibilidade temporária e mensagens que não possam ser processadas.

O desenho inicial deverá considerar:

- reprocessamento de tarefas;
- identificação de falhas;
- estados de processamento recuperáveis;
- idempotência dos consumidores;
- mecanismos de observabilidade;
- isolamento de falhas entre microsserviços.

A definição detalhada de retry, dead-letter queue, políticas de timeout, circuit breaker e limites de concorrência deverá ser tratada durante o desenho de resiliência previsto para a etapa de testes distribuídos.

## 15. Limites de responsabilidade

| Componente | Responsabilidade principal | Não deve ser responsável por |
|---|---|---|
| API Gateway | Entrada, roteamento e preocupações transversais | Regras de negócio de IA |
| Autenticação | Identidade, autenticação e autorização | Processamento ou gerenciamento de projetos |
| Projetos e Ativos | Organização de projetos, imagens, metadados e histórico | Execução dos modelos de IA |
| Processamento | Orquestração e execução do processamento | Autenticação central dos usuários |
| Broker | Transporte assíncrono de mensagens/eventos | Regras de negócio |
| WebSocket/Notificações | Entrega de atualizações em tempo real | Execução do processamento |
| CDN/Storage | Armazenamento e distribuição de arquivos | Estado de negócio dos projetos |
| PostgreSQL | Persistência transacional dos domínios | Mensageria entre serviços |
| Redis | Cache e/ou suporte às necessidades de fila definidas | Fonte primária de todos os dados de negócio |

## 16. Consequências positivas

- Separação clara de responsabilidades entre domínios.
- Escalabilidade independente do processamento de imagens.
- Menor acoplamento entre operações transacionais e computacionais.
- Possibilidade de processamento paralelo de imagens.
- Melhor rastreabilidade das tarefas por meio de eventos e estados.
- Suporte natural às notificações em tempo real.
- Possibilidade de evolução independente dos componentes.
- Maior isolamento de falhas.
- Alinhamento com EDA, CQRS, Event Sourcing e Outbox Pattern definidos no projeto.

## 17. Consequências e trade-offs

- A arquitetura distribuída aumenta a complexidade operacional em comparação com um monólito.
- A comunicação assíncrona introduz consistência eventual em determinados fluxos.
- Debugging e observabilidade tornam-se mais complexos.
- Contratos de eventos precisam ser versionados e mantidos.
- O sistema passa a depender de infraestrutura adicional para broker, WebSocket, armazenamento e observabilidade.
- CQRS e Event Sourcing aumentam a complexidade de persistência e leitura quando comparados a um modelo CRUD tradicional.
- O processamento assíncrono exige mecanismos de idempotência, retry e recuperação.
- A divisão em microsserviços exige disciplina para evitar que os serviços passem a compartilhar responsabilidades ou dados diretamente.

## 18. Decisões ainda em aberto

Este ADR estabelece a divisão arquitetural, mas não encerra todas as decisões tecnológicas previstas no documento do projeto.

As seguintes decisões deverão ser formalizadas posteriormente:

1. **RabbitMQ ou Kafka:** seleção do broker definitivo.
2. **Node.js/Express ou .NET:** tecnologia definitiva do API Gateway.
3. Estratégia detalhada de Event Sourcing.
4. Modelo de armazenamento dos eventos e projeções CQRS.
5. Estratégia de execução dos diferentes modelos de IA.
6. Política de retry e Dead Letter Queue.
7. Estratégia de idempotência.
8. Contratos e versionamento dos eventos.
9. Estratégia de autenticação e autorização em detalhe.
10. Estratégia de observabilidade distribuída.
11. Políticas de escalabilidade automática dos workers.
12. Estratégia definitiva de armazenamento/CDN e geração de links protegidos.

## 19. Relação com os requisitos do projeto

A decomposição proposta atende diretamente às capacidades descritas no documento da PixPro:

- **Upload individual e em lote:** entrada pelo Gateway e gerenciamento dos ativos, com processamento desacoplado.
- **Seleção de modelos e parâmetros:** responsabilidade do domínio de processamento.
- **Melhoria de imagens, detecção de objetos e efeitos artísticos:** capacidades do Serviço de Processamento.
- **Notificações em tempo real:** eventos de processamento distribuídos pelo canal WebSocket.
- **Gerenciamento de projetos:** Serviço de Gerenciamento de Projetos e Ativos.
- **Histórico:** persistência e consulta do estado/histórico das operações de processamento.
- **Armazenamento seguro e compartilhamento:** infraestrutura de Storage/CDN e referências controladas pelo backend.
- **Escalabilidade:** processamento assíncrono via broker e escala horizontal dos consumidores.

O documento do projeto define explicitamente microsserviços especializados para autenticação/autorização, processamento de imagens, armazenamento em CDN e gestão de projetos, além de API Gateway, broker de mensagens, WebSocket, PostgreSQL e Redis. fileciteturn0file0L127-L145

## 20. Resultado arquitetural esperado

A primeira versão da arquitetura de backend fica organizada conceitualmente da seguinte forma:

**Cliente**
→ **API Gateway**
→ **Microsserviço de Autenticação**

ou

**Cliente**
→ **API Gateway**
→ **Microsserviço de Projetos e Ativos**

ou

**Cliente**
→ **API Gateway**
→ **Serviço de Processamento**
→ **Broker**
→ **Workers de processamento**
→ **Storage/CDN**

Enquanto as alterações de processamento seguem paralelamente:

**Processamento**
→ **Eventos**
→ **Notificações**
→ **WebSocket**
→ **Cliente**

Essa divisão estabelece os limites iniciais dos domínios backend e cria a base para detalhar posteriormente os contratos de API, eventos, tópicos/filas, estados de processamento, estratégias de resiliência e observabilidade.

## 21. Referência ao requisito da arquitetura

A decisão está fundamentada na arquitetura descrita no Projeto Final PixPro, que prevê uma SPA React/TypeScript, API Gateway, serviços especializados de autenticação/autorização, processamento, armazenamento e gestão de projetos, broker de mensagens, WebSocket, PostgreSQL e Redis. O documento também define EDA, CQRS, Event Sourcing e APIs WebSocket documentadas com AsyncAPI como padrões e práticas da solução. fileciteturn0file0L127-L145

Além disso, o cronograma do projeto estabelece a validação da arquitetura, eventos-chave e integração dos microsserviços nas semanas 5–6, seguida da validação do WebSocket, testes distribuídos, resiliência e recuperação de falhas. fileciteturn0file0L146-L155
