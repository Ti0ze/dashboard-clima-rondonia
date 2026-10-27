
(function () {
  'use strict';

  const CHAVE_TAREFAS = 'tarefas';
  const MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const ROTULO_PRIORIDADE = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };

  const botaoAnterior = document.getElementById('cal-prev');
  const botaoProximo = document.getElementById('cal-next');
  const botaoHoje = document.getElementById('cal-today');
  const titulo = document.getElementById('cal-title');
  const corpo = document.getElementById('cal-body');
  const tituloDia = document.getElementById('cal-selected');
  const listaDia = document.getElementById('cal-day-tasks');
  const vazio = document.getElementById('cal-empty');

  if (!corpo || !titulo) {
    console.error('calendar.js: elementos do calendário não encontrados no HTML.');
    return;
  }

  // Datas sempre como texto "AAAA-MM-DD", para fugir de problemas de fuso horário
  function chave(ano, mes, dia) {
    return ano + '-' + String(mes + 1).padStart(2, '0') + '-' + String(dia).padStart(2, '0');
  }

  function chaveDe(data) {
    return chave(data.getFullYear(), data.getMonth(), data.getDate());
  }

  function dataDe(texto) {
    const p = texto.split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }

  const agora = new Date();
  let ano = agora.getFullYear();
  let mes = agora.getMonth();
  let selecionado = chaveDe(agora);



  function lerTarefas() {
    try {
      const dados = JSON.parse(localStorage.getItem(CHAVE_TAREFAS) || '[]');
      if (!Array.isArray(dados)) return [];
      return dados.filter(function (t) {
        return t && typeof t.texto === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t.data);
      });
    } catch (e) {
      return [];
    }
  }

  function agruparPorDia() {
    const mapa = {};
    lerTarefas().forEach(function (t) {
      (mapa[t.data] = mapa[t.data] || []).push(t);
    });
    return mapa;
  }

  function criar(tag, texto, classe) {
    const el = document.createElement(tag);
    if (texto !== undefined) el.textContent = texto;
    if (classe) el.className = classe;
    return el;
  }


  function criarDia(dia, hoje, tarefasDoDia, focavel) {
    const k = chave(ano, mes, dia);
    const qtd = tarefasDoDia.length;

    const botao = criar('button', undefined, 'cal-day');
    botao.type = 'button';
    botao.dataset.date = k;
    botao.tabIndex = focavel ? 0 : -1;
    botao.setAttribute('aria-pressed', String(k === selecionado));

    let rotulo = dia + ' de ' + MESES[mes].toLowerCase() + ' de ' + ano;
    if (k === hoje) {
      rotulo += ', hoje';
      botao.classList.add('today');
      botao.setAttribute('aria-current', 'date');
    }
    if (qtd > 0) {
      rotulo += ', ' + qtd + (qtd === 1 ? ' tarefa com prazo' : ' tarefas com prazo');
      botao.classList.add('has-tasks');
    }
    if (k === selecionado) botao.classList.add('selected');
    botao.setAttribute('aria-label', rotulo);

    botao.append(criar('span', String(dia), 'cal-number'));
    if (qtd > 0) {
      const ponto = criar('span', String(qtd), 'cal-dot');
      ponto.setAttribute('aria-hidden', 'true');
      botao.append(ponto);
    }
    return botao;
  }

  function desenharMes() {
    titulo.textContent = MESES[mes] + ' de ' + ano;
    corpo.replaceChildren();

    const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
    const totalDias = new Date(ano, mes + 1, 0).getDate();
    const hoje = chaveDe(new Date());
    const porDia = agruparPorDia();

    const selecionadoNoMes = selecionado.slice(0, 7) === chave(ano, mes, 1).slice(0, 7);
    const diaFocavel = selecionadoNoMes ? Number(selecionado.slice(8)) : 1;

    let dia = 1;
    for (let semana = 0; dia <= totalDias; semana++) {
      const linha = document.createElement('tr');
      for (let coluna = 0; coluna < 7; coluna++) {
        const celula = document.createElement('td');
        if ((semana === 0 && coluna < primeiroDiaSemana) || dia > totalDias) {
          celula.className = 'cal-blank';
        } else {
          const k = chave(ano, mes, dia);
          celula.append(criarDia(dia, hoje, porDia[k] || [], dia === diaFocavel));
          dia++;
        }
        linha.append(celula);
      }
      corpo.append(linha);
    }
  }

  function desenharDetalhes() {
    if (!tituloDia || !listaDia) return;

    const texto = dataDe(selecionado).toLocaleDateString('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    tituloDia.textContent = texto.charAt(0).toUpperCase() + texto.slice(1);

    const tarefas = agruparPorDia()[selecionado] || [];

    listaDia.replaceChildren(...tarefas.map(function (t) {
      const li = criar('li', undefined, 'cal-task');
      if (t.concluida) li.classList.add('done');

      const prioridade = ROTULO_PRIORIDADE[t.prioridade] || ROTULO_PRIORIDADE.media;
      li.append(
        criar('span', t.texto, 'cal-task-text'),
        criar('span', ' · Prioridade ' + prioridade.toLowerCase() + (t.concluida ? ' · concluída' : ''), 'cal-task-meta')
      );
      return li;
    }));

    if (vazio) vazio.hidden = tarefas.length > 0;
  }

  function render() {
    desenharMes();
    desenharDetalhes();
  }

  function irParaDia(k) {
    const d = dataDe(k);
    ano = d.getFullYear();
    mes = d.getMonth();
    selecionado = k;
    render();
  }

  function mudarMes(delta) {
    const d = new Date(ano, mes + delta, 1);
    ano = d.getFullYear();
    mes = d.getMonth();

    const hoje = new Date();
    const ehMesAtual = hoje.getFullYear() === ano && hoje.getMonth() === mes;
    selecionado = ehMesAtual ? chaveDe(hoje) : chave(ano, mes, 1);
    render();
  }

  function focarDia(k) {
    const botao = corpo.querySelector('.cal-day[data-date="' + k + '"]');
    if (botao) botao.focus();
  }

  if (botaoAnterior) botaoAnterior.addEventListener('click', function () { mudarMes(-1); });
  if (botaoProximo) botaoProximo.addEventListener('click', function () { mudarMes(1); });
  if (botaoHoje) botaoHoje.addEventListener('click', function () { irParaDia(chaveDe(new Date())); });

  corpo.addEventListener('click', function (evento) {
    const botao = evento.target.closest('.cal-day');
    if (!botao) return;
    selecionado = botao.dataset.date;
    render();
    focarDia(selecionado);
  });

  corpo.addEventListener('keydown', function (evento) {
    const botao = evento.target.closest('.cal-day');
    if (!botao) return;

    const d = dataDe(botao.dataset.date);
    let mudou = true;

    if (evento.key === 'ArrowLeft') d.setDate(d.getDate() - 1);
    else if (evento.key === 'ArrowRight') d.setDate(d.getDate() + 1);
    else if (evento.key === 'ArrowUp') d.setDate(d.getDate() - 7);
    else if (evento.key === 'ArrowDown') d.setDate(d.getDate() + 7);
    else if (evento.key === 'PageUp') d.setMonth(d.getMonth() - 1);
    else if (evento.key === 'PageDown') d.setMonth(d.getMonth() + 1);
    else mudou = false;

    if (mudou) {
      evento.preventDefault();
      irParaDia(chaveDe(d));
      focarDia(selecionado);
    }
  });

  document.addEventListener('tarefas:atualizadas', render);
  window.addEventListener('storage', function (evento) {
    if (evento.key === CHAVE_TAREFAS) render();
  });

  render();
})();
