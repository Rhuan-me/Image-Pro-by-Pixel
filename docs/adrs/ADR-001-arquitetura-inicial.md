# ADR-001 — Arquitetura Inicial do PixPro

* **Status:** Proposta inicial
* **Data:** 02/10/2026

## Contexto

O PixPro é um projeto que tem como objetivo oferecer funcionalidades de processamento de imagens, incluindo melhoria de qualidade, detecção de objetos e aplicação de efeitos em tempo real.

No início do projeto, é necessário definir uma visão arquitetônica inicial para orientar o desenvolvimento e facilitar as decisões futuras do grupo.

## Decisões iniciais

A arquitetura será documentada inicialmente por meio dos diagramas C4 N1 (Contexto) e C4 N2 (Contêineres).

A proposta considera os seguintes componentes:

* API / Backend;
* Broker de mensagens;
* Serviços de processamento de imagens;
* Banco de dados;
* Cache;
* Canal de notificações em tempo real.

## Pontos pendentes

As seguintes decisões ainda precisam ser discutidas e aprovadas pelo grupo:

* Tecnologia utilizada no backend;
* Tecnologia do broker de mensagens;
* Banco de dados e solução de cache;
* Organização dos microsserviços;
* Comunicação em tempo real;
* Armazenamento das imagens.

## Consequências

Esta documentação oferece uma base inicial para o planejamento do PixPro. Como as tecnologias e a arquitetura definitiva ainda não foram aprovadas, os diagramas e as decisões poderão ser atualizados conforme o projeto evoluir.
