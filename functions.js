let socket;

function conectarWebSocket() {
  // Quando for ligar na ESP real, descomente a linha abaixo:
  // socket = new WebSocket(`ws://${CONFIG.ESP_IP}:${CONFIG.PORTA}/`);

  /*
  socket.onopen = () => {
    const statusEl = document.getElementById('status');
    statusEl.innerText = 'Conectado ESP';
    statusEl.className = 'status-badge status-online';
  };
  */
}

function enviarComando(tipo, valor) {
  console.log(`[ENVIO ESP] -> ${tipo}:${valor}`);
  
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(`${tipo}:${valor}`);
  }
}