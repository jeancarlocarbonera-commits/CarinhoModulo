let socket;
const espIP = "192.168.4.1"; // IP padrão do Access Point da ESP

function conectarWebSocket() {
  // Descomente a linha abaixo quando for testar direto na ESP:
  // socket = new WebSocket(`ws://${espIP}:81/`);

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