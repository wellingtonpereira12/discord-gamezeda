# Discord Clone - Jogos Bolados / Gamezeda

Site baseado no Discord com chat em tempo real, canais de voz e **compartilhamento de tela direto pelo navegador** (WebRTC), hospedado em Docker.

---

## 🌐 Link de Acesso

Acesse direto pelo navegador sem precisar instalar nada:
👉 **https://jogosbolados.duckdns.org**

- **Sem cadastro ou senha**: basta digitar seu nome/apelido e entrar direto no grupo **Gamezeda**!
- **Compartilhamento de tela**: entre no canal `🔊 Gamezeda` e clique em **Compartilhar Tela** para transmitir sua tela/jogo com áudio para quem estiver conectado.

---

## 🖥️ Como Conectar via Terminal à VPS (SSH)

Abra o **PowerShell**, **Prompt de Comando (CMD)** ou **Git Bash** e execute:

```bash
ssh root@<IP_DA_VPS>
```

- Quando perguntar `Are you sure you want to continue connecting (yes/no)?`, digite: `yes` e pressione Enter.
- Digite ou cole a sua senha de acesso SSH.
  *(Nota: no terminal, a senha não mostra asteriscos por segurança. Basta colar com o botão direito do mouse e dar Enter).*

---

## 🐳 Gerenciamento do Container Docker na VPS

O projeto está rodando em um container isolado chamado `discord-gamezeda`, sem interferir nos outros containers existentes.

- **Ver logs em tempo real:**
  ```bash
  docker logs -f discord-gamezeda
  ```

- **Reiniciar o serviço:**
  ```bash
  docker restart discord-gamezeda
  ```

- **Parar o serviço:**
  ```bash
  docker stop discord-gamezeda
  ```

- **Iniciar novamente:**
  ```bash
  docker start discord-gamezeda
  ```
