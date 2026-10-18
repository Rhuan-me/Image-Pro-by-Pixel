# Automação Blue-Green com Ansible e Docker Swarm

Este diretório contém os playbooks do Ansible para gerenciar a implantação e o chaveamento de tráfego do padrão **Blue-Green Deployment** no cluster Docker Swarm local provisionado pelo Vagrant.

---

## 📁 Estrutura de Arquivos

* **`ansible.cfg`**: Configuração local do Ansible (desativa verificação estrita de chaves de host e warnings).
* **`inventory.ini`**: Inventário com os nós `manager` (`192.168.56.10`) e `worker` (`192.168.56.11`).
* **`templates/nginx.conf.j2`**: Template dinâmico Jinja2 do Nginx para apontar o tráfego upstream para `web-blue` ou `web-green`.
* **`deploy-bluegreen.yml`**: Playbook que cria a rede overlay `app-net`, implanta as duas versões (`web-blue` e `web-green`) e configura o proxy reverso apontando para a versão inicial (Blue).
* **`switch-traffic.yml`**: Playbook para chaveamento manual e instantâneo de tráfego entre Blue e Green com zero downtime.

---

## 🚀 Como Executar no Nó Manager

Como a pasta local `infrastructure/vagrant/` é compartilhada automaticamente com o nó `manager` em `/vagrant/`, você não precisa instalar o Ansible na sua máquina host (Windows/Mac). O Ansible roda diretamente dentro da VM Linux!

### 1. Acessar o nó Manager
```bash
cd infrastructure/vagrant
vagrant ssh manager
```

### 2. Acessar o diretório do Ansible
```bash
cd /vagrant/ansible
```

### 3. Fazer o Deploy Inicial (Versão Blue Ativa)
```bash
ansible-playbook -i inventory.ini deploy-bluegreen.yml
```
* **O que acontece:**
  - Cria a rede overlay `app-net`.
  - Sobe 2 réplicas do `web-blue` (Versão 1.0 - BLUE).
  - Sobe 2 réplicas do `web-green` (Versão 2.0 - GREEN).
  - Cria o serviço `reverse-proxy` na porta 80 apontando para o Blue.
* **Validação:**
  ```bash
  curl http://192.168.56.10
  # Resposta: <h1>Versão 1.0 - BLUE</h1>
  ```

---

## 🔄 Como Fazer o Redirecionamento Manual de Tráfego

Para alternar para a versão **Green** (ou fazer Rollback para **Blue**), execute o playbook `switch-traffic.yml` passando a variável `version`:

### Virar a chave para GREEN:
```bash
ansible-playbook -i inventory.ini switch-traffic.yml -e version=green
```
* **Validação:**
  ```bash
  curl http://192.168.56.10
  # Resposta: <h1>Versão 2.0 - GREEN</h1>
  ```

### Fazer Rollback para BLUE:
```bash
ansible-playbook -i inventory.ini switch-traffic.yml -e version=blue
```
* **Validação:**
  ```bash
  curl http://192.168.56.10
  # Resposta: <h1>Versão 1.0 - BLUE</h1>
  ```

---

## 💥 Simulação de Falha no Worker (Para o Relatório da Atividade 1)

1. **Verificar a distribuição das réplicas:**
   ```bash
   docker service ps web-blue
   docker service ps web-green
   ```
   *(Observe que as réplicas estão distribuídas entre os nós `manager` e `worker`)*.

2. **Derrubar o nó Worker (em outro terminal no seu host):**
   ```bash
   cd infrastructure/vagrant
   vagrant halt worker
   ```

3. **Verificar a auto-recuperação pelo Swarm no nó Manager:**
   ```bash
   docker node ls
   docker service ps web-blue
   ```
   *(O nó `worker` aparecerá como `Down` e o Docker Swarm recriará automaticamente as réplicas ausentes no nó `manager` para manter o número desejado de instâncias)*.
