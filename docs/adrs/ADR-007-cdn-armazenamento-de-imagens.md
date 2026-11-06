# ADR-007: CDN para o Armazenamento De Imagens

* **Status:** Aceito
* **Data:** Novembro de 2026
* **Autores:** Equipe de Engenharia PixPro

---

## 1. Contexto

O projeto final da PixPro exige o armazenamento de arquivos (mídias brutas e processadas) de alta frequência com separação lógica, garantindo desacoplamento e compatibilidade com a API padrão AWS S3.
Anteriormente, utilizávamos o MinIO; contudo, devido a alterações na distribuição pública de suas imagens de container no Docker Hub, tornou-se necessária a adoção de uma alternativa open-source estável e 100% compatível com a API S3 para rodar inteiramente no ambiente local de desenvolvimento (Docker).
Decisão

Adotamos o SeaweedFS rodando localmente via Docker (chrislusf/seaweedfs) para atuar como o nosso serviço de storage/CDN local.

- 1.1 Integração: Utiliza o SDK oficial AWS S3 (@aws-sdk/client-s3) com forcePathStyle: true nos microsserviços Node.js (image-processing-service e ai-worker).

- 1.2 Automação: O bucket padrão (pixpro-storage) é provisionado de forma automatizada no ambiente de infraestrutura através de um container de inicialização (storage-init).

- 1.3 Isolamento de Responsabilidade: O Storage atua apenas como repositório de arquivos. A segurança e o relacionamento com os projetos e usuários são estritamente controlados pelo Banco de Dados relacional (tabelas de projetos e imagens) e pelas validações de backend.

## 2. Consequências

- Positivas:

Contorna totalmente as restrições de distribuição de imagens de container de terceiros, garantindo gratuidade e gratificação do ambiente de homologação local.

Compatibilidade total com o código S3 existente, exigindo alteração apenas de endpoints e não da lógica de negócio.

Alta performance e baixo consumo de memória, ideais para o fluxo de workers assíncronos (sharp).

- Negativas / Riscos Mitigados:

Por ser uma ferramenta local, não há replicação em nuvem externa (o que é intencional e atende perfeitamente ao escopo de desenvolvimento do Capstone).