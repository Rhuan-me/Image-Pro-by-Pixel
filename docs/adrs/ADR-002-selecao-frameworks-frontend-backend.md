# ADR-002: Seleção dos frameworks Frontend e Backend

- **Status:** Proposto
- **Data:** 2026-10-08
- **Decisores:** Equipe PixPro
- **Autor:** William Schreiner
- **Escopo:** Estrutura do PixPro
- **Relacionados:** Frameworks, Requisitos funcionais e não funcionais


## 1. Objetivo

Esta Spike tem como objetivo avaliar alternativas de frameworks para o desenvolvimento do PixPro, fundamentando a escolha tecnológica por meio de critérios ponderados e garantindo o alinhamento com a arquitetura distribuída de microsserviços.


## 2. Critérios de Avaliação e Pesos

A avaliação utilizou uma escala de 1 a 5 (1 = Muito baixo, 5 = Muito bom) combinada com pesos percentuais para o cálculo da Média Ponderada:

- Desempenho (20%)
- Escalabilidade (25%)
- Curva de Aprendizado (20%)
- Comunidade e Ecossistema (20%)
- Integração com a Arquitetura (15%)

## 3. Matriz de Decisão: Frontend

**Resumo Comparativo:**

| Posição | Framework | Desempenho (20%) | Escalabilidade (25%) | Aprendizado (20%) | Comunidade (20%) | Integração (15%) | Nota Final Ponderada |
| ------- | --------- | ---------------: | -------------------: | ----------------: | ---------------: | ---------------: | -------------------: |
| 1       | React     |              4,0 |                  4,5 |               5,0 |              5,0 |              4,5 |                 4,63 |
| 2       | Angular   |              4,5 |                  5,0 |               3,0 |              4,5 |              4,5 |                 4,33 |
| 3       | Vue.js    |              4,5 |                  4,0 |               4,5 |              4,0 |              4,5 |                 4,28 |

### Justificativa da Seleção (Frontend)

O React obteve a maior pontuação (4,63), destacando-se pela excelente combinação de ecossistema robusto, curva de aprendizado acessível para o time e forte flexibilidade na estruturação de componentes reutilizáveis para a SPA e consumo dinâmico de WebSockets.

## 4. Matriz de Decisão: Backend

**Resumo Comparativo**

| Posição | Framework       | Desempenho (20%) | Escalabilidade (25%) | Aprendizado (20%) | Comunidade (20%) | Integração (15%) | Nota Final Ponderada |
| ------- | --------------- | ---------------: | -------------------: | ----------------: | ---------------: | ---------------: | -------------------: |
| 1       | Express.js/Node |              4,5 |                  4,5 |               5,0 |              5,0 |              5,0 |                 4,75 |
| 2       | Spring Boot     |              4,5 |                  5,0 |               3,0 |              5,0 |              5,0 |                 4,65 |
| 3       | ASP.NET Core    |              5,0 |                  5,0 |               3,5 |              4,5 |              5,0 |                 4,63 |

### Justificativa da Seleção (Backend)

O Express.js liderou a pontuação (4,75) devido à sua alta flexibilidade no desenvolvimento ágil de microsserviços, excelente integração com o ecossistema Node.js (essencial para manipulação assíncrona, bibliotecas de WebSocket e mensageria) e curva de aprendizado suave para a equipe, atendendo com agilidade aos checkpoints do Capstone.
