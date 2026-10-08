# 📋 Ajustes Pendentes - FakeDC (Fase 5)

Este documento lista todos os ajustes identificados durante os testes práticos.  
Vamos implementar e validar **um a um**, testando cada ponto antes de avançar para o próximo.

---

## 📌 Lista de Tarefas (Ordem de Execução)

### [x] 1. Menu Dropdown do Servidor
- **Problema:** Clicar no cabeçalho do servidor (`.server-header` / setinha) não abre o menu dropdown estilo Discord.
- **Status:** ✅ Concluído e validado pelo usuário nos testes práticos.
- **Critério de Aceite:** Clicar no cabeçalho do servidor abre e fecha o menu com as opções: *Convidar Amigos*, *Configurações do Servidor*, *Criar Canal* e *Criar Categoria*.

---

### [x] 2. Isolamento Estrito de Canais entre Servidores e Roteamento
- **Problema:** Ao trocar entre servidores os canais estavam misturando e mensagens enviadas estavam caindo no `#geral`.
- **Status:** ✅ Concluído e validado pelo usuário nos testes práticos (canais isolados e mensagens roteadas para o canal correto).
- **Critério de Aceite:** Cada servidor exibe seus próprios canais e as mensagens são enviadas e armazenadas no canal correto.

---

### [x] 3. Mensagens Diretas (DMs Privadas 1 a 1)
- **Problema:** Ao abrir uma conversa privada, o chat continua exibindo `#geral`, a mensagem enviada não é entregue nem salva na DM, e ao recarregar ela some.
- **Status:** ✅ Concluído e validado pelo usuário nos testes práticos (chat privado isolado `@NomeDoAmigo`, status de presença, entrega em tempo real, anexos/Ctrl+V e histórico no MariaDB).
- **Critério de Aceite:** Clicar em um amigo na lista de DMs (ou pelo botão `+` / botão direito) abre um chat privado exclusivo (`@NomeDoAmigo`), a mensagem é entregue em tempo real para a outra pessoa, gravada no banco de dados e restaurada ao reabrir a conversa.

---

### [x] 4. Foto Personalizada do Usuário nas Mensagens
- **Problema:** Ao enviar mensagens, está aparecendo o avatar padrão em vez da foto personalizada que o usuário enviou no perfil.
- **Status:** ✅ Concluído e validado pelo usuário nos testes práticos (avatar real sincronizado na sessão, persistido e exibido tanto nos canais quanto nas DMs).
- **Critério de Aceite:** Mensagens enviadas no chat e nas DMs devem sempre exibir a foto/avatar personalizada do usuário.

---

### [x] 5. Modal de Configurações do Servidor (Nome e Foto)
- **Problema:** Abrir as configurações do servidor e salvar alterações de nome e ícone.
- **Status:** ✅ Concluído e validado pelo usuário nos testes práticos.
- **Critério de Aceite:** Clicar em "Configurações do Servidor" no menu abre o modal na aba "Visão Geral". Alterar o nome e/ou enviar nova foto e clicar em salvar atualiza o servidor no MariaDB, na barra lateral e no cabeçalho em tempo real.

---

### [x] 6. Sistema de Cargos (Roles) e Atribuição a Membros
- **Problema:** Criação e gerenciamento de cargos dentro das configurações do servidor.
- **Status:** ✅ Concluído e validado pelo usuário nos testes práticos (criação de cargos, atribuição/remoção para membros cadastrados e cores de cargo aplicadas no chat).
- **Critério de Aceite:** Dentro do modal de configurações, na aba "Cargos", o usuário pode criar cargos com nome e cor personalizada. Na aba "Membros", pode atribuir ou remover esses cargos dos membros do servidor.

---

### [x] 7. Exclusão de Servidor e Canais
- **Problema:** O dono do servidor precisa conseguir excluir canais e o servidor que criou.
- **Status:** ✅ Concluído e validado pelo usuário nos testes práticos.
- **Critério de Aceite:** Exclusão de canais via lixeira / clique direito e exclusão de servidor via menu / configurações com limpeza em cascata e redirecionamento.


