# Cluster Docker Swarm Local (Manager + Worker)

Este guia orienta na configuração e execução de um cluster Docker Swarm local utilizando Vagrant e VirtualBox, com custo zero e total replicabilidade para o projeto acadêmico.

## 1. Dependências e Links para Download

Antes de iniciar, certifique-se de possuir as seguintes ferramentas instaladas em sua máquina:

* [VirtualBox](https://www.virtualbox.org/) (Responsável pela virtualização das máquinas).
* [Vagrant](https://www.vagrantup.com/downloads) (Responsável pela automação e gerenciamento das VMs).

## 2. Como Rodar o Ambiente

1. Clone ou acesse a pasta do projeto onde se encontra o arquivo `Vagrantfile`.
2. Abra o terminal (PowerShell, CMD ou Bash) na pasta do projeto e execute o comando de inicialização:
```bash
   vagrant up
```
> O Vagrant irá baixar a imagem base do Ubuntu, criar duas máquinas virtuais (manager e worker), configurar o Docker e inicializar o cluster Docker Swarm de forma totalmente automatizada.

3. Para verificar o status das máquinas a qualquer momento, utilize:
```bash
   vagrant status
```

## 3. Como Acessar os Nós

O cluster é composto por dois nós independentes. Você pode acessá-los via linha de comando utilizando SSH:

- Acessar o Nó Manager (Líder do Cluster):
```bash
   vagrant ssh manager
```

    - Uma vez dentro do Manager, você pode verificar a saúde do cluster executando:
```bash
   docker node ls
```

- Acessar o Nó Worker:
```bash
   vagrant ssh worker
```

Para sair de qualquer um dos nós e retornar ao seu terminal local, basta digitar `exit`.