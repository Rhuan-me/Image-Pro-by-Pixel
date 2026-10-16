# Pipeline de Integração Contínua — PixPro

## Etapas do pipeline

### 1. Build

A etapa de build instala as dependências do API Gateway e do Auth Service utilizando npm. Também executa verificações de sintaxe nos arquivos JavaScript selecionados.

### 2. Test

A etapa de testes prepara um servidor Redis local para manter a compatibilidade com a configuração original do API Gateway. Em seguida, executa os testes automatizados existentes por meio do comando `npm test`.

Atualmente, os testes automatizados estão concentrados no API Gateway. O Auth Service ainda não possui um script de testes configurado.

## Execução

O pipeline é definido no arquivo `.gitlab-ci.yml` e pode ser executado pelo GitLab CI/CD após o envio das alterações ao repositório.

## Registro do resultado

**Status:** preencher após a execução no GitLab.

**Build:** preencher com o resultado real da etapa.

**Testes:** preencher com a quantidade de testes aprovados ou reprovados.

**Observações:** registrar eventuais falhas e as correções realizadas.

## Limitações atuais

O pipeline realiza validações básicas e testes automatizados do API Gateway. A implementação de testes automatizados para os demais serviços poderá ser incorporada posteriormente.
