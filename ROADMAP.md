# 🚀 Roadmap FakeDC (Gamezeda) — Recursos Discord

Este documento reúne todas as funcionalidades que ainda faltam em relação ao Discord oficial, organizadas em fases para implementação gradual.

---

## 🟢 O que já temos implementado (Concluído)

- [x] **Voz WebRTC HD:** Canais de voz dinâmicos, supressão neural de ruído RNNoise com ajuste em tempo real.
- [x] **Transmissão de Tela HD:** 1080p 60 FPS com áudio do sistema (loopback), chaveador de transmissões múltiplas.
- [x] **Watch Party Integrada:** Reprodução de vídeos do YouTube sincronizada em tempo real para todos na chamada.
- [x] **Bot de Música Alfredo:** Comandos de chat (`!play`, `!skip`, etc.) e mini player flutuante sincronizado.
- [x] **Soundboard Nativo:** Efeitos sonoros rápidos com upload de áudios customizados.
- [x] **App Desktop Electron:** Instalador oficial Windows, auto-update transparente e captura de janelas.
- [x] **Detecção de Jogos (Rich Presence):** Detecção 100% automática de jogos no Windows mostrando o jogo e há quanto tempo está jogando.
- [x] **Chat com Imagens e Links:** Colar print direto com Ctrl+V, seletor de emojis, auto-link clicável e seleção/cópia de textos nativa.

---

## 🎯 Fases de Implementação

### 📌 Fase 1: Interações Sociais no Chat (Maior Impacto no Dia a Dia) — Concluído ✅
- [x] **Reações com Emojis nas Mensagens:**
  - Botão de adicionar reação ao passar o mouse na mensagem.
  - Grade de emojis para reagir.
  - Contador de reações com visual estilo Discord (clique para somar ou remover seu voto).
- [x] **Responder Mensagem (Reply / Citação):**
  - Botão "Responder" na mensagem.
  - Caixa de citação acima do campo de digitação com opção de mencionar o autor.
  - Linhazinha curva estilo Discord conectando a resposta à mensagem original.
  - Clique na citação leva com scroll suave até a mensagem original com highlight.
- [x] **Editar e Excluir Mensagens:**
  - Botões de ação rápida ao passar o mouse na mensagem.
  - Edição in-place com cancelamento no Esc e salvar no Enter.
  - Indicador `(editado)` ao lado da hora da mensagem.
  - Modal com confirmação para exclusão de mensagem própria.
- [x] **Menções com Autocomplete (`@usuário` e `@everyone`):**
  - Digitar `@` abre lista suspensa com foto e nome dos membros online e menções especiais.
  - Destaque com fundo amarelo suave nas mensagens onde você foi mencionado.
  - Alerta sonoro cristalino diferenciado para menções diretas (`playMention()`).
- [x] **Mensagens Fixadas (Pins 📌):**
  - Botão de fixar/desafixar mensagem.
  - Ícone de alfinete no cabeçalho do canal abrindo popover de mensagens fixadas importantes com botão para pular direto para a mensagem.

---

### 🎨 Fase 2: Perfis de Usuário & Customização Visual — Concluído ✅
- [x] **Card / Popout de Perfil Completo:**
  - Ao clicar no avatar ou nome de alguém (chat, barra lateral ou painel de usuário), abre o card estilo Discord:
    - Banner colorido de topo (customizável).
    - Avatar em alta resolução com indicador de status (Online, Ausente, DND, Invisível).
    - Tag do jogo em execução com Rich Presence e tempo decorrido dinâmico.
    - Seção "Sobre Mim" / Bio de texto livre.
    - Botão de ação rápida ("Mencionar" ou "Editar Perfil").
- [x] **Upload de Avatar Próprio:**
  - Envio de foto do PC (JPG, PNG, GIF, WebP máx. 5MB) com armazenamento seguro em disco e preview em tempo real.
- [x] **Status de Presença Customizado:**
  - Seletor de status:
    - 🟢 Online
    - 🟡 Ausente (Idle)
    - 🔴 Não Perturbar (DND)
    - ⚪ Invisível
  - Frase personalizada de status sincronizada em tempo real (ex: *"Almoçando"*, *"Jogando novidades"*).

---

### 🎙️ Fase 3: Recursos de Voz, Áudio & Vídeo — Concluído ✅
- [x] **Push-to-Talk (Aperte para Falar):**
  - Alternância rápida entre "Atividade de Voz" e "Aperte para Falar" na aba de configurações.
  - Gravação de tecla de atalho personalizada persistida no navegador (padrão: `CapsLock`).
  - Sons de bipe sintetizados de ativação (`playPttOn()`) e desativação (`playPttOff()`).
- [x] **Atalhos Globais de Teclado no Electron:**
  - Atalhos globais no cliente Desktop (`CommandOrControl+Shift+M` para microfone e `CommandOrControl+Shift+D` para áudio) funcionando em segundo plano mesmo dentro de jogos em tela cheia.
