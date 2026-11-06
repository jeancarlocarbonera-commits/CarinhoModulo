let socket = null;
let timerReconexao = null;

function atualizarStatus(texto, online = false) {
  const statusEl = document.getElementById('status');
  if (!statusEl) return;
  statusEl.textContent = texto;
  statusEl.className = online ? 'status-badge status-online' : 'status-badge status-offline';
}

function conectarWebSocket() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  if (timerReconexao) {
    clearTimeout(timerReconexao);
    timerReconexao = null;
  }

  atualizarStatus('Conectando...');
  const endereco = `ws://${CONFIG.ESP_IP}:${CONFIG.PORTA}/`;

  try {
    socket = new WebSocket(endereco);
  } catch (erro) {
    console.error('Não foi possível iniciar o WebSocket:', erro);
    atualizarStatus('Falha na conexão');
    agendarReconexao();
    return;
  }

  socket.addEventListener('open', () => {
    atualizarStatus('ESP conectado', true);
    // Ao conectar, garante que o carrinho comece sem aceleração.
    enviarComando('movimento', 0);
    enviarComando('direcao', 0);
  });

  socket.addEventListener('error', (erro) => {
    console.warn('Erro na conexão com o ESP32:', erro);
    atualizarStatus('Erro de conexão');
  });

  socket.addEventListener('close', () => {
    atualizarStatus('Desconectado');
    agendarReconexao();
  });
}

function agendarReconexao() {
  if (timerReconexao) return;
  timerReconexao = setTimeout(() => {
    timerReconexao = null;
    conectarWebSocket();
  }, 2500);
}

function enviarComando(tipo, valor) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(`${tipo}:${valor}`);
  }
}

function encerrarConexao() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    // Comandos de parada como precaução ao sair da tela.
    socket.send('movimento:0');
    socket.send('direcao:0');
  }
}
