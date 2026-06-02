# Guia Prático — Claude Code no Agilize 2.0

> Para quem nunca usou o Claude Code antes. Leia do início ao fim uma vez — depois você vai usar naturalmente.

---

## O que é o Claude Code

É uma IA integrada ao seu terminal que entende o projeto inteiro. Diferente do ChatGPT ou do Claude no navegador, o Claude Code **lê os arquivos reais do seu computador**, escreve código, roda comandos e mantém contexto de uma conversa para outra.

Você conversa com ele em português, como se fosse um desenvolvedor sênior sentado ao seu lado.

---

## Como abrir

1. Abra o terminal (PowerShell ou o terminal do VS Code)
2. Navegue até a pasta do projeto:
   ```
   cd E:\Projetos\agilize
   ```
3. Digite:
   ```
   claude
   ```

Pronto. Você verá um prompt esperando sua mensagem.

---

## Como pedir coisas

Fale naturalmente. Não precisa de sintaxe especial para tarefas simples.

**Exemplos que funcionam:**

```
crie uma página de relatórios com gráfico de demandas por status
```
```
tem um erro 403 quando o gestor tenta enviar para STI, me ajuda a encontrar
```
```
o que ainda falta para terminar o frontend?
```
```
explica como funciona o fluxo de homologação
```

**Dica:** quanto mais contexto você der, melhor a resposta.

Ruim:
```
arruma o bug
```

Bom:
```
quando o analista STI clica em "Aprovar", aparece erro 500 no console.
O endpoint é POST /api/v1/demandas/:id/aprovar-sti
```

---

## Modos especiais — os Skills

Este projeto tem **skills** que ativam modos específicos de raciocínio. Use com `/nome-do-skill`.

| Comando | Quando usar |
|---------|-------------|
| `/engenheiro` | Revisão técnica, segurança, qualidade de código |
| `/fluxo` | Dúvidas sobre o workflow, transições de status, regras de negócio |
| `/analista` | "O que falta?", prioridades, estimativas, progresso |
| `/ux` | Criar componentes React, definir visual, seguir identidade TCE-CE |
| `/software-architect` | Decisões de arquitetura, organização de pastas, refatoração |

**Como usar:**

```
/analista o que falta para terminar a Fase 3?
```
```
/ux crie um componente de tabela paginada no padrão do projeto
```
```
/fluxo o gestor pode cancelar uma demanda em VALIDADA_GESTOR?
```

Você pode digitar o skill e depois continuar a conversa normalmente — o modo permanece ativo durante a sessão.

---

## Aprovando ações do Claude

O Claude vai pedir sua permissão antes de:
- Escrever ou modificar arquivos
- Rodar comandos no terminal
- Deletar algo

Você verá uma caixa pedindo aprovação. Leia o que ele quer fazer e pressione:
- **Y** (ou Enter) para aprovar
- **N** para negar

Se negar, o Claude para e pergunta como você quer proceder.

**Dica:** Se você confia no que o Claude está fazendo em uma sessão, pode digitar `/allowed-tools all` para aprovar tudo automaticamente naquela sessão.

---

## Como o Claude lembra de coisas

O Claude tem memória **dentro da sessão** (enquanto você está conversando) e **entre sessões** (salva em arquivos).

As memórias do projeto ficam em:
```
C:\Users\seu-usuario\.claude\projects\E--Projetos-agilize\memory\
```

Você pode pedir para ele lembrar algo:
```
lembra que o prazo para entrega da Fase 3 é 30/05
```

Ou verificar o que ele sabe:
```
/memory
```

---

## Comandos úteis

| Comando | O que faz |
|---------|-----------|
| `/memory` | Abre o arquivo de memória para editar |
| `/clear` | Limpa o histórico da conversa atual |
| `/help` | Lista todos os comandos disponíveis |
| `Ctrl+C` | Interrompe o Claude no meio de uma tarefa |
| `Esc` | Cancela a mensagem que está digitando |

---

## Dicas de uso no dia a dia

**1. Comece cada sessão com contexto**

Se ficou dias sem usar, dê um orientação rápida:
```
estamos trabalhando no Agilize 2.0, sistema de governança TI do TCE-CE.
Ontem criamos a AdminPage. Hoje quero criar a RelatoriosPage.
```

**2. Peça para ele verificar antes de fazer**

```
antes de criar, me diz o que você vai fazer e quais arquivos vai mexer
```

**3. Se algo der errado, explique o erro**

Copie o erro do terminal ou do navegador e cole na conversa:
```
deu esse erro: TypeError: Cannot read properties of undefined (reading 'nome')
  at DashboardPage.jsx:47
```

**4. Peça revisão antes de aceitar mudanças grandes**

```
revisa esse código antes de salvar — tem algum problema de segurança?
```

**5. Use o terminal diretamente quando precisar**

Dentro do Claude Code, você pode rodar comandos com `!`:
```
! npm run dev
! git status
! docker-compose up -d
```

---

## Fluxo típico de uma sessão de desenvolvimento

```
1. Abre o terminal e entra na pasta do projeto
2. Digite: claude
3. Oriente: "quero criar a RelatoriosPage com dados do backend"
4. O Claude vai:
   - Ler os arquivos relevantes
   - Propor o que vai fazer
   - Pedir aprovação para cada arquivo
5. Você aprova ou ajusta conforme necessário
6. Testa no navegador
7. Se tiver bug, relata e o Claude corrige
```

---

## O que NÃO fazer

- **Não copie código do Claude para outro editor** — deixe ele escrever diretamente nos arquivos
- **Não peça para ele "fazer tudo de uma vez"** — divida em partes menores
- **Não ignore os avisos de permissão** — leia o que ele quer fazer antes de aprovar
- **Não apague a pasta `.claude/`** — ela tem as memórias e configurações do projeto

---

## Estrutura do projeto para referência rápida

```
agilize/
  docs/              ← documentação (FLUXO.md é a fonte da verdade)
  design/            ← logos, fontes, identidade visual (não é código)
  .claude/
    skills/          ← modos especiais (/engenheiro, /ux, etc.)
  agilize-backend/   ← Node.js + PostgreSQL (porta 3000)
  agilize-frontend/  ← React + Vite (porta 5173)
```

**Para subir o sistema:**
```
# Terminal 1 — banco de dados
cd agilize-backend && docker-compose up -d

# Terminal 2 — backend
cd agilize-backend && npm run dev

# Terminal 3 — frontend
cd agilize-frontend && npm run dev

# Acesse: http://localhost:5173
# Login admin: admin@agilize.com.br / senha123
```

---

## Usuários de teste

| Email | Senha | Perfil |
|-------|-------|--------|
| jorge@agilize.com.br | senha123 | Solicitante |
| maria@agilize.com.br | senha123 | Gestor de Unidade |
| joao@agilize.com.br | senha123 | Analista STI |
| admin@agilize.com.br | senha123 | Administrador |

---

*Dúvidas ou problemas com o Claude Code: https://github.com/anthropics/claude-code/issues*
