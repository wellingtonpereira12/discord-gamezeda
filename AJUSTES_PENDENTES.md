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

### [ ] 2. Isolamento Estrito de Canais entre Servidores
- **Problema:** Ao trocar entre servidores (ex: do servidor novo para o Gamezeda e vice-versa), os canais de um estão se misturando com os do outro.
- **Causa:** O estado local de canais e categorias no frontend não está sendo limpo e filtrado estritamente pelo `guild_id` do servidor selecionado ao trocar.
- **Critério de Aceite:** Cada servidor deve exibir única e exclusivamente os seus próprios canais. Ao alternar entre servidores, a lista deve recarregar limpa, sem qualquer canal vazando de outro servidor.

---

### [ ] 3. Mensagens Diretas (DMs Privadas 1 a 1)
- **Problema:** Ao abrir uma conversa privada, o chat continua exibindo `#geral`, a mensagem enviada não é entregue nem salva na DM, e ao recarregar ela some.
- **Causa:** O formulário de envio e a área de mensagens não estão alternando o contexto para o modo privado (`dmTarget`), caindo de volta no canal de texto geral.
- **Critério de Aceite:** Clicar em um amigo na lista de DMs (ou pelo botão `+` / botão direito) abre um chat privado exclusivo (`@NomeDoAmigo`), a mensagem é entregue em tempo real para a outra pessoa, gravada no banco de dados e restaurada ao reabrir a conversa.

---

### [ ] 4. Foto Personalizada do Usuário nas Mensagens
- **Problema:** Ao enviar mensagens, está aparecendo o avatar padrão em vez da foto personalizada que o usuário enviou no perfil.
- **Causa:** O payload da mensagem está enviando o avatar padrão em vez da URL real do avatar salva na sessão/perfil do usuário.
- **Critério de Aceite:** Mensagens enviadas no chat e nas DMs devem sempre exibir a foto/avatar personalizada do usuário.

---

### [ ] 5. Modal de Configurações do Servidor (Nome e Foto)
- **Problema:** Abrir as configurações do servidor e salvar alterações de nome e ícone.
- **Critério de Aceite:** Clicar em "Configurações do Servidor" no menu abre o modal na aba "Visão Geral". Alterar o nome e/ou enviar nova foto e clicar em salvar atualiza o servidor no MariaDB, na barra lateral e no cabeçalho em tempo real.

---

### [ ] 6. Sistema de Cargos (Roles) e Atribuição a Membros
- **Problema:** Criação e gerenciamento de cargos dentro das configurações do servidor.
- **Critério de Aceite:** Dentro do modal de configurações, na aba "Cargos", o usuário pode criar cargos com nome e cor personalizada. Na aba "Membros", pode atribuir ou remover esses cargos dos membros do servidor.

---

### [ ] 7. Exclusão de Servidor
- **Problema:** O dono do servidor precisa conseguir excluir um servidor que criou.
- **Critério de Aceite:** Adicionar opção de "Excluir Servidor" (em destaque vermelho com aviso de confirmação). Ao confirmar, o servidor, seus canais, mensagens e cargos são removidos do banco de dados, e os membros são redirecionados de volta ao servidor padrão.

