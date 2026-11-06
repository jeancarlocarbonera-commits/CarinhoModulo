document.addEventListener('DOMContentLoaded', () => {
  const btnAcelerar = document.getElementById('btn-acelerador');
  const btnRe = document.getElementById('btn-re');
  const displayVel = document.getElementById('val-velocidade');
  const volante = document.getElementById('volante');
  const volanteArea = document.querySelector('.steering-wrapper');
  const displayDir = document.getElementById('val-direcao');
  const btnInstalar = document.getElementById('btn-instalar');
  const installHelp = document.getElementById('install-help');
  const installMessage = document.getElementById('install-message');
  const btnFecharAjuda = document.getElementById('btn-fechar-ajuda');

  conectarWebSocket();

  // O Service Worker permite abrir a interface já carregada mesmo sem internet.
  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register('./service-worker.js').catch((erro) => {
      console.error('Falha ao registrar o Service Worker:', erro);
    });
  }

  // --- INSTALAÇÃO PWA ---
  let eventoInstalacao = null;
  const instaladoComoApp = () =>
    window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  if (instaladoComoApp()) {
    btnInstalar.classList.add('hidden');
  }

  window.addEventListener('beforeinstallprompt', (evento) => {
    evento.preventDefault();
    eventoInstalacao = evento;
    btnInstalar.classList.remove('hidden');
  });

  function mostrarAjudaInstalacao() {
    const iOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

    if (!window.isSecureContext || location.protocol === 'file:') {
      installMessage.textContent = 'Para instalar como aplicativo, primeiro publique esta pasta em um endereço HTTPS. Abrir o arquivo index.html baixado diretamente não instala um PWA.';
    } else if (iOS) {
      installMessage.textContent = 'No iPhone ou iPad: abra este endereço no Safari, toque em Compartilhar e escolha “Adicionar à Tela de Início”.';
    } else {
      installMessage.textContent = 'No Chrome ou Edge, abra o menu do navegador (⋮) e procure “Instalar aplicativo” ou “Adicionar à tela inicial”. Se essa opção ainda não aparecer, abra a página pelo endereço HTTPS e aguarde o navegador verificar a instalação.';
    }

    installHelp.classList.remove('hidden');
  }

  btnInstalar.addEventListener('click', async () => {
    if (eventoInstalacao) {
      eventoInstalacao.prompt();
      const escolha = await eventoInstalacao.userChoice;
      if (escolha.outcome === 'accepted') btnInstalar.classList.add('hidden');
      eventoInstalacao = null;
      return;
    }
    mostrarAjudaInstalacao();
  });

  btnFecharAjuda.addEventListener('click', () => installHelp.classList.add('hidden'));
  installHelp.addEventListener('click', (evento) => {
    if (evento.target === installHelp) installHelp.classList.add('hidden');
  });

  window.addEventListener('appinstalled', () => {
    btnInstalar.classList.add('hidden');
    eventoInstalacao = null;
  });

  // --- ESTADO DOS CONTROLES ---
  const teclasPressionadas = Object.create(null);
  let anguloAtual = 0;
  let arrastando = false;
  let anguloInicial = 0;
  let pointerVolanteId = null;

  function ativarVisualPedal(tipo, ativo) {
    const elemento = tipo === 'acelerar' ? btnAcelerar : btnRe;
    elemento.classList.toggle('pedal-ativo', ativo);
  }

  function atualizarMovimento(valor) {
    displayVel.textContent = `${valor}%`;
    enviarComando('movimento', valor);
  }

  // Pointer Events funcionam com mouse, caneta e toque; captura o ponteiro
  // para que o arrasto não seja perdido ao sair da borda do volante.
  function configurarPedal(elemento, valor, tipo) {
    let ponteirosAtivos = new Set();

    elemento.addEventListener('pointerdown', (evento) => {
      evento.preventDefault();
      ponteirosAtivos.add(evento.pointerId);
      elemento.setPointerCapture(evento.pointerId);
      atualizarMovimento(valor);
      ativarVisualPedal(tipo, true);
    });

    function soltar(evento) {
      if (!ponteirosAtivos.has(evento.pointerId)) return;
      ponteirosAtivos.delete(evento.pointerId);
      if (ponteirosAtivos.size === 0) {
        atualizarMovimento(0);
        ativarVisualPedal(tipo, false);
      }
    }

    elemento.addEventListener('pointerup', soltar);
    elemento.addEventListener('pointercancel', soltar);
    elemento.addEventListener('lostpointercapture', soltar);
  }

  configurarPedal(btnAcelerar, 100, 'acelerar');
  configurarPedal(btnRe, -100, 're');

  function atualizarVolanteVisual(angulo) {
    anguloAtual = angulo;
    volante.style.transform = `rotate(${anguloAtual}deg)`;
    volante.setAttribute('aria-valuenow', String(anguloAtual));
    displayDir.textContent = `${anguloAtual}°`;
    enviarComando('direcao', anguloAtual);
  }

  function obterAnguloDoPonteiro(evento) {
    const retangulo = volanteArea.getBoundingClientRect();
    const centroX = retangulo.left + retangulo.width / 2;
    const centroY = retangulo.top + retangulo.height / 2;
    return Math.atan2(evento.clientY - centroY, evento.clientX - centroX) * (180 / Math.PI);
  }

  function iniciarGiro(evento) {
    if (evento.pointerType === 'mouse' && evento.button !== 0) return;
    evento.preventDefault();
    arrastando = true;
    pointerVolanteId = evento.pointerId;
    volante.setPointerCapture(evento.pointerId);
    anguloInicial = obterAnguloDoPonteiro(evento) - anguloAtual;
  }

  function girar(evento) {
    if (!arrastando || evento.pointerId !== pointerVolanteId) return;
    evento.preventDefault();

    let novoAngulo = obterAnguloDoPonteiro(evento) - anguloInicial;
    while (novoAngulo > 180) novoAngulo -= 360;
    while (novoAngulo < -180) novoAngulo += 360;

    novoAngulo = Math.max(-90, Math.min(90, novoAngulo));
    atualizarVolanteVisual(Math.round(novoAngulo));
  }

  function soltarVolante(evento) {
    if (!arrastando || (evento && evento.pointerId !== pointerVolanteId)) return;
    arrastando = false;
    pointerVolanteId = null;
    atualizarVolanteVisual(0);
  }

  volante.addEventListener('pointerdown', iniciarGiro);
  volante.addEventListener('pointermove', girar);
  volante.addEventListener('pointerup', soltarVolante);
  volante.addEventListener('pointercancel', soltarVolante);
  volante.addEventListener('lostpointercapture', soltarVolante);

  // --- CONTROLE POR TECLADO (PC) ---
  function processarTeclado() {
    const usandoAcelerar = teclasPressionadas.w || teclasPressionadas.W || teclasPressionadas.ArrowUp;
    const usandoRe = teclasPressionadas.s || teclasPressionadas.S || teclasPressionadas.ArrowDown;

    if (usandoAcelerar && !usandoRe) {
      atualizarMovimento(100);
      ativarVisualPedal('acelerar', true);
      ativarVisualPedal('re', false);
    } else if (usandoRe && !usandoAcelerar) {
      atualizarMovimento(-100);
      ativarVisualPedal('re', true);
      ativarVisualPedal('acelerar', false);
    } else {
      atualizarMovimento(0);
      ativarVisualPedal('acelerar', false);
      ativarVisualPedal('re', false);
    }

    if (!arrastando) {
      if (teclasPressionadas.a || teclasPressionadas.A || teclasPressionadas.ArrowLeft) {
        atualizarVolanteVisual(-90);
      } else if (teclasPressionadas.d || teclasPressionadas.D || teclasPressionadas.ArrowRight) {
        atualizarVolanteVisual(90);
      } else {
        atualizarVolanteVisual(0);
      }
    }
  }

  document.addEventListener('keydown', (evento) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(evento.key)) {
      evento.preventDefault();
    }
    if (!teclasPressionadas[evento.key]) {
      teclasPressionadas[evento.key] = true;
      processarTeclado();
    }
  });

  document.addEventListener('keyup', (evento) => {
    teclasPressionadas[evento.key] = false;
    processarTeclado();
  });

  function pararControles() {
    arrastando = false;
    pointerVolanteId = null;
    teclasPressionadas.w = teclasPressionadas.W = teclasPressionadas.ArrowUp = false;
    teclasPressionadas.s = teclasPressionadas.S = teclasPressionadas.ArrowDown = false;
    teclasPressionadas.a = teclasPressionadas.A = teclasPressionadas.ArrowLeft = false;
    teclasPressionadas.d = teclasPressionadas.D = teclasPressionadas.ArrowRight = false;
    atualizarMovimento(0);
    atualizarVolanteVisual(0);
    ativarVisualPedal('acelerar', false);
    ativarVisualPedal('re', false);
  }

  window.addEventListener('blur', pararControles);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pararControles();
      encerrarConexao();
    } else {
      conectarWebSocket();
    }
  });
  window.addEventListener('pagehide', () => {
    pararControles();
    encerrarConexao();
  });
});
