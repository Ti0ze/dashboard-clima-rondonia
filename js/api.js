// Responsável: Dev de integração de API (líder)
// Busca o clima das cidades de Rondônia na Open-Meteo (gratuita e sem chave de API),
// mostra na tela e avisa o CSS qual é o clima, escrevendo dois atributos no <body>:
//   data-clima   = limpo | nublado | chuva | tempestade
//   data-periodo = dia | noite
// Para testar sem esperar o tempo mudar, abra a página com ?clima=tempestade&periodo=noite

(function () {
  'use strict';

  const CIDADES = [
    { nome: 'Porto Velho', lat: -8.76, lon: -63.9 },
    { nome: 'Ji-Paraná', lat: -10.88, lon: -61.95 },
    { nome: 'Ariquemes', lat: -9.91, lon: -63.04 },
    { nome: 'Vilhena', lat: -12.74, lon: -60.15 },
    { nome: 'Cacoal', lat: -11.44, lon: -61.45 },
    { nome: 'Rolim de Moura', lat: -11.73, lon: -61.78 },
    { nome: 'Jaru', lat: -10.44, lon: -62.47 },
    { nome: 'Guajará-Mirim', lat: -10.79, lon: -65.34 }
  ];

  // Códigos do tempo (padrão WMO) que a API devolve, em português.
  const DESCRICAO = {
    0: 'Céu limpo', 1: 'Quase limpo', 2: 'Parcialmente nublado', 3: 'Encoberto',
    45: 'Neblina', 48: 'Neblina', 51: 'Garoa fraca', 53: 'Garoa', 55: 'Garoa forte',
    61: 'Chuva fraca', 63: 'Chuva', 65: 'Chuva forte',
    80: 'Pancadas fracas', 81: 'Pancadas de chuva', 82: 'Pancadas fortes',
    95: 'Tempestade', 96: 'Tempestade com granizo', 99: 'Tempestade com granizo'
  };

  const CLIMAS = ['limpo', 'nublado', 'chuva', 'tempestade'];
  const PERIODOS = ['dia', 'noite'];

  const $ = (id) => document.getElementById(id);
  const elCidade = $('city-select');
  const elStatus = $('weather-status');
  const elHoje = $('weather-current');
  const elDias = $('weather-forecast');
  let pedido = 0; // evita que uma resposta antiga sobrescreva a mais nova

  const graus = (n) => Math.round(n) + '°';
  const pct = (n) => (n == null ? '–' : Math.round(n) + '%');

  // ---------- Fundo (contrato com o CSS) ----------

  // Traduz o código do tempo em um dos 4 climas que o CSS conhece.
  function codigoParaClima(codigo) {
    if (codigo <= 2) return 'limpo';                   // 0, 1, 2
    if (codigo >= 95) return 'tempestade';             // 95, 96, 99
    if (codigo >= 51 && codigo <= 82) return 'chuva';  // garoa, chuva, pancadas
    return 'nublado';                                  // 3 encoberto, 45 e 48 neblina
  }

  function aplicarFundo(clima, periodo) {
    // Modo demonstração: ?clima=chuva&periodo=noite vale mais que a API.
    const q = new URLSearchParams(location.search);
    const c = q.get('clima');
    const p = q.get('periodo');
    document.body.dataset.clima = CLIMAS.includes(c) ? c : clima;
    document.body.dataset.periodo = PERIODOS.includes(p) ? p : periodo;
  }

  // ---------- Busca na API ----------

  async function buscarClima(cidade) {
    const params = new URLSearchParams({
      latitude: cidade.lat,
      longitude: cidade.lon,
      current: 'temperature_2m,apparent_temperature,weather_code,is_day',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
      timezone: 'auto',
      forecast_days: 7
    });
    const controle = new AbortController();
    const limite = setTimeout(() => controle.abort(), 10000); // desiste depois de 10 s
    try {
      const resposta = await fetch('https://api.open-meteo.com/v1/forecast?' + params, { signal: controle.signal });
      if (!resposta.ok) throw new Error('HTTP ' + resposta.status);
      return await resposta.json();
    } finally {
      clearTimeout(limite);
    }
  }

  // ---------- O que aparece na tela ----------

  function mostrarHoje(dados) {
    const atual = dados.current;
    elHoje.innerHTML =
      '<p class="temp">' + graus(atual.temperature_2m) + '</p>' +
      '<p class="descricao">' + (DESCRICAO[atual.weather_code] || 'Tempo variável') + '</p>' +
      '<div class="stats">' +
        '<p class="stat">Sensação térmica<b>' + graus(atual.apparent_temperature) + '</b></p>' +
        '<p class="stat">Chance de chuva<b>' + pct(dados.daily.precipitation_probability_max[0]) + '</b></p>' +
      '</div>';
  }

  function nomeDoDia(texto, indice) {
    if (indice === 0) return 'Hoje';
    const data = new Date(texto + 'T00:00:00Z');
    const semana = data.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'UTC' }).replace('.', '');
    return semana.charAt(0).toUpperCase() + semana.slice(1) + ' ' + data.getUTCDate();
  }

  function mostrarPrevisao(dados) {
    const d = dados.daily;
    const linhas = d.time.map((dia, i) =>
      '<tr><th scope="row">' + nomeDoDia(dia, i) + '</th>' +
      '<td>' + (DESCRICAO[d.weather_code[i]] || 'Variável') + '</td>' +
      '<td>' + graus(d.temperature_2m_max[i]) + '/' + graus(d.temperature_2m_min[i]) + '</td>' +
      '<td>' + pct(d.precipitation_probability_max[i]) + '</td></tr>'
    ).join('');
    elDias.innerHTML =
      '<table class="dias"><caption class="sr-only">Previsão dos próximos 7 dias</caption>' +
      '<thead><tr><th scope="col">Dia</th><th scope="col">Tempo</th><th scope="col">Máx/mín</th><th scope="col">Chuva</th></tr></thead>' +
      '<tbody>' + linhas + '</tbody></table>';
  }

  function mostrarErro(cidade) {
    elHoje.textContent = '';
    elDias.textContent = '';
    elStatus.textContent = 'Não foi possível carregar o clima de ' + cidade.nome + '. Verifique a internet. ';
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'btn';
    botao.textContent = 'Tentar de novo';
    botao.addEventListener('click', () => carregar(cidade));
    elStatus.append(botao);
  }

  async function carregar(cidade) {
    const meu = ++pedido;
    elStatus.textContent = 'Carregando o clima de ' + cidade.nome + '...';
    try {
      const dados = await buscarClima(cidade);
      if (meu !== pedido) return; // a pessoa já escolheu outra cidade
      mostrarHoje(dados);
      mostrarPrevisao(dados);
      aplicarFundo(codigoParaClima(dados.current.weather_code), dados.current.is_day ? 'dia' : 'noite');
      elStatus.textContent = '';
    } catch (erro) {
      if (meu !== pedido) return;
      console.error('Erro ao buscar o clima:', erro);
      mostrarErro(cidade);
    }
  }

  // ---------- Abas (Hoje / Próximos dias) ----------

  function iniciarAbas() {
    const abas = Array.from(document.querySelectorAll('#weather [role="tab"]'));

    function ativar(aba) {
      abas.forEach((a) => {
        const ativa = a === aba;
        a.setAttribute('aria-selected', String(ativa));
        a.tabIndex = ativa ? 0 : -1;
        $(a.getAttribute('aria-controls')).hidden = !ativa;
      });
    }

    abas.forEach((aba, i) => {
      aba.addEventListener('click', () => ativar(aba));
      aba.addEventListener('keydown', (e) => { // setas, Home e End trocam de aba
        const destino = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: abas.length - 1 }[e.key];
        if (destino === undefined) return;
        e.preventDefault();
        const alvo = abas[(destino + abas.length) % abas.length];
        ativar(alvo);
        alvo.focus();
      });
    });
  }

  // ---------- Início ----------

  function iniciar() {
    CIDADES.forEach((c, i) => elCidade.add(new Option(c.nome, i)));
    elCidade.addEventListener('change', () => carregar(CIDADES[elCidade.value]));
    iniciarAbas();

    const credito = $('data-source');
    if (credito) {
      credito.innerHTML = 'Dados do tempo: <a href="https://open-meteo.com/">Open-Meteo.com</a> (CC BY 4.0)';
    }

    aplicarFundo('nublado', 'dia'); // fundo padrão (e modo demonstração, mesmo sem internet)
    carregar(CIDADES[0]);
  }

  iniciar();
})();
