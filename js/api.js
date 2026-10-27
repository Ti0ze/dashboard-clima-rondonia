
(function () {
  'use strict';


  const CIDADES = [
    { nome: 'Porto Velho', lat: -8.7612, lon: -63.9004 },
    { nome: 'Ariquemes', lat: -9.9133, lon: -63.0408 },
    { nome: 'Jaru', lat: -10.4389, lon: -62.4669 },
    { nome: 'Ji-Paraná', lat: -10.8853, lon: -61.9517 },
    { nome: 'Ouro Preto do Oeste', lat: -10.7481, lon: -62.2158 },
    { nome: 'Cacoal', lat: -11.4386, lon: -61.4472 },
    { nome: 'Pimenta Bueno', lat: -11.6725, lon: -61.1936 },
    { nome: 'Rolim de Moura', lat: -11.7256, lon: -61.7769 },
    { nome: 'Vilhena', lat: -12.7406, lon: -60.1458 },
    { nome: 'Guajará-Mirim', lat: -10.7833, lon: -65.3397 }
  ];

  const API_URL = 'https://api.open-meteo.com/v1/forecast';
  const TEMPO_LIMITE_MS = 10000; // 10 segundos
  const CHAVE_UNIDADE = 'unidade';


  const LIMITE_CHUVA = 70;
  const LIMITE_CALOR = 35;


  const CLIMA = {
    0: ['Céu limpo', ''],
    1: ['Predominantemente limpo', '🌤️'],
    2: ['Parcialmente nublado', '⛅'],
    3: ['Nublado', '☁️'],
    45: ['Neblina', '🌫️'],
    48: ['Neblina com geada', '🌫️'],
    51: ['Garoa fraca', '🌦️'],
    53: ['Garoa moderada', '🌦️'],
    55: ['Garoa forte', '🌦️'],
    61: ['Chuva fraca', '🌧️'],
    63: ['Chuva moderada', '🌧️'],
    65: ['Chuva forte', '🌧️'],
    80: ['Pancadas de chuva fracas', '🌦️'],
    81: ['Pancadas de chuva moderadas', '🌧️'],
    82: ['Pancadas de chuva fortes', '⛈️'],
    95: ['Tempestade', '⛈️'],
    96: ['Tempestade com granizo', '⛈️'],
    99: ['Tempestade com granizo forte', '⛈️']
  };

  // Elementos da página
  const seletor = document.getElementById('city-select');
  const botaoC = document.getElementById('unit-c');
  const botaoF = document.getElementById('unit-f');
  const botaoAtualizar = document.getElementById('weather-refresh');
  const status = document.getElementById('weather-status');
  const aviso = document.getElementById('weather-alert');
  const atual = document.getElementById('weather-current');
  const sol = document.getElementById('weather-sun');
  const previsao = document.getElementById('weather-forecast');
  const atualizado = document.getElementById('weather-updated');
  const fonte = document.getElementById('data-source');

  // Sem os elementos principais, não faz nada
  if (!seletor || !status || !atual || !previsao) {
    console.error('api.js: elementos do clima não encontrados no HTML.');
    return;
  }

  // Estado
  let unidade = lerUnidade();
  let ultimosDados = null;   // última resposta da API (sempre em °C)
  let ultimaCidade = null;
  let ultimaRequisicao = 0;  // evita que resposta antiga sobrescreva a nova

  // Funções auxiliares ------------------------------------------------------

  function lerUnidade() {
    try {
      return localStorage.getItem(CHAVE_UNIDADE) === 'fahrenheit' ? 'fahrenheit' : 'celsius';
    } catch (e) {
      return 'celsius';
    }
  }

  function salvarUnidade() {
    try {
      localStorage.setItem(CHAVE_UNIDADE, unidade);
    } catch (e) {
      // sem localStorage (modo privado, por exemplo): segue sem salvar
    }
  }

  function descricao(codigo) {
    return (CLIMA[codigo] || ['Condição indisponível'])[0];
  }

  function icone(codigo) {
    return (CLIMA[codigo] || [, '🌡️'])[1];
  }

  // A API sempre devolve °C; converte só na hora de mostrar
  function temperatura(celsius) {
    const valor = unidade === 'fahrenheit' ? celsius * 9 / 5 + 32 : celsius;
    return Math.round(valor) + (unidade === 'fahrenheit' ? '°F' : '°C');
  }

  function nomeDoDia(dataIso, indice) {
    if (indice === 0) return 'Hoje';
    // "T12:00:00" evita erro de fuso ao converter só a data
    const data = new Date(dataIso + 'T12:00:00');
    return data.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  }

  function horaDe(textoIso) {
    // "2026-10-26T05:52" -> "05:52"
    return textoIso.slice(11, 16);
  }

  function criar(tag, texto, classe) {
    const el = document.createElement(tag);
    if (texto !== undefined) el.textContent = texto;
    if (classe) el.className = classe;
    return el;
  }

  function mostrarStatus(mensagem, ehErro) {
    status.textContent = mensagem;
    status.classList.toggle('error', Boolean(ehErro));
  }

  function marcarBotoesUnidade() {
    if (botaoC) botaoC.setAttribute('aria-pressed', String(unidade === 'celsius'));
    if (botaoF) botaoF.setAttribute('aria-pressed', String(unidade === 'fahrenheit'));
  }

  function bloquearControles(bloquear) {
    seletor.disabled = bloquear;
    if (botaoAtualizar) botaoAtualizar.disabled = bloquear;
  }

  // Busca dos dados (async/await + try/catch) ---------------------------------

  async function buscarClima(cidade) {
    const parametros = new URLSearchParams({
      latitude: cidade.lat,
      longitude: cidade.lon,
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset',
      timezone: 'America/Porto_Velho',
      forecast_days: 5
    });

    const controle = new AbortController();
    const timer = setTimeout(function () { controle.abort(); }, TEMPO_LIMITE_MS);

    try {
      const resposta = await fetch(API_URL + '?' + parametros.toString(), {
        signal: controle.signal
      });

      if (!resposta.ok) {
        throw new Error('HTTP ' + resposta.status);
      }

      const dados = await resposta.json();

      // Garante que veio o que a tela precisa
      if (!dados || !dados.current || !dados.daily) {
        throw new Error('Resposta da API incompleta');
      }

      return dados;
    } finally {
      clearTimeout(timer);
    }
  }

  // Mostrar os dados na tela ----------------------------------------------------

  function mostrarAtual(cidade, dados) {
    const c = dados.current;

    const emoji = criar('span', icone(c.weather_code), 'weather-icon');
    emoji.setAttribute('aria-hidden', 'true');

    const detalhes = criar('div');
    detalhes.append(
      criar('h3', cidade.nome),
      criar('p', temperatura(c.temperature_2m), 'temp-atual'),
      criar('p', descricao(c.weather_code)),
      criar('p', 'Sensação térmica: ' + temperatura(c.apparent_temperature)),
      criar('p', 'Umidade: ' + c.relative_humidity_2m + '%'),
      criar('p', 'Vento: ' + Math.round(c.wind_speed_10m) + ' km/h')
    );

    const bloco = criar('div', undefined, 'weather-now');
    bloco.append(emoji, detalhes);
    atual.replaceChildren(bloco);
  }

  function mostrarSol(dados) {
    if (!sol) return;
    const d = dados.daily;
    if (!d.sunrise || !d.sunset) {
      sol.textContent = '';
      return;
    }
    sol.textContent = 'Nascer do sol: ' + horaDe(d.sunrise[0]) + ' · Pôr do sol: ' + horaDe(d.sunset[0]);
  }

  function mostrarPrevisao(dados) {
    const d = dados.daily;
    const lista = criar('ul', undefined, 'forecast-list');
    lista.setAttribute('aria-label', 'Previsão dos próximos dias');

    d.time.forEach(function (dia, i) {
      const item = criar('li', undefined, 'forecast-item');
      const chuva = d.precipitation_probability_max[i];

      item.append(
        criar('strong', nomeDoDia(dia, i)),
        criar('span', descricao(d.weather_code[i])),
        criar('span', temperatura(d.temperature_2m_min[i]) + ' / ' + temperatura(d.temperature_2m_max[i])),
        criar('span', 'Chuva: ' + (chuva == null ? 0 : chuva) + '%')
      );
      lista.append(item);
    });

    previsao.replaceChildren(criar('h3', 'Próximos dias'), lista);
  }

  // Aviso de chuva ou calor (decide em °C, mostra na unidade escolhida)
  function mostrarAviso(dados) {
    if (!aviso) return;

    const c = dados.current;
    const d = dados.daily;
    const avisos = [];

    if (c.weather_code >= 95 || d.weather_code[0] >= 95) {
      avisos.push('Possibilidade de tempestade hoje. Evite áreas abertas.');
    } else if (d.precipitation_probability_max[0] >= LIMITE_CHUVA) {
      avisos.push('Alta chance de chuva hoje (' + d.precipitation_probability_max[0] + '%). Leve guarda-chuva.');
    }

    if (c.apparent_temperature >= LIMITE_CALOR || d.temperature_2m_max[0] >= LIMITE_CALOR) {
      avisos.push('Calor intenso: sensação de ' + temperatura(c.apparent_temperature) + '. Beba bastante água.');
    }

    aviso.textContent = avisos.join(' ');
  }

  function mostrarAtualizacao() {
    if (!atualizado) return;
    const agora = new Date();
    atualizado.textContent = 'Atualizado às ' +
      agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function desenharTudo() {
    if (!ultimosDados || !ultimaCidade) return;
    mostrarAtual(ultimaCidade, ultimosDados);
    mostrarSol(ultimosDados);
    mostrarPrevisao(ultimosDados);
    mostrarAviso(ultimosDados);
  }

  function limparTela() {
    atual.replaceChildren();
    previsao.replaceChildren();
    if (sol) sol.textContent = '';
    if (aviso) aviso.textContent = '';
    if (atualizado) atualizado.textContent = '';
  }

  // Função principal ----------------------------------------------------------

  async function carregarClima() {
    const cidade = CIDADES[Number(seletor.value)];
    if (!cidade) return;

    const numero = ++ultimaRequisicao;

    mostrarStatus('Carregando o clima de ' + cidade.nome + '...', false);
    limparTela();
    bloquearControles(true);

    try {
      const dados = await buscarClima(cidade);

      // Se o usuário trocou de cidade nesse meio tempo, ignora esta resposta
      if (numero !== ultimaRequisicao) return;

      ultimosDados = dados;
      ultimaCidade = cidade;
      desenharTudo();
      mostrarAtualizacao();
      mostrarStatus('', false);
    } catch (erro) {
      if (numero !== ultimaRequisicao) return;

      console.error('Erro ao buscar o clima:', erro);
      ultimosDados = null;

      if (erro.name === 'AbortError') {
        mostrarStatus('A busca demorou demais. Tente novamente.', true);
      } else if (!navigator.onLine) {
        mostrarStatus('Sem conexão com a internet. Verifique a rede e tente de novo.', true);
      } else {
        mostrarStatus('Não foi possível carregar o clima agora. Tente novamente em instantes.', true);
      }
    } finally {
      if (numero === ultimaRequisicao) {
        bloquearControles(false);
      }
    }
  }

  function trocarUnidade(nova) {
    if (nova === unidade) return;
    unidade = nova;
    salvarUnidade();
    marcarBotoesUnidade();
    desenharTudo(); // só reconverte, sem nova chamada à API
  }

  // Inicialização ---------------------------------------------------------------

  function iniciar() {
    CIDADES.forEach(function (cidade, i) {
      const opcao = document.createElement('option');
      opcao.value = String(i);
      opcao.textContent = cidade.nome;
      seletor.append(opcao);
    });

    seletor.addEventListener('change', carregarClima);
    if (botaoAtualizar) botaoAtualizar.addEventListener('click', carregarClima);
    if (botaoC) botaoC.addEventListener('click', function () { trocarUnidade('celsius'); });
    if (botaoF) botaoF.addEventListener('click', function () { trocarUnidade('fahrenheit'); });

    marcarBotoesUnidade();

    // Crédito da API (a licença pede atribuição)
    if (fonte) {
      const link = criar('a', 'Open-Meteo.com');
      link.href = 'https://open-meteo.com/';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      fonte.replaceChildren('Dados do clima: ', link, ' (licença CC BY 4.0)');
    }

    carregarClima();
  }

  iniciar();
})();