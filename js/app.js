(function(){
  const NOMBRE_NINO = 'Joaquín';

  const ALFABETO = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');

  const NOMBRE_LETRA = {
    A:'a',B:'be',C:'ce',D:'de',E:'e',F:'efe',G:'ge',H:'hache',I:'i',J:'jota',K:'ka',
    L:'ele',M:'eme',N:'ene',Ñ:'eñe',O:'o',P:'pe',Q:'cu',R:'ere',S:'ese',T:'te',U:'u',
    V:'uve',W:'uve doble',X:'equis',Y:'ye',Z:'zeta'
  };

  const ILUSTRACIONES = {
    gato:'🐱', perro:'🐶', casa:'🏠', sol:'☀️', luna:'🌙', flor:'🌸', pez:'🐟', oso:'🐻',
    pelota:'⚽', manzana:'🍎', uva:'🍇', libro:'📖', arbol:'🌳', agua:'💧', estrella:'⭐',
    auto:'🚗', coche:'🚗', pan:'🍞', leche:'🥛', hola:'👋', adios:'👋', mano:'✋', pie:'🦶',
    ojo:'👁️', boca:'👄', pato:'🦆', vaca:'🐄', pollo:'🐔', huevo:'🥚', queso:'🧀',
    torta:'🎂', globo:'🎈', nube:'☁️', lluvia:'🌧️', playa:'🏖️', barco:'⛵',
    avion:'✈️', tren:'🚂', bici:'🚲', mama:'👩', papa:'👨', bebe:'👶', abuela:'👵', abuelo:'👴',
    escuela:'🏫', reloj:'⏰', silla:'🪑', mesa:'🍽️', puerta:'🚪', ventana:'🪟',
    zapato:'👟', gorro:'🧢', lapiz:'✏️', cuaderno:'📓', corazon:'❤️', feliz:'😊'
  };

  const reduceMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- temas visuales ---
  const TEMAS = [
    { id:'telarana', emoji:'🕸️', nombre:'Telaraña' },
    { id:'bloques', emoji:'🟩', nombre:'Bloques' },
    { id:'carreras', emoji:'🏁', nombre:'Carreras' },
    { id:'arcoiris', emoji:'🌈', nombre:'Arcoíris' },
    { id:'animales', emoji:'🐾', nombre:'Animales' },
    { id:'flores', emoji:'🌷', nombre:'Flores' }
  ];
  const TEMA_KEY = 'taller-letras-tema';
  let temaActual = null; // null = tema por defecto (colores del prototipo)
  try{
    const guardado = localStorage.getItem(TEMA_KEY);
    if (TEMAS.some(t => t.id === guardado)) temaActual = guardado;
  }catch(e){}

  function renderGrillaTemas(contenedorId){
    const cont = document.getElementById(contenedorId);
    if (!cont) return;
    cont.innerHTML = '';
    TEMAS.forEach(t => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'boton-tema' + (temaActual === t.id ? ' activo' : '');
      btn.dataset.tema = t.id;
      const emoji = document.createElement('span');
      emoji.className = 'boton-tema-emoji';
      emoji.textContent = t.emoji;
      const nombre = document.createElement('span');
      nombre.className = 'boton-tema-nombre';
      nombre.textContent = t.nombre;
      btn.appendChild(emoji);
      btn.appendChild(nombre);
      if (temaActual === t.id){
        const check = document.createElement('span');
        check.className = 'boton-tema-check';
        check.textContent = '✓';
        btn.appendChild(check);
      }
      cont.appendChild(btn);
    });
  }

  function aplicarTema(id){
    temaActual = id;
    document.body.className = id ? ('tema-' + id) : '';
    try{ localStorage.setItem(TEMA_KEY, id || ''); }catch(e){}
    renderGrillaTemas('grilla-temas');
    renderGrillaTemas('grilla-temas-ajustes');
  }

  if (temaActual) document.body.className = 'tema-' + temaActual;
  renderGrillaTemas('grilla-temas');
  renderGrillaTemas('grilla-temas-ajustes');

  document.getElementById('grilla-temas').addEventListener('click', (e) => {
    const btn = e.target.closest('.boton-tema');
    if (!btn) return;
    aplicarTema(btn.dataset.tema);
    obtenerAudioCtx();
    speechSynthesis.cancel();
    irAJugarOElegirPremio();
  });

  function irAJugarOElegirPremio(){
    const activas = metas.filter(m => m.estado === 'activa');
    if (activas.length){
      construirGrillaElegirPremio(activas);
      mostrarEscena('escena-elegir-premio');
    } else {
      mostrarEscena('escena-mic');
      setTimeout(() => reproducirConFallback('instruccion', 'Dime una palabra y la escribimos juntos'), 200);
    }
  }

  document.getElementById('grilla-temas-ajustes').addEventListener('click', (e) => {
    const btn = e.target.closest('.boton-tema');
    if (!btn) return;
    aplicarTema(btn.dataset.tema);
  });

  // --- sonidos de acierto/error por tema (Web Audio API) ---
  function tonoSimple(ctx, opts){
    const { frecInicial, frecFinal = frecInicial, tipo = 'sine', duracion = 0.15, ganancia = 0.14, retraso = 0 } = opts;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = tipo;
    const t0 = ctx.currentTime + retraso;
    o.frequency.setValueAtTime(frecInicial, t0);
    if (frecFinal !== frecInicial) o.frequency.exponentialRampToValueAtTime(Math.max(frecFinal, 1), t0 + duracion * 0.8);
    g.gain.setValueAtTime(ganancia, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + duracion);
    o.connect(g); g.connect(ctx.destination);
    o.start(t0); o.stop(t0 + duracion + 0.02);
  }

  const SONIDOS_TEMA = {
    default: {
      acierto: (ctx) => tonoSimple(ctx, { frecInicial:700, frecFinal:1100, tipo:'sine', duracion:0.16, ganancia:0.15 }),
      error: (ctx) => tonoSimple(ctx, { frecInicial:180, tipo:'sawtooth', duracion:0.25, ganancia:0.12 })
    },
    // Telaraña: acierto "swish" agudo, error como un hilo que se corta.
    telarana: {
      acierto: (ctx) => tonoSimple(ctx, { frecInicial:900, frecFinal:2200, tipo:'sine', duracion:0.1, ganancia:0.14 }),
      error: (ctx) => tonoSimple(ctx, { frecInicial:1200, frecFinal:300, tipo:'sawtooth', duracion:0.15, ganancia:0.12 })
    },
    // Bloques: sonidos tipo 8 bits (onda cuadrada, notas cortas).
    bloques: {
      acierto: (ctx) => {
        tonoSimple(ctx, { frecInicial:523, tipo:'square', duracion:0.08, ganancia:0.10 });
        tonoSimple(ctx, { frecInicial:659, tipo:'square', duracion:0.09, ganancia:0.10, retraso:0.07 });
      },
      error: (ctx) => tonoSimple(ctx, { frecInicial:200, frecFinal:100, tipo:'square', duracion:0.18, ganancia:0.10 })
    },
    // Carreras: acierto tipo motor corto, error tipo frenazo.
    carreras: {
      acierto: (ctx) => {
        tonoSimple(ctx, { frecInicial:80, frecFinal:220, tipo:'sawtooth', duracion:0.09, ganancia:0.13 });
        tonoSimple(ctx, { frecInicial:220, frecFinal:140, tipo:'sawtooth', duracion:0.09, ganancia:0.11, retraso:0.08 });
      },
      error: (ctx) => tonoSimple(ctx, { frecInicial:1000, frecFinal:150, tipo:'sawtooth', duracion:0.18, ganancia:0.11 })
    },
    // Arcoíris: acierto tipo campanita (dos armónicos), error apagado.
    arcoiris: {
      acierto: (ctx) => {
        tonoSimple(ctx, { frecInicial:1046, tipo:'sine', duracion:0.18, ganancia:0.12 });
        tonoSimple(ctx, { frecInicial:1568, tipo:'sine', duracion:0.16, ganancia:0.08, retraso:0.02 });
      },
      error: (ctx) => tonoSimple(ctx, { frecInicial:220, tipo:'sine', duracion:0.22, ganancia:0.10 })
    },
    // Animales: acierto silbido suave ascendente, error silbido descendente.
    animales: {
      acierto: (ctx) => tonoSimple(ctx, { frecInicial:600, frecFinal:900, tipo:'sine', duracion:0.22, ganancia:0.11 }),
      error: (ctx) => tonoSimple(ctx, { frecInicial:500, frecFinal:250, tipo:'sine', duracion:0.22, ganancia:0.11 })
    },
    // Flores: acierto carillón de tres notas, error una nota grave sola.
    flores: {
      acierto: (ctx) => {
        tonoSimple(ctx, { frecInicial:784, tipo:'sine', duracion:0.14, ganancia:0.1 });
        tonoSimple(ctx, { frecInicial:988, tipo:'sine', duracion:0.14, ganancia:0.1, retraso:0.06 });
        tonoSimple(ctx, { frecInicial:1175, tipo:'sine', duracion:0.16, ganancia:0.1, retraso:0.12 });
      },
      error: (ctx) => tonoSimple(ctx, { frecInicial:349, tipo:'sine', duracion:0.2, ganancia:0.1 })
    }
  };

  // --- referencias ---
  const btnMic = document.getElementById('btn-mic');
  const estadoMic = document.getElementById('estado-mic');
  const fallbackTexto = document.getElementById('fallback-texto');
  const inputPalabra = document.getElementById('input-palabra');
  const btnUsarTexto = document.getElementById('btn-usar-texto');

  const palabraEscuchadaEl = document.getElementById('palabra-escuchada');
  const btnRepetirAudio = document.getElementById('btn-repetir-audio');
  const btnMiVoz = document.getElementById('btn-mi-voz');
  const btnSi = document.getElementById('btn-si');
  const btnNo = document.getElementById('btn-no');

  const slotsEl = document.getElementById('slots');
  const alfabetoEl = document.getElementById('alfabeto');

  const ilustracionEl = document.getElementById('ilustracion');
  const palabraFinalEl = document.getElementById('palabra-final');
  const btnOtra = document.getElementById('btn-otra');

  const puntos = document.querySelectorAll('.punto');

  let palabraActual = '';
  let wordArr = [];
  let pointer = 0;

  // --- utilidades ---
  const MARCAS_DIACRITICAS = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');
  function normalizar(s){
    return s.normalize('NFD').replace(MARCAS_DIACRITICAS,'').toLowerCase().trim();
  }

  function mostrarEscena(id){
    document.querySelectorAll('.escena').forEach(e => e.hidden = (e.id !== id));
    const barraProgreso = document.getElementById('progreso');
    barraProgreso.style.visibility = (id === 'escena-bienvenida') ? 'hidden' : 'visible';
    const panel = document.getElementById('panel-voz');
    if (panel) panel.hidden = true;
    const panelP = document.getElementById('panel-premios');
    if (panelP) panelP.hidden = true;
    const avatarEnvoltorio = document.getElementById('avatar-envoltorio');
    if (avatarEnvoltorio) avatarEnvoltorio.hidden = (id !== 'escena-deletrear');
    const pasos = {'escena-mic':0, 'escena-confirmar':1, 'escena-deletrear':2, 'escena-celebrar':2};
    const paso = pasos[id] ?? 0;
    puntos.forEach((p,i) => p.classList.toggle('activo', i <= paso));
  }

  // --- voz: síntesis ---
  let vocesEs = [];
  let vozElegida = null;

  // Las voces "neuronales" suenan mucho menos robóticas que las clásicas.
  function puntuarVoz(v){
    const n = v.name.toLowerCase();
    const lang = v.lang.toLowerCase();
    let p = 0;
    if (/natural|neural|premium|enhanced|siri/.test(n)) p += 60;
    if (n.includes('google')) p += 45;
    if (/paulina|luciana|esperanza|helena|elvira|isidora|catalina|lucía|lucia/.test(n)) p += 25;
    if (/sabina|jorge|diego|raul|raúl|pablo/.test(n)) p += 5;
    if (lang === 'es-cl') p += 20;
    else if (lang === 'es-mx' || lang === 'es-us' || lang === 'es-ar') p += 14;
    if (v.localService) p += 6;
    return p;
  }

  function cargarVoces(){
    vocesEs = speechSynthesis.getVoices()
      .filter(v => v.lang && v.lang.toLowerCase().startsWith('es') && v.lang.toLowerCase() !== 'es-es')
      .sort((a,b) => puntuarVoz(b) - puntuarVoz(a));
    if (!vozElegida && vocesEs.length) vozElegida = vocesEs[0];
    poblarSelectorVoz();
  }

  if ('speechSynthesis' in window){
    cargarVoces();
    speechSynthesis.onvoiceschanged = cargarVoces;
  }

  function hablar(texto, opts = {}){
    if (!('speechSynthesis' in window)) return;
    const { pitch = 1.15, rate = 0.9, cancelar = true, alTerminar = null } = opts;
    if (cancelar) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = (vozElegida && vozElegida.lang) || 'es-CL';
    if (vozElegida) u.voice = vozElegida;
    u.pitch = pitch;
    u.rate = rate;
    if (alTerminar) u.onend = alTerminar;
    speechSynthesis.speak(u);
  }

  // Las preguntas van en su propia frase, más lentas y con tono más alto,
  // que es lo que da la entonación ascendente del español.
  function preguntar(texto){
    hablar(texto, { pitch: 1.4, rate: 0.82, cancelar: false });
  }

  function poblarSelectorVoz(){
    const sel = document.getElementById('selector-voz');
    if (!sel) return;
    sel.innerHTML = '';
    if (!vocesEs.length){
      const o = document.createElement('option');
      o.textContent = 'No hay voces en español disponibles';
      sel.appendChild(o);
      sel.disabled = true;
      return;
    }
    sel.disabled = false;
    vocesEs.forEach((v, i) => {
      const o = document.createElement('option');
      o.value = String(i);
      o.textContent = `${v.name} (${v.lang})`;
      if (vozElegida && v.name === vozElegida.name) o.selected = true;
      sel.appendChild(o);
    });
  }

  // --- audio grabado real (mp3), con caída automática a voz sintética ---
  const CARPETA_AUDIO = 'audio/';
  const audioCache = {}; // nombre -> HTMLAudioElement (disponible) | null (no disponible)

  function claveArchivoLetra(letra){
    return letra === 'Ñ' ? 'enie' : letra.toLowerCase();
  }

  function nombresDeAudio(){
    const nombres = [
      'saludo','instruccion','escuche','pregunta',
      'acierto-1','acierto-2','acierto-3',
      'error-1','error-2',
      'logrado'
    ];
    ALFABETO.forEach(letra => {
      const clave = claveArchivoLetra(letra);
      nombres.push('letra-' + clave, 'sonido-' + clave);
    });
    return nombres;
  }

  function precargarAudio(nombre){
    return new Promise((resolve) => {
      const audio = new Audio(CARPETA_AUDIO + nombre + '.mp3');
      let listo = false;
      const marcarDisponible = () => { if (!listo){ listo = true; audioCache[nombre] = audio; resolve(); } };
      const marcarNoDisponible = () => { if (!listo){ listo = true; audioCache[nombre] = null; resolve(); } };
      audio.addEventListener('canplaythrough', marcarDisponible, { once:true });
      audio.addEventListener('error', marcarNoDisponible, { once:true });
      audio.preload = 'auto';
      audio.load();
      setTimeout(marcarNoDisponible, 5000);
    });
  }

  function precargarTodosLosAudios(){
    return Promise.all(nombresDeAudio().map(precargarAudio));
  }

  window.addEventListener('load', () => { precargarTodosLosAudios(); });

  // Reproduce el mp3 grabado si existe; si no existe o falla, usa voz sintética. Nunca queda mudo.
  function reproducirConFallback(nombre, textoFallback, opts = {}){
    const audio = audioCache[nombre];
    if (audio){
      try{
        audio.currentTime = 0;
        audio.onended = opts.alTerminar || null;
        const p = audio.play();
        if (p && p.catch){
          p.catch(() => hablar(textoFallback, opts));
        }
        return;
      }catch(e){}
    }
    hablar(textoFallback, opts);
  }

  // Efectos de acierto/error: intenta el mp3 grabado, si no existe cae al tono sintetizado.
  function reproducirEfecto(nombre, alFallar){
    const audio = audioCache[nombre];
    if (audio){
      try{
        audio.currentTime = 0;
        const p = audio.play();
        if (p && p.catch) p.catch(alFallar);
        return;
      }catch(e){}
    }
    alFallar();
  }

  function elegirAlAzar(nombres){
    const disponibles = nombres.filter(n => audioCache[n]);
    if (!disponibles.length) return null;
    return disponibles[Math.floor(Math.random() * disponibles.length)];
  }

  function sonidoAcierto(){
    const elegido = elegirAlAzar(['acierto-1','acierto-2','acierto-3']);
    if (!elegido){ sonidoExito(); return; }
    reproducirEfecto(elegido, sonidoExito);
  }

  function sonidoDeError(){
    const elegido = elegirAlAzar(['error-1','error-2']);
    if (!elegido){ sonidoError(); return; }
    reproducirEfecto(elegido, sonidoError);
  }

  // --- interruptor: nombre de la letra / sonido de la letra ---
  const MODO_LETRA_KEY = 'taller-letras-modo-letra';
  let modoLetra = 'nombre';
  try{
    const guardado = localStorage.getItem(MODO_LETRA_KEY);
    if (guardado === 'sonido' || guardado === 'nombre') modoLetra = guardado;
  }catch(e){}

  function actualizarSegmentado(){
    document.querySelectorAll('#segmentado-modo-letra .segmento').forEach(btn => {
      btn.classList.toggle('activo', btn.dataset.modo === modoLetra);
    });
  }
  document.querySelectorAll('#segmentado-modo-letra .segmento').forEach(btn => {
    btn.addEventListener('click', () => {
      modoLetra = btn.dataset.modo;
      try{ localStorage.setItem(MODO_LETRA_KEY, modoLetra); }catch(e){}
      actualizarSegmentado();
    });
  });
  actualizarSegmentado();

  // --- nivel de dificultad: cuántas letras se muestran de pista en los espacios ---
  const NIVEL_KEY = 'taller-letras-nivel';
  let nivelDificultad = 'dificil';
  try{
    const guardadoNivel = localStorage.getItem(NIVEL_KEY);
    if (['facil','medio','dificil'].includes(guardadoNivel)) nivelDificultad = guardadoNivel;
  }catch(e){}

  function actualizarSegmentadoNivel(){
    document.querySelectorAll('#segmentado-nivel .segmento').forEach(btn => {
      btn.classList.toggle('activo', btn.dataset.nivel === nivelDificultad);
    });
  }
  document.querySelectorAll('#segmentado-nivel .segmento').forEach(btn => {
    btn.addEventListener('click', () => {
      nivelDificultad = btn.dataset.nivel;
      try{ localStorage.setItem(NIVEL_KEY, nivelDificultad); }catch(e){}
      actualizarSegmentadoNivel();
    });
  });
  actualizarSegmentadoNivel();

  function decirLetra(letra){
    const clave = claveArchivoLetra(letra);
    const archivo = (modoLetra === 'sonido' ? 'sonido-' : 'letra-') + clave;
    const textoFallback = modoLetra === 'sonido' ? letra.toLowerCase() : (NOMBRE_LETRA[letra] || letra.toLowerCase());
    reproducirConFallback(archivo, textoFallback);
  }

  // --- premios: metas que cargan mamá y papá ---
  const METAS_KEY = 'taller-letras-metas';
  let metas = [];
  try{
    const guardado = JSON.parse(localStorage.getItem(METAS_KEY) || '[]');
    if (Array.isArray(guardado)) metas = guardado;
  }catch(e){}

  function guardarMetas(){
    try{ localStorage.setItem(METAS_KEY, JSON.stringify(metas)); }catch(e){}
  }

  function hoyISO(){
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }

  function diasEntre(a, b){
    return Math.round((new Date(b) - new Date(a)) / 86400000);
  }

  // Suma el progreso de cada meta activa según su modo de conteo y devuelve
  // las que se acaban de cumplir con esta palabra.
  function registrarPalabraLograda(){
    const hoy = hoyISO();
    const cumplidasAhora = [];
    metas.forEach(m => {
      if (m.estado !== 'activa') return;
      if (m.modo === 'total'){
        m.progreso++;
      } else if (m.modo === 'periodo'){
        if (!m.inicioPeriodo || diasEntre(m.inicioPeriodo, hoy) >= (m.periodoDias || 7)){
          m.progreso = 0;
          m.inicioPeriodo = hoy;
        }
        m.progreso++;
      } else if (m.modo === 'racha'){
        if (!m.ultimoDia || diasEntre(m.ultimoDia, hoy) === 1){
          m.progreso++;
        } else if (m.ultimoDia !== hoy){
          m.progreso = 1;
        }
        m.ultimoDia = hoy;
      }
      if (m.progreso >= m.cantidad){
        m.estado = 'cumplida-pendiente';
        m.fechaCumplida = hoy;
        cumplidasAhora.push(m);
      }
    });
    guardarMetas();
    return cumplidasAhora;
  }

  function etiquetaModoMeta(modo){
    return modo === 'total' ? 'total acumulado' : modo === 'periodo' ? 'por período' : 'racha de días seguidos';
  }

  // El ícono del premio empieza apagado (gris) y se va "encendiendo" a color con el progreso.
  function aplicarEstiloProgresoIcono(el, progreso, cantidad){
    const proporcion = Math.min(1, progreso / (cantidad || 1));
    el.style.filter = `grayscale(${1 - proporcion})`;
    el.style.opacity = String(0.4 + proporcion * 0.6);
  }

  const panelPremios = document.getElementById('panel-premios');
  const listaMetasEl = document.getElementById('lista-metas');
  const btnNuevaMeta = document.getElementById('btn-nueva-meta');
  const formNuevaMeta = document.getElementById('form-nueva-meta');
  const inputPremio = document.getElementById('input-premio');
  const inputCantidadMeta = document.getElementById('input-cantidad-meta');
  const campoPeriodoMeta = document.getElementById('campo-periodo-meta');
  const inputPeriodoDias = document.getElementById('input-periodo-dias');
  const btnGuardarMeta = document.getElementById('btn-guardar-meta');
  const btnCancelarMeta = document.getElementById('btn-cancelar-meta');
  const btnCerrarPremios = document.getElementById('btn-cerrar-premios');

  let modoMetaNueva = 'total';
  let iconoMetaNueva = '🍦';

  function actualizarSegmentadoMeta(){
    document.querySelectorAll('#segmentado-modo-meta .segmento').forEach(btn => {
      btn.classList.toggle('activo', btn.dataset.modo === modoMetaNueva);
    });
  }
  document.querySelectorAll('#segmentado-modo-meta .segmento').forEach(btn => {
    btn.addEventListener('click', () => {
      modoMetaNueva = btn.dataset.modo;
      actualizarSegmentadoMeta();
      campoPeriodoMeta.hidden = modoMetaNueva !== 'periodo';
    });
  });

  function actualizarSelectorIconos(){
    document.querySelectorAll('#selector-iconos-premio .icono-premio-btn').forEach(btn => {
      btn.classList.toggle('activo', btn.dataset.icono === iconoMetaNueva);
    });
  }
  document.querySelectorAll('#selector-iconos-premio .icono-premio-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      iconoMetaNueva = btn.dataset.icono;
      actualizarSelectorIconos();
    });
  });

  function renderMetas(){
    listaMetasEl.innerHTML = '';
    if (!metas.length){
      const p = document.createElement('p');
      p.className = 'fila-meta-progreso';
      p.textContent = 'Todavía no hay metas. Creen la primera.';
      listaMetasEl.appendChild(p);
      return;
    }
    metas.slice()
      .sort((a,b) => (a.estado === b.estado ? 0 : a.estado === 'cumplida-pendiente' ? -1 : 1))
      .forEach(m => {
        const fila = document.createElement('div');
        fila.className = 'fila-meta' + (m.estado === 'cumplida-pendiente' ? ' cumplida' : '');

        const top = document.createElement('div');
        top.className = 'fila-meta-top';
        const icono = document.createElement('span');
        icono.className = 'fila-meta-icono';
        icono.textContent = m.icono || '🎁';
        aplicarEstiloProgresoIcono(icono, m.progreso, m.cantidad);
        const nombre = document.createElement('span');
        nombre.className = 'fila-meta-premio';
        nombre.textContent = m.premio;
        nombre.style.flex = '1';
        const progresoTxt = document.createElement('span');
        progresoTxt.className = 'fila-meta-progreso';
        progresoTxt.textContent = `${Math.min(m.progreso, m.cantidad)}/${m.cantidad}`;
        top.appendChild(icono);
        top.appendChild(nombre);
        top.appendChild(progresoTxt);
        fila.appendChild(top);

        const barra = document.createElement('div');
        barra.className = 'barra-meta';
        const relleno = document.createElement('div');
        relleno.className = 'barra-meta-relleno';
        relleno.style.width = Math.min(100, Math.round((m.progreso / m.cantidad) * 100)) + '%';
        barra.appendChild(relleno);
        fila.appendChild(barra);

        const nota = document.createElement('p');
        nota.className = 'fila-meta-progreso';
        nota.textContent = m.estado === 'cumplida-pendiente' ? '¡Cumplida! Falta entregar.' : ('Meta: ' + etiquetaModoMeta(m.modo));
        fila.appendChild(nota);

        const acciones = document.createElement('div');
        acciones.className = 'fila-meta-acciones';
        if (m.estado === 'cumplida-pendiente'){
          const btnEntregado = document.createElement('button');
          btnEntregado.className = 'btn-texto-mini';
          btnEntregado.textContent = '✓ Marcar entregado';
          btnEntregado.addEventListener('click', () => {
            metas = metas.filter(x => x.id !== m.id);
            guardarMetas();
            renderMetas();
          });
          acciones.appendChild(btnEntregado);
        }
        const btnEliminar = document.createElement('button');
        btnEliminar.className = 'btn-texto-mini eliminar';
        btnEliminar.textContent = 'Eliminar';
        btnEliminar.addEventListener('click', () => {
          metas = metas.filter(x => x.id !== m.id);
          guardarMetas();
          renderMetas();
        });
        acciones.appendChild(btnEliminar);
        fila.appendChild(acciones);

        listaMetasEl.appendChild(fila);
      });
  }

  function abrirPanelPremios(){
    panelVoz.hidden = true;
    formNuevaMeta.hidden = true;
    renderMetas();
    panelPremios.hidden = false;
  }

  // Pantalla donde el niño elige por qué premio quiere jugar esta vez.
  function construirGrillaElegirPremio(activas){
    const cont = document.getElementById('grilla-elegir-premio');
    cont.innerHTML = '';
    activas.forEach(m => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'premio-elegir-btn';

      const emoji = document.createElement('span');
      emoji.className = 'premio-elegir-emoji';
      emoji.textContent = m.icono || '🎁';
      aplicarEstiloProgresoIcono(emoji, m.progreso, m.cantidad);

      const nombre = document.createElement('span');
      nombre.className = 'premio-elegir-nombre';
      nombre.textContent = m.premio;

      const faltan = Math.max(0, m.cantidad - m.progreso);
      const restante = document.createElement('span');
      restante.className = 'premio-elegir-restante';
      restante.textContent = faltan === 1 ? 'Falta 1 palabra' : `Faltan ${faltan} palabras`;

      btn.appendChild(emoji);
      btn.appendChild(nombre);
      btn.appendChild(restante);
      btn.addEventListener('click', () => seleccionarPremioParaJugar(m));
      cont.appendChild(btn);
    });
  }

  function seleccionarPremioParaJugar(meta){
    const faltan = Math.max(0, meta.cantidad - meta.progreso);
    const frase = faltan > 0
      ? `¡Ok! Seleccionaste ${meta.premio}. Necesitas ${faltan} ${faltan === 1 ? 'palabra' : 'palabras'} más. ¡A jugar!`
      : `¡Ok! Seleccionaste ${meta.premio}. ¡Ya casi lo tienes! ¡A jugar!`;
    hablar(frase, { alTerminar: () => mostrarEscena('escena-mic') });
  }

  document.getElementById('btn-saltar-premio').addEventListener('click', () => {
    mostrarEscena('escena-mic');
    setTimeout(() => reproducirConFallback('instruccion', 'Dime una palabra y la escribimos juntos'), 200);
  });

  btnNuevaMeta.addEventListener('click', () => {
    formNuevaMeta.hidden = false;
    inputPremio.value = '';
    inputCantidadMeta.value = '10';
    modoMetaNueva = 'total';
    actualizarSegmentadoMeta();
    iconoMetaNueva = '🍦';
    actualizarSelectorIconos();
    campoPeriodoMeta.hidden = true;
    inputPeriodoDias.value = '7';
    inputPremio.focus();
  });

  btnCancelarMeta.addEventListener('click', () => { formNuevaMeta.hidden = true; });

  btnGuardarMeta.addEventListener('click', () => {
    const premio = inputPremio.value.trim();
    const cantidad = parseInt(inputCantidadMeta.value, 10);
    if (!premio || !cantidad || cantidad < 1) return;
    const nueva = {
      id: 'm' + Date.now(),
      premio,
      icono: iconoMetaNueva,
      cantidad,
      modo: modoMetaNueva,
      progreso: 0,
      estado: 'activa'
    };
    if (modoMetaNueva === 'periodo'){
      nueva.periodoDias = parseInt(inputPeriodoDias.value, 10) || 7;
      nueva.inicioPeriodo = hoyISO();
    }
    metas.push(nueva);
    guardarMetas();
    formNuevaMeta.hidden = true;
    renderMetas();
  });

  btnCerrarPremios.addEventListener('click', () => { panelPremios.hidden = true; });

  document.getElementById('btn-premios').addEventListener('click', abrirPanelPremios);

  function mostrarPremioLogrado(logrados){
    const el = document.getElementById('premio-logrado');
    if (!logrados.length){ el.hidden = true; return; }
    el.hidden = false;
    el.textContent = logrados.length === 1
      ? `${logrados[0].icono || '🎁'} ¡Ganaste tu premio: ${logrados[0].premio}!`
      : `${logrados.map(m => m.icono || '🎁').join(' ')} ¡Ganaste ${logrados.length} premios! Cuéntaselo a mamá y a papá.`;
  }

  // --- audio: efectos sintéticos (respaldo) ---
  let audioCtx;
  function obtenerAudioCtx(){
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }
  function sonidoExito(){
    try{
      const ctx = obtenerAudioCtx();
      (SONIDOS_TEMA[temaActual] || SONIDOS_TEMA.default).acierto(ctx);
    }catch(e){}
  }
  function sonidoError(){
    try{
      const ctx = obtenerAudioCtx();
      (SONIDOS_TEMA[temaActual] || SONIDOS_TEMA.default).error(ctx);
    }catch(e){}
  }
  function vibrar(patron){
    if (navigator.vibrate) navigator.vibrate(patron);
  }

  // --- grabación de la propia voz del niño (confirmación) ---
  const soportaGrabacion = typeof MediaRecorder !== 'undefined' &&
    !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  let mediaRecorder = null;
  let chunksGrabacion = [];
  let streamActivo = null;
  let audioGrabadoURL = null;

  function iniciarGrabacionPropia(stream){
    if (!soportaGrabacion) return;
    try{
      chunksGrabacion = [];
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size) chunksGrabacion.push(e.data); };
      mediaRecorder.start();
    }catch(e){
      mediaRecorder = null;
    }
  }

  function detenerGrabacionPropia(){
    return new Promise((resolve) => {
      if (mediaRecorder && mediaRecorder.state !== 'inactive'){
        mediaRecorder.onstop = () => {
          if (chunksGrabacion.length){
            audioGrabadoURL = URL.createObjectURL(new Blob(chunksGrabacion, { type: mediaRecorder.mimeType || 'audio/webm' }));
          }
          resolve();
        };
        mediaRecorder.stop();
      } else {
        resolve();
      }
      if (streamActivo){
        streamActivo.getTracks().forEach(t => t.stop());
        streamActivo = null;
      }
    });
  }

  function limpiarGrabacionPropia(){
    if (audioGrabadoURL){ URL.revokeObjectURL(audioGrabadoURL); audioGrabadoURL = null; }
    btnMiVoz.hidden = true;
  }

  function actualizarBotonMiVoz(){
    btnMiVoz.hidden = !(soportaGrabacion && audioGrabadoURL);
  }

  if (!soportaGrabacion) btnMiVoz.hidden = true;

  btnMiVoz.addEventListener('click', () => {
    if (!audioGrabadoURL) return;
    new Audio(audioGrabadoURL).play().catch(() => {});
  });

  // --- reconocimiento de voz ---
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognizer = null;
  if (SpeechRecognition){
    recognizer = new SpeechRecognition();
    recognizer.lang = 'es-CL';
    recognizer.continuous = false;
    recognizer.interimResults = false;
    recognizer.maxAlternatives = 1;

    recognizer.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      procesarPalabraEscuchada(transcript);
    };
    recognizer.onerror = (e) => {
      btnMic.classList.remove('escuchando');
      const mensajes = {
        'not-allowed': 'El micrófono está bloqueado. Dale permiso al sitio y vuelve a intentar.',
        'service-not-allowed': 'El micrófono está bloqueado en esta vista. Abre la app en el navegador del celular.',
        'no-speech': 'No escuché nada. Toca el micrófono y habla más cerca.',
        'audio-capture': 'No encuentro el micrófono de este equipo.',
        'network': 'El dictado necesita internet. Revisa la conexión.'
      };
      estadoMic.textContent = mensajes[e.error] || 'No te escuché bien. Intenta de nuevo o escribe la palabra.';
      fallbackTexto.hidden = false;
    };
    recognizer.onend = () => {
      btnMic.classList.remove('escuchando');
      detenerGrabacionPropia().then(actualizarBotonMiVoz);
    };
  } else {
    fallbackTexto.hidden = false;
    estadoMic.textContent = 'Este navegador no tiene dictado por voz.';
  }

  // En una vista previa incrustada el micrófono nunca está permitido: avisarlo de entrada.
  const enVistaPrevia = window.self !== window.top;
  if (enVistaPrevia){
    fallbackTexto.hidden = false;
    estadoMic.textContent = 'Estás en la vista previa: aquí el micrófono no funciona. Abre la app en el navegador del celular.';
  }

  function arrancarReconocimiento(){
    try{
      estadoMic.textContent = 'Te escucho...';
      btnMic.classList.add('escuchando');
      recognizer.start();
    }catch(e){
      btnMic.classList.remove('escuchando');
      estadoMic.textContent = 'No pude activar el micrófono. Escribe la palabra por ahora.';
      fallbackTexto.hidden = false;
    }
  }

  btnMic.addEventListener('click', () => {
    obtenerAudioCtx();
    limpiarGrabacionPropia();
    if (!recognizer){ fallbackTexto.hidden = false; return; }

    // Pedir el permiso explícitamente hace que salga el diálogo del navegador.
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          streamActivo = stream;
          iniciarGrabacionPropia(stream);
          arrancarReconocimiento();
        })
        .catch(() => {
          estadoMic.textContent = 'El micrófono está bloqueado. Revisa los permisos del sitio en el navegador.';
          fallbackTexto.hidden = false;
        });
    } else {
      arrancarReconocimiento();
    }
  });

  btnUsarTexto.addEventListener('click', () => {
    if (inputPalabra.value.trim()){ limpiarGrabacionPropia(); procesarPalabraEscuchada(inputPalabra.value); }
  });
  inputPalabra.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && inputPalabra.value.trim()){ limpiarGrabacionPropia(); procesarPalabraEscuchada(inputPalabra.value); }
  });

  function procesarPalabraEscuchada(raw){
    const partes = raw.trim().split(/\s+/);
    const limpio = partes[partes.length - 1].replace(/[.,!?¡¿]/g,'');
    if (!limpio) return;
    palabraActual = limpio;
    palabraEscuchadaEl.textContent = limpio.toUpperCase();
    document.getElementById('ilustracion-confirmar').textContent = ILUSTRACIONES[normalizar(limpio)] || '✨';
    mostrarEscena('escena-confirmar');
    anunciarPalabraEscuchada(limpio);
  }

  function anunciarPalabraEscuchada(palabra){
    reproducirConFallback('escuche', 'Escuché', {
      alTerminar: () => {
        hablar(palabra, { cancelar:false, alTerminar: () => {
          reproducirConFallback('pregunta', `¿Dijiste ${palabra}?`, { pitch:1.4, rate:0.82, cancelar:false });
        }});
      }
    });
  }

  btnRepetirAudio.addEventListener('click', () => hablar(palabraActual));

  btnSi.addEventListener('click', () => { limpiarGrabacionPropia(); iniciarDeletreo(palabraActual); });
  btnNo.addEventListener('click', () => {
    limpiarGrabacionPropia();
    estadoMic.textContent = '';
    mostrarEscena('escena-mic');
  });

  // --- deletreo ---
  function iniciarDeletreo(palabra){
    const limpio = normalizar(palabra).toUpperCase().replace(/[^A-ZÑ]/g,'');
    if (!limpio){ mostrarEscena('escena-mic'); return; }
    wordArr = limpio.split('');
    pointer = 0;
    construirSlots();
    construirAlfabeto();
    document.getElementById('ilustracion-referencia').textContent = ILUSTRACIONES[normalizar(palabra)] || '✨';
    actualizarIlustracionReferencia();
    mostrarEscena('escena-deletrear');
    hablar('Ahora escribamos la palabra. Toca las letras en orden.');
  }

  // La imagen de referencia empieza borrosa y en gris, y se va revelando
  // a color y nítida a medida que se completan las letras.
  function actualizarIlustracionReferencia(){
    const el = document.getElementById('ilustracion-referencia');
    if (!el) return;
    const total = wordArr.length || 1;
    const proporcion = Math.min(1, pointer / total);
    const desenfoque = (1 - proporcion) * 10;
    const gris = 1 - proporcion;
    const opacidad = 0.35 + proporcion * 0.65;
    const escala = 0.85 + proporcion * 0.15;
    el.style.filter = `blur(${desenfoque}px) grayscale(${gris})`;
    el.style.opacity = opacidad;
    el.style.transform = `scale(${escala})`;
  }

  function construirSlots(){
    slotsEl.innerHTML = '';
    wordArr.forEach((letra, i) => {
      const div = document.createElement('div');
      div.className = 'slot';
      div.dataset.index = i;
      const esPrimera = i === 0;
      const esUltima = i === wordArr.length - 1;
      const mostrarPista = (nivelDificultad === 'facil' && (esPrimera || esUltima)) ||
                            (nivelDificultad === 'medio' && esPrimera);
      if (mostrarPista){
        div.textContent = letra;
        div.classList.add('pista');
      }
      slotsEl.appendChild(div);
    });
  }

  function construirAlfabeto(){
    alfabetoEl.innerHTML = '';
    const unicas = new Set(wordArr);
    ALFABETO.forEach(letra => {
      const btn = document.createElement('button');
      btn.className = 'letra-tile ' + (unicas.has(letra) ? 'objetivo' : 'atenuado');
      btn.textContent = letra;
      if (unicas.has(letra)){
        btn.addEventListener('click', () => tocarLetra(letra, btn));
      } else {
        btn.disabled = true;
        btn.tabIndex = -1;
      }
      alfabetoEl.appendChild(btn);
    });
  }

  function tocarLetra(letra, tileEl){
    if (letra === wordArr[pointer]){
      exito(tileEl, pointer);
    } else {
      error(tileEl);
    }
  }

  function animarAvatar(estado){
    const avatarEl = document.getElementById('avatar');
    if (!avatarEl) return;
    avatarEl.classList.remove('acierto', 'error');
    void avatarEl.offsetWidth; // fuerza reflow para poder repetir la animación
    avatarEl.classList.add(estado);
  }

  function error(tileEl){
    sonidoDeError();
    vibrar([60,40,60]);
    animarAvatar('error');
    tileEl.classList.add('error');
    setTimeout(() => tileEl.classList.remove('error'), 350);
  }

  function exito(tileEl, idx){
    sonidoAcierto();
    vibrar(40);
    animarAvatar('acierto');
    const slotEl = slotsEl.children[idx];
    const letra = wordArr[idx];

    const terminar = () => {
      slotEl.textContent = letra;
      slotEl.classList.remove('pista');
      slotEl.classList.add('lleno');
      decirLetra(letra);
      pointer++;
      actualizarIlustracionReferencia();
      if (pointer === wordArr.length){
        setTimeout(() => celebrar(palabraActual), 750);
      }
    };

    if (reduceMovimiento){
      terminar();
      return;
    }

    const tileRect = tileEl.getBoundingClientRect();
    const slotRect = slotEl.getBoundingClientRect();
    const clone = document.createElement('div');
    clone.className = 'letra-volando';
    clone.textContent = letra;
    clone.style.left = tileRect.left + 'px';
    clone.style.top = tileRect.top + 'px';
    clone.style.width = tileRect.width + 'px';
    clone.style.height = tileRect.height + 'px';
    clone.style.fontSize = getComputedStyle(tileEl).fontSize;
    document.body.appendChild(clone);

    requestAnimationFrame(() => {
      const dx = slotRect.left - tileRect.left + (slotRect.width - tileRect.width) / 2;
      const dy = slotRect.top - tileRect.top + (slotRect.height - tileRect.height) / 2;
      const escala = Math.min(1.1, slotRect.width / tileRect.width * 1.3);
      clone.style.transform = `translate(${dx}px, ${dy}px) scale(${escala})`;
      clone.style.opacity = '0';
    });

    clone.addEventListener('transitionend', () => {
      clone.remove();
      terminar();
    }, { once:true });
  }

  function celebrar(palabra){
    mostrarEscena('escena-celebrar');
    const emoji = ILUSTRACIONES[normalizar(palabra)] || '✨';
    ilustracionEl.textContent = emoji;
    palabraFinalEl.textContent = palabra.toUpperCase();
    reproducirConFallback('logrado', `¡Muy bien, ${NOMBRE_NINO}! Escribiste ${palabra}`);
    if (!reduceMovimiento) lanzarConfeti();
    mostrarPremioLogrado(registrarPalabraLograda());
  }

  function lanzarConfeti(){
    const colores = ['#FF6B4A','#23A79A','#8C7AE6','#45B36B','#FFC24A'];
    for (let i = 0; i < 16; i++){
      const c = document.createElement('div');
      c.className = 'confeti';
      c.style.left = (10 + Math.random() * 80) + 'vw';
      c.style.background = colores[i % colores.length];
      c.style.animationDelay = (Math.random() * 0.3) + 's';
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 1900);
    }
  }

  btnOtra.addEventListener('click', () => {
    palabraActual = '';
    wordArr = [];
    pointer = 0;
    inputPalabra.value = '';
    estadoMic.textContent = '';
    limpiarGrabacionPropia();
    mostrarEscena('escena-mic');
  });

  document.getElementById('saludo-titulo').textContent = `¡Hola, ${NOMBRE_NINO}!`;

  const estadoSonido = document.getElementById('estado-sonido');
  const panelVoz = document.getElementById('panel-voz');
  const selectorVoz = document.getElementById('selector-voz');

  document.getElementById('btn-ajustes').addEventListener('click', () => {
    obtenerAudioCtx();
    panelVoz.hidden = !panelVoz.hidden;
  });
  document.getElementById('btn-cerrar-panel').addEventListener('click', () => {
    panelVoz.hidden = true;
  });

  selectorVoz.addEventListener('change', () => {
    const i = parseInt(selectorVoz.value, 10);
    if (!isNaN(i) && vocesEs[i]){
      vozElegida = vocesEs[i];
      hablar(`Hola ${NOMBRE_NINO}, así sueno yo`);
    }
  });

  document.getElementById('btn-probar-sonido').addEventListener('click', () => {
    obtenerAudioCtx();
    sonidoExito();
    vibrar(40);
    estadoSonido.classList.remove('problema');
    estadoSonido.textContent = 'Probando...';

    if (!('speechSynthesis' in window)){
      estadoSonido.classList.add('problema');
      estadoSonido.textContent = 'Este navegador no tiene voz. Ábrela en Chrome o Safari del celular.';
      return;
    }

    let arranco = false;
    hablar(`Hola ${NOMBRE_NINO}, ¿me escuchas bien?`);
    const marcar = setInterval(() => {
      if (speechSynthesis.speaking){
        arranco = true;
        clearInterval(marcar);
        estadoSonido.textContent = 'El audio funciona. Si no escuchaste, sube el volumen y saca el silencio del celular.';
      }
    }, 150);

    setTimeout(() => {
      clearInterval(marcar);
      if (!arranco){
        estadoSonido.classList.add('problema');
        estadoSonido.textContent = 'La voz no se activó en esta vista. Abre la app en el navegador del celular.';
      }
    }, 2200);
  });

  // El saludo suena en la pantalla de inicio, apenas el niño toca la pantalla.
  let saludoDicho = false;
  function decirSaludo(){
    if (saludoDicho) return;
    saludoDicho = true;
    obtenerAudioCtx();
    reproducirConFallback('saludo', `¡Hola, ${NOMBRE_NINO}! Bienvenido al Taller de Letras.`);
  }

  document.getElementById('escena-bienvenida').addEventListener('pointerdown', decirSaludo);
  window.addEventListener('load', () => { setTimeout(decirSaludo, 400); });

  mostrarEscena('escena-bienvenida');
})();
