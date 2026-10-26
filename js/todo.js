// Responsável: Dev To-Do (lógica e DOM)
// Objetivo: lista de tarefas que não some ao recarregar a página.
//
// Contrato com o HTML:
//   formulário #task-form, campos #task-input, #task-priority e #task-date, lista #task-list
//   busca #task-search, filtros .filter-btn[data-filter] (all | pending | done)
//   resumo: #task-progress, #task-count; mensagem vazia #tasks-empty; botão #clear-done
//   localStorage: chave "tarefas" (lista de objetos)
//     { id, texto, concluida, prioridade: "baixa|media|alta", data: "AAAA-MM-DD" ou "" }
//
// O calendário (js/calendar.js) lê esta mesma chave e escuta o evento
// "tarefas:atualizadas", disparado em document a cada mudança.

(function () {
  'use strict';

  const CHAVE = 'tarefas';
  const TAMANHO_MAX = 200;
  const ORDEM_PRIORIDADE = { alta: 0, media: 1, baixa: 2 };
  const ROTULO_PRIORIDADE = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };

  const form = document.getElementById('task-form');
  const campoTexto = document.getElementById('task-input');
  const campoPrioridade = document.getElementById('task-priority');
  const campoData = document.getElementById('task-date');
  const campoBusca = document.getElementById('task-search');
  const botoesFiltro = document.querySelectorAll('.filter-btn');
  const barra = document.getElementById('task-progress');
  const contagem = document.getElementById('task-count');
  const botaoLimpar = document.getElementById('clear-done');
  const vazio = document.getElementById('tasks-empty');
  const lista = document.getElementById('task-list');

  if (!form || !campoTexto || !lista) {
    console.error('todo.js: elementos das tarefas não encontrados no HTML.');
    return;
  }

  campoTexto.maxLength = TAMANHO_MAX;

  let tarefas = carregar();
  let filtro = 'all';
  let busca = '';

  // Armazenamento -------------------------------------------------------------

  function normalizar(item) {
    return {
      id: String(item.id || novoId()),
      texto: String(item.texto).slice(0, TAMANHO_MAX),
      concluida: Boolean(item.concluida),
      prioridade: ORDEM_PRIORIDADE[item.prioridade] !== undefined ? item.prioridade : 'media',
      data: /^\d{4}-\d{2}-\d{2}$/.test(item.data) ? item.data : ''
    };
  }

  function carregar() {
    try {
      const lista = JSON.parse(localStorage.getItem(CHAVE) || '[]');
      if (!Array.isArray(lista)) return [];
      return lista
        .filter(function (i) { return i && typeof i.texto === 'string' && i.texto.trim() !== ''; })
        .map(normalizar);
    } catch (e) {
      return []; // JSON quebrado ou localStorage bloqueado
    }
  }

  function salvar() {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(tarefas));
    } catch (e) {
      console.warn('Não foi possível salvar as tarefas:', e);
    }
    document.dispatchEvent(new CustomEvent('tarefas:atualizadas'));
  }

  // Funções auxiliares ------------------------------------------------------------

  function novoId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function chaveHoje() {
    const d = new Date();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + mes + '-' + dia;
  }

  function formatarData(chave) {
    const partes = chave.split('-');
    return partes[2] + '/' + partes[1] + '/' + partes[0];
  }

  function semAcento(texto) {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  function criar(tag, texto, classe) {
    const el = document.createElement(tag);
    if (texto !== undefined) el.textContent = texto;
    if (classe) el.className = classe;
    return el;
  }

  // Filtro, busca e ordem -----------------------------------------------------------

  function passaNoFiltro(t) {
    if (filtro === 'pending' && t.concluida) return false;
    if (filtro === 'done' && !t.concluida) return false;
    if (busca && !semAcento(t.texto).includes(busca)) return false;
    return true;
  }

  // Pendentes primeiro, depois prioridade, depois data limite
  function comparar(a, b) {
    return (
      Number(a.concluida) - Number(b.concluida) ||
      ORDEM_PRIORIDADE[a.prioridade] - ORDEM_PRIORIDADE[b.prioridade] ||
      (a.data || '9999-99-99').localeCompare(b.data || '9999-99-99')
    );
  }

  // Desenho na tela -------------------------------------------------------------------

  function criarItem(t, hoje) {
    const atrasada = !t.concluida && t.data !== '' && t.data < hoje;

    const li = criar('li', undefined, 'task-item');
    li.dataset.id = t.id;
    if (t.concluida) li.classList.add('done');
    if (atrasada) li.classList.add('atrasada');

    const check = document.createElement('input');
    check.type = 'checkbox';
    check.id = 'task-check-' + t.id;
    check.className = 'task-check';
    check.checked = t.concluida;

    const rotulo = criar('label', t.texto, 'task-text');
    rotulo.htmlFor = check.id;

    const prioridade = criar('span', ROTULO_PRIORIDADE[t.prioridade], 'task-badge prioridade-' + t.prioridade);
    prioridade.title = 'Prioridade ' + ROTULO_PRIORIDADE[t.prioridade].toLowerCase();

    const itens = [check, rotulo, prioridade];

    if (t.data) {
      const prazo = 'Prazo: ' + formatarData(t.data) + (atrasada ? ' (atrasada)' : '');
      itens.push(criar('span', prazo, 'task-due'));
    }

    const excluir = criar('button', 'Excluir', 'btn btn-danger btn-small task-delete');
    excluir.type = 'button';
    excluir.setAttribute('aria-label', 'Excluir tarefa: ' + t.texto);
    itens.push(excluir);

    li.append(...itens);
    return li;
  }

  function render(focoId) {
    const hoje = chaveHoje();
    const visiveis = tarefas.filter(passaNoFiltro).sort(comparar);

    lista.replaceChildren(...visiveis.map(function (t) { return criarItem(t, hoje); }));

    // Mensagem de lista vazia
    if (vazio) {
      vazio.hidden = visiveis.length > 0;
      vazio.textContent = tarefas.length === 0
        ? 'Nenhuma tarefa por enquanto.'
        : 'Nenhuma tarefa encontrada com esse filtro ou busca.';
    }

    // Resumo (conta todas as tarefas, não só as visíveis)
    const total = tarefas.length;
    const feitas = tarefas.filter(function (t) { return t.concluida; }).length;
    const porcento = total === 0 ? 0 : Math.round((feitas / total) * 100);

    if (barra) {
      barra.value = porcento;
      barra.textContent = porcento + '%';
    }
    if (contagem) {
      contagem.textContent = feitas + ' de ' + total + (total === 1 ? ' tarefa concluída' : ' tarefas concluídas');
    }
    if (botaoLimpar) botaoLimpar.disabled = feitas === 0;

    // Devolve o foco ao item mexido (o desenho recria os elementos)
    if (focoId) {
      const check = document.getElementById('task-check-' + focoId);
      if (check) check.focus();
    }
  }

  // Ações -------------------------------------------------------------------------------

  function adicionar(evento) {
    evento.preventDefault();

    const texto = campoTexto.value.trim();
    if (texto === '') {
      campoTexto.focus();
      return;
    }

    tarefas.push(normalizar({
      id: novoId(),
      texto: texto,
      concluida: false,
      prioridade: campoPrioridade ? campoPrioridade.value : 'media',
      data: campoData ? campoData.value : ''
    }));

    salvar();
    render();

    campoTexto.value = '';
    if (campoData) campoData.value = '';
    campoTexto.focus();
  }

  function alternar(id, concluida) {
    const tarefa = tarefas.find(function (t) { return t.id === id; });
    if (!tarefa) return;
    tarefa.concluida = concluida;
    salvar();
    render(id);
  }

  function excluir(id) {
    tarefas = tarefas.filter(function (t) { return t.id !== id; });
    salvar();
    render();
    campoTexto.focus();
  }

  function limparConcluidas() {
    const feitas = tarefas.filter(function (t) { return t.concluida; }).length;
    if (feitas === 0) return;

    const pergunta = 'Remover ' + feitas + (feitas === 1 ? ' tarefa concluída?' : ' tarefas concluídas?');
    if (typeof window.confirm === 'function' && !window.confirm(pergunta)) return;

    tarefas = tarefas.filter(function (t) { return !t.concluida; });
    salvar();
    render();
  }

  // Eventos ----------------------------------------------------------------------------------

  form.addEventListener('submit', adicionar);

  lista.addEventListener('change', function (evento) {
    const check = evento.target.closest('.task-check');
    const item = evento.target.closest('li');
    if (check && item) alternar(item.dataset.id, check.checked);
  });

  lista.addEventListener('click', function (evento) {
    const botao = evento.target.closest('.task-delete');
    const item = evento.target.closest('li');
    if (botao && item) excluir(item.dataset.id);
  });

  if (campoBusca) {
    campoBusca.addEventListener('input', function () {
      busca = semAcento(campoBusca.value.trim());
      render();
    });
  }

  botoesFiltro.forEach(function (botao) {
    botao.addEventListener('click', function () {
      filtro = botao.dataset.filter;
      botoesFiltro.forEach(function (b) {
        b.setAttribute('aria-pressed', String(b === botao));
      });
      render();
    });
  });

  if (botaoLimpar) botaoLimpar.addEventListener('click', limparConcluidas);

  // Se outra aba do navegador mexer nas tarefas, atualiza esta
  window.addEventListener('storage', function (evento) {
    if (evento.key === CHAVE) {
      tarefas = carregar();
      render();
    }
  });

  render();
})();
