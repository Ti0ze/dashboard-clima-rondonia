(function () {
  'use strict';

  var CHAVE = 'tema';
  var botao = document.getElementById('theme-toggle');
  if (!botao) return;

  // localStorage pode falhar (modo privado, bloqueio do navegador)
  function lerTema() {
    try { return localStorage.getItem(CHAVE); } catch (e) { return null; }
  }
  function salvarTema(valor) {
    try { localStorage.setItem(CHAVE, valor); } catch (e) { /* ignora */ }
  }

  function aplicarTema(escuro) {
    document.body.classList.toggle('dark-mode', escuro);
    botao.setAttribute('aria-pressed', String(escuro));
  }

  // 1. Ao carregar: usa a escolha salva; se não houver, segue o sistema
  var salvo = lerTema();
  if (salvo === 'escuro') {
    aplicarTema(true);
  } else if (salvo === 'claro') {
    aplicarTema(false);
  } else {
    aplicarTema(window.matchMedia('(prefers-color-scheme: dark)').matches);
  }

  // 2 e 3. Ao clicar: alterna, atualiza o aria-pressed e salva
  botao.addEventListener('click', function () {
    var escuro = !document.body.classList.contains('dark-mode');
    aplicarTema(escuro);
    salvarTema(escuro ? 'escuro' : 'claro');
  });
})();