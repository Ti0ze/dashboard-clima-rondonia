
(function () {
  'use strict';

  const CHAVE = 'notas';
  const ATRASO_MS = 500;

  const campo = document.getElementById('notes-input');
  const status = document.getElementById('notes-status');
  if (!campo) return;

  let timer = null;

  function mostrar(mensagem) {
    if (status && status.textContent !== mensagem) status.textContent = mensagem;
  }

  function salvar() {
    timer = null;
    try {
      localStorage.setItem(CHAVE, campo.value);
      const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      mostrar('Salvo às ' + hora);
    } catch (e) {
      mostrar('Não foi possível salvar neste navegador.');
    }
  }


  try {
    campo.value = localStorage.getItem(CHAVE) || '';
  } catch (e) {
    mostrar('O navegador bloqueou o salvamento. As notas não serão guardadas.');
  }


  campo.addEventListener('input', function () {
    mostrar('Salvando...');
    clearTimeout(timer);
    timer = setTimeout(salvar, ATRASO_MS);
  });


  window.addEventListener('pagehide', function () {
    if (timer !== null) {
      clearTimeout(timer);
      salvar();
    }
  });
})();