- [x] **Picture-in-Picture (PiP / Mini Player Flutuante de Stream):**
  - Ao mudar para canais de texto durante uma transmissão ativa, mini player flutuante no canto inferior direito mantém a live visível com controles rápidos e botão de restaurar tela cheia.
- [x] **Modo Grade / Galeria (Grid View no Palco de Vídeo):**
  - Botão de alternância na barra do palco para visualização em grade equilibrada de múltiplos compartilhamentos e câmeras simultâneas.

---

### 🔔 Fase 4: Notificações & Desktop — Concluído ✅
- [x] **Notificações Nativas do Windows:**
  - Balão/Toast nativo do Windows avisando sobre novas mensagens quando o aplicativo estiver minimizado ou em segundo plano.
  - Clique na notificação restaura, foca a janela e abre diretamente o canal correspondente.
  - Respeito ao status 🔴 *Não Perturbar (DND)* silenciando toasts nativos e sons de mensagens/menções.
- [x] **Contador de Mensagens Não Lidas & Indicadores de Barra de Tarefas:**
  - Bolinha vermelha estilo Discord com contador numérico nas abas dos canais de texto da barra lateral.
  - Pílula branca indicadora na lateral esquerda do canal com novas mensagens.
  - Piscar o ícone na barra de tarefas do Windows (`flashFrame`) quando houver mensagens pendentes.
  - Contador dinâmico no título da janela e aba do navegador `(N) FakeDC`.

---

### 🛡️ Fase 5: Multi-Servidores, Mensagens Diretas (DMs) & Configurações de Servidor — Em Conclusão 🚀
- [x] **Multi-Servidores (Guilds / Servidores Independentes):**
  - Barra lateral de servidores estilo Discord oficial com ícones circulares e animação de foco.
  - Criação de servidores personalizados com upload de foto/ícone e nome próprio.
  - Sistema de convites por código e entrada via código de convite.
  - Isolamento completo de canais, categorias e membros entre servidores com MariaDB.
- [x] **Mensagens Diretas (DMs Privadas 1 a 1):**
  - Aba "Home" dedicada no topo da barra de servidores alternando para o painel de Mensagens Diretas.
  - Lista de conversas privadas recentes com indicador online/offline e contador de não lidas.
  - Início rápido de DM privada via clique com botão direito ou clique no perfil de qualquer membro.
  - Histórico 1 a 1 persistido no MariaDB.
- [x] **Indicador de Digitação em Tempo Real (Typing Indicator):**
  - Notificação sutil `"[Nome] está digitando..."` nos canais e nas DMs com debounce automático de 3s.
- [x] **Menu & Configurações do Servidor:**
  - Dropdown no cabeçalho do servidor ("Convidar Pessoas" e "Configurações do Servidor").
  - Modal de configurações com aba Visão Geral (trocar nome e foto do servidor).
- [x] **Cargos e Cores (Roles):**
  - Criação de cargos no servidor (ex: *Admin*, *VIP*, *Moderador*) com cores personalizadas.
  - Atribuição e remoção de cargos para membros do servidor.
  - Destaque com cores dos cargos no chat e na lista de membros.

---

### 🧹 Fase 6: Arquitetura, Modularização & Qualidade de Código (Pós-Funcionalidades)
- [ ] **Organização de Scripts de Automação:**
  - Mover scripts soltos da raiz (`deploy_docker.*`, `check_*`) para diretórios organizados `scripts/deploy/` e `scripts/diagnostics/`.
  - Atualizar referências no `.gitignore` e documentação.
- [ ] **Modularização Progressiva do Frontend:**
  - Segregação de módulos ES dedicados em `public/js/modules/`:
    - `guilds.js`: Gerenciamento e alternância de servidores.
    - `directMessages.js`: Histórico e mensagens 1 a 1.
    - `serverSettings.js`: Cargos, permissões e customização de servidores.
    - `channels.js`: Controle de categorias e canais de texto/voz.

---

## 🛠️ Ordem de Execução e Status Atual

1. **Reações com Emojis nas mensagens** (fácil de usar, divertido para o grupo) — ✅ Concluído
2. **Responder Mensagem (Reply)** (organiza as conversas) — ✅ Concluído
3. **Card de Perfil com Upload de Foto Própria & Presença** (identidade visual) — ✅ Concluído
4. **Push-to-Talk (PTT), PiP e Modo Grade** (voz e vídeo) — ✅ Concluído
5. **Notificações Nativas e Badges de Mensagens Não Lidas** (desktop) — ✅ Concluído
6. **Multi-Servidores, DMs, Typing Indicator, Configurações de Servidor e Cargos (Roles)** — ✅ Concluído (v1.3.0)
7. **Modularização e Faxina de Scripts** (manutenibilidade de código) — 📋 Na Lista

