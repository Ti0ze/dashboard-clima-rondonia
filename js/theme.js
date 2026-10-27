(function () {
  'use strict';

  var CHAVE = 'tema';
  var botao = document.getElementById('theme-toggle');
  if (!botao) return;


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


  var salvo = lerTema();
  if (salvo === 'escuro') {
    aplicarTema(true);
  } else if (salvo === 'claro') {
    aplicarTema(false);
  } else {
    aplicarTema(window.matchMedia('(prefers-color-scheme: dark)').matches);
  }

  
  botao.addEventListener('click', function () {
    var escuro = !document.body.classList.contains('dark-mode');
    aplicarTema(escuro);
    salvarTema(escuro ? 'escuro' : 'claro');
  });
})();