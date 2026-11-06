document.addEventListener('DOMContentLoaded', () => {
  conectarWebSocket();

  // --- ELEMENTOS DA INTERFACE ---
  const btnAcelerar = document.getElementById('btn-acelerador');
  const btnRe = document.getElementById('btn-re');
  const displayVel = document.getElementById('val-velocidade');
  const volante = document.getElementById('volante');
  const displayDir = document.getElementById('val-direcao');
  const btnInstalar = document.getElementById('btn-instalar');

  // --- TRAVA DE ORIENTAÇÃO HORIZONTAL E TELA CHEIA (ESTILO JOGO) ---
  function forcarModoJogo() {
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(() => {});
    }
  }

  window.addEventListener('click', forcarModoJogo, { once: true });
  window.addEventListener('touchstart', forcarModoJogo, { once: true });

  // --- LÓGICA DO BOTÃO DE BAIXAR / INSTALAR APP (PWA) ---
  let eventoInstalacao;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    eventoInstalacao = e;
    btnInstalar.classList.remove('hidden');
  });

  btnInstalar.addEventListener('click', async () => {
    if (eventoInstalacao) {
      eventoInstalacao.prompt();
      const { outcome } = await eventoInstalacao.userChoice;
      if (outcome === 'accepted') {
        btnInstalar.classList.add('hidden');
      }
      eventoInstalacao = null;
    }
  });

  window.addEventListener('appinstalled', () => {
    btnInstalar.classList.add('hidden');
  });

  // --- ESTADO DOS CONTROLES ---
  const teclasPressionadas = {};
  let anguloAtual = 0;
  let arrastando = false;
  let anguloInicial = 0;

  // --- FUNÇÕES DE ESTILO VISUAL DOS PEDAIS ---
  function ativarVisualPedal(tipo, ativo) {
    if (tipo === 'acelerar') {
      if (ativo) {
        btnAcelerar.style.transform = 'scale(0.95)';
        btnAcelerar.style.background = 'linear-gradient(180deg, #222 0%, #000 100%)';
        btnAcelerar.style.borderColor = '#5cb85c';
        btnAcelerar.style.color = '#5cb85c';
      } else {
        btnAcelerar.style.transform = 'scale(1)';
        btnAcelerar.style.background = 'linear-gradient(180deg, #333 0%, #111 100%)';
        btnAcelerar.style.borderColor = '#444';
        btnAcelerar.style.color = '#aaa';
      }
    } else if (tipo === 're') {
      if (ativo) {
        btnRe.style.transform = 'scale(0.95)';
        btnRe.style.background = 'linear-gradient(180deg, #222 0%, #000 100%)';
        btnRe.style.borderColor = '#d9534f';
        btnRe.style.color = '#d9534f';
      } else {
        btnRe.style.transform = 'scale(1)';
        btnRe.style.background = 'linear-gradient(180deg, #333 0%, #111 100%)';
        btnRe.style.borderColor = '#444';
        btnRe.style.color = '#aaa';
      }
    }
  }

  // --- LÓGICA DE MOVIMENTO (ACELERADOR / RÉ) ---
  function atualizarMovimento(val) {
    displayVel.innerText = `${val}%`;
    enviarComando('movimento', val);
  }

  // Eventos de Clique / Touch nos Pedais
  btnAcelerar.addEventListener('mousedown', () => { atualizarMovimento(100); ativarVisualPedal('acelerar', true); });
  btnAcelerar.addEventListener('mouseup', () => { atualizarMovimento(0); ativarVisualPedal('acelerar', false); });
  btnAcelerar.addEventListener('mouseleave', () => { atualizarMovimento(0); ativarVisualPedal('acelerar', false); });
  btnAcelerar.addEventListener('touchstart', (e) => { e.preventDefault(); atualizarMovimento(100); ativarVisualPedal('acelerar', true); });
  btnAcelerar.addEventListener('touchend', () => { atualizarMovimento(0); ativarVisualPedal('acelerar', false); });

  btnRe.addEventListener('mousedown', () => { atualizarMovimento(-100); ativarVisualPedal('re', true); });
  btnRe.addEventListener('mouseup', () => { atualizarMovimento(0); ativarVisualPedal('re', false); });
  btnRe.addEventListener('mouseleave', () => { atualizarMovimento(0); ativarVisualPedal('re', false); });
  btnRe.addEventListener('touchstart', (e) => { e.preventDefault(); atualizarMovimento(-100); ativarVisualPedal('re', true); });
  btnRe.addEventListener('touchend', () => { atualizarMovimento(0); ativarVisualPedal('re', false); });

  // --- LÓGICA CORRIGIDA DO VOLANTE ---
  function atualizarVolanteVisual(angulo) {
    anguloAtual = angulo;
    volante.style.transform = `rotate(${anguloAtual}deg)`;
    displayDir.innerText = `${anguloAtual}°`;
    enviarComando('direcao', anguloAtual);
  }

  function iniciarGiro(e) {
    arrastando = true;
    const rect = volante.getBoundingClientRect();
    const centroX = rect.left + rect.width / 2;
    const centroY = rect.top + rect.height / 2;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const deltaX = clientX - centroX;
    const deltaY = clientY - centroY;
    anguloInicial = (Math.atan2(deltaY, deltaX) * (180 / Math.PI)) - anguloAtual;
  }

  function girar(e) {
    if (!arrastando) return;

    const rect = volante.getBoundingClientRect();
    const centroX = rect.left + rect.width / 2;
    const centroY = rect.top + rect.height / 2;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const deltaX = clientX - centroX;
    const deltaY = clientY - centroY;

    let rad = Math.atan2(deltaY, deltaX);
    let angulo = rad * (180 / Math.PI);
    let novoAngulo = angulo - anguloInicial;

    while (novoAngulo > 180) novoAngulo -= 360;
    while (novoAngulo < -180) novoAngulo += 360;

    novoAngulo = Math.max(-90, Math.min(90, novoAngulo));
    atualizarVolanteVisual(Math.round(novoAngulo));
  }

  function soltarVolante() {
    if (!arrastando) return;
    arrastando = false;
    atualizarVolanteVisual(0);
  }

  volante.addEventListener('mousedown', iniciarGiro);
  window.addEventListener('mousemove', girar);
  window.addEventListener('mouseup', soltarVolante);

  volante.addEventListener('touchstart', iniciarGiro);
  window.addEventListener('touchmove', girar);
  window.addEventListener('touchend', soltarVolante);

  // --- CONTROLE POR TECLADO (PC: WASD ou SETAS) ---
  function processarTeclado() {
    const usandoAcelerar = teclasPressionadas['w'] || teclasPressionadas['W'] || teclasPressionadas['ArrowUp'];
    const usandoRe = teclasPressionadas['s'] || teclasPressionadas['S'] || teclasPressionadas['ArrowDown'];

    if (usandoAcelerar) {
      atualizarMovimento(100);
      ativarVisualPedal('acelerar', true);
    } else {
      ativarVisualPedal('acelerar', false);
    }

    if (usandoRe) {
      atualizarMovimento(-100);
      ativarVisualPedal('re', true);
    } else {
      ativarVisualPedal('re', false);
    }

    if (!usandoAcelerar && !usandoRe) {
      atualizarMovimento(0);
    }

    if (!arrastando) {
      if (teclasPressionadas['a'] || teclasPressionadas['A'] || teclasPressionadas['ArrowLeft']) {
        atualizarVolanteVisual(-90);
      } else if (teclasPressionadas['d'] || teclasPressionadas['D'] || teclasPressionadas['ArrowRight']) {
        atualizarVolanteVisual(90);
      } else {
        atualizarVolanteVisual(0);
      }
    }
  }

  document.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }
    if (!teclasPressionadas[e.key]) {
      teclasPressionadas[e.key] = true;
      processarTeclado();
    }
  });

  document.addEventListener('keyup', (e) => {
    teclasPressionadas[e.key] = false;
    processarTeclado();
  });
});