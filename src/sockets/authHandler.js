import { findUser, saveUser, setUserPassword, addAuthorizedDevice, verifyPassword, hashPassword } from '../config/db.js';

export function registerAuthHandlers(io, socket, users) {
  // Checagem pré-login quando o usuário digita o nome
  socket.on('auth:check-user', async ({ name, deviceId }) => {
    try {
      const cleanName = (name || '').trim();
      if (!cleanName) {
        return socket.emit('auth:check-result', { status: 'ERROR', message: 'Por favor, digite um nome válido.' });
      }

      const userRecord = await findUser(cleanName);
      const currentlyOnline = Array.from(users.values()).some(
        u => u.name.toLowerCase() === cleanName.toLowerCase() && u.id !== socket.id
      );

      // REGRA UNIVERSAL DE CONSISTÊNCIA: Se já existe alguém conectado com este nome no servidor,
      // bloqueia a entrada de uma segunda sessão idêntica.
      if (currentlyOnline) {
        return socket.emit('auth:check-result', {
          status: 'NAME_IN_USE',
          message: 'Já existe um usuário conectado com este apelido no servidor no momento.'
        });
      }

      // CASO 1: Usuário não existe OU ainda não cadastrou senha (cadastro não finalizado)
      if (!userRecord || !userRecord.password_hash) {
        // Permite entrar normalmente sem senha em qualquer dispositivo
        return socket.emit('auth:check-result', {
          status: 'ALLOWED',
          hasPassword: false
        });
      }

      // CASO 2: Usuário possui senha cadastrada (cadastro finalizado!)
      const isKnownDevice = deviceId && userRecord.devices && userRecord.devices.includes(deviceId);

      if (isKnownDevice) {
        // Mesmo computador / dispositivo reconhecido: entra direto sem precisar digitar senha
        return socket.emit('auth:check-result', {
          status: 'ALLOWED',
          hasPassword: true
        });
      }

      // Outro computador / dispositivo desconhecido: exige senha
      return socket.emit('auth:check-result', {
        status: 'PASSWORD_REQUIRED',
        message: 'Este nick possui cadastro finalizado com senha. Digite sua senha para entrar neste computador:'
      });
    } catch (err) {
      console.error('Erro em auth:check-user:', err);
      socket.emit('auth:check-result', { status: 'ERROR', message: 'Erro interno ao verificar usuário.' });
    }
  });

  // Verificação de senha ao tentar entrar por outro dispositivo
  socket.on('auth:verify-password', async ({ name, password, deviceId }) => {
    try {
      const cleanName = (name || '').trim();
      const userRecord = await findUser(cleanName);

      const currentlyOnline = Array.from(users.values()).some(
        u => u.name.toLowerCase() === cleanName.toLowerCase() && u.id !== socket.id
      );

      if (currentlyOnline) {
        return socket.emit('auth:verify-result', {
          success: false,
          message: 'Já existe um usuário conectado com este apelido no servidor no momento.'
        });
      }

      if (!userRecord || !userRecord.password_hash) {
        return socket.emit('auth:verify-result', {
          success: false,
          message: 'Usuário não encontrado ou não possui senha.'
        });
      }

      const isValid = verifyPassword(password, userRecord.password_hash);
      if (!isValid) {
        return socket.emit('auth:verify-result', {
          success: false,
          message: 'Senha incorreta. Verifique e tente novamente.'
        });
      }

      // Senha correta: autoriza este novo dispositivo para não pedir senha novamente
      if (deviceId) {
        await addAuthorizedDevice(cleanName, deviceId);
      }

      socket.emit('auth:verify-result', {
        success: true
      });
    } catch (err) {
      console.error('Erro em auth:verify-password:', err);
      socket.emit('auth:verify-result', {
        success: false,
        message: 'Erro interno ao validar senha.'
      });
    }
  });

  // Finalizar cadastro / cadastrar senha na tela de configurações
  socket.on('auth:set-password', async ({ password, deviceId }) => {
    try {
      const currentUser = users.get(socket.id);
      if (!currentUser) {
        return socket.emit('auth:set-password-result', {
          success: false,
          message: 'Você precisa estar conectado para salvar uma senha.'
        });
      }

      if (!password || password.trim().length < 4) {
        return socket.emit('auth:set-password-result', {
          success: false,
          message: 'A senha deve conter no mínimo 4 caracteres.'
        });
      }

      const passwordHash = hashPassword(password.trim());
      await setUserPassword(currentUser.name, passwordHash, deviceId);

      socket.emit('auth:set-password-result', {
        success: true,
        message: 'Cadastro finalizado com sucesso! Seu nick agora está protegido por senha.'
      });
    } catch (err) {
      console.error('Erro em auth:set-password:', err);
      socket.emit('auth:set-password-result', {
        success: false,
        message: 'Erro ao cadastrar senha. Tente novamente.'
      });
    }
  });

  // Consultar status da conta para a aba de configurações
  socket.on('auth:get-status', async () => {
    try {
      const currentUser = users.get(socket.id);
      if (!currentUser) return;

      const userRecord = await findUser(currentUser.name);
      socket.emit('auth:status', {
        username: currentUser.name,
        hasPassword: !!(userRecord && userRecord.password_hash)
      });
    } catch (err) {
      console.error('Erro em auth:get-status:', err);
    }
  });
}
