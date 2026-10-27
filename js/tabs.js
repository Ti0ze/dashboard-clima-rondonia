
(function () {
  'use strict';

  const CHAVE = 'aba';
  const lista = document.getElementById('tablist');
  if (!lista) return;

  const abas = Array.from(lista.querySelectorAll('.tab'));
  if (abas.length === 0) return;

  function lerAba() {
    try { return localStorage.getItem(CHAVE); } catch (e) { return null; }
  }

  function salvarAba(id) {
    try { localStorage.setItem(CHAVE, id); } catch (e) { /* ignora */ }
  }

  function ativar(aba, daFoco) {
    abas.forEach(function (outra) {
      const selecionada = outra === aba;
      outra.setAttribute('aria-selected', String(selecionada));
      outra.tabIndex = selecionada ? 0 : -1;

      const painel = document.getElementById(outra.getAttribute('aria-controls'));
      if (painel) painel.hidden = !selecionada;
    });

    salvarAba(aba.id);
    if (daFoco) aba.focus();
  }

  lista.addEventListener('click', function (evento) {
    const aba = evento.target.closest('.tab');
    if (aba && abas.includes(aba)) ativar(aba, false);
  });


  lista.addEventListener('keydown', function (evento) {
    const atual = abas.indexOf(document.activeElement);
    if (atual === -1) return;

    let novo = -1;
    if (evento.key === 'ArrowRight') novo = (atual + 1) % abas.length;
    else if (evento.key === 'ArrowLeft') novo = (atual - 1 + abas.length) % abas.length;
    else if (evento.key === 'Home') novo = 0;
    else if (evento.key === 'End') novo = abas.length - 1;

    if (novo !== -1) {
      evento.preventDefault();
      ativar(abas[novo], true);
    }
  });


  const salvo = abas.find(function (a) { return a.id === lerAba(); });
  const marcada = abas.find(function (a) { return a.getAttribute('aria-selected') === 'true'; });
  ativar(salvo || marcada || abas[0], false);
})();
