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
    if (/mónica|monica|paulina|luciana|esperanza|helena|elvira|isidora|catalina|lucía|lucia/.test(n)) p += 25;
    if (/sabina|jorge|diego|raul|raúl|pablo/.test(n)) p += 5;
    if (lang === 'es-cl') p += 20;
    else if (lang === 'es-mx' || lang === 'es-us' || lang === 'es-ar') p += 14;
    else if (lang === 'es-es') p += 8;
    if (v.localService) p += 6;
    return p;
  }

  function cargarVoces(){
    vocesEs = speechSynthesis.getVoices()
      .filter(v => v.lang && v.lang.toLowerCase().startsWith('es'))
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

  function decirLetra(letra){
    const clave = claveArchivoLetra(letra);
    const archivo = (modoLetra === 'sonido' ? 'sonido-' : 'letra-') + clave;
    const textoFallback = modoLetra === 'sonido' ? letra.toLowerCase() : (NOMBRE_LETRA[letra] || letra.toLowerCase());
    reproducirConFallback(archivo, textoFallback);
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
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(700, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.12);
      g.gain.setValueAtTime(0.15, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + 0.17);
    }catch(e){}
  }
  function sonidoError(){
    try{
      const ctx = obtenerAudioCtx();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(180, ctx.currentTime);
      g.gain.setValueAtTime(0.12, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + 0.26);
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
    mostrarEscena('escena-deletrear');
    hablar('Ahora escribamos la palabra. Toca las letras en orden.');
  }

  function construirSlots(){
    slotsEl.innerHTML = '';
    wordArr.forEach((_, i) => {
      const div = document.createElement('div');
      div.className = 'slot';
      div.dataset.index = i;
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

  function error(tileEl){
    sonidoDeError();
    vibrar([60,40,60]);
    tileEl.classList.add('error');
    setTimeout(() => tileEl.classList.remove('error'), 350);
  }

  function exito(tileEl, idx){
    sonidoAcierto();
    vibrar(40);
    const slotEl = slotsEl.children[idx];
    const letra = wordArr[idx];

    const terminar = () => {
      slotEl.textContent = letra;
      slotEl.classList.add('lleno');
      decirLetra(letra);
      pointer++;
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

  document.getElementById('btn-comenzar').addEventListener('click', () => {
    obtenerAudioCtx();
    speechSynthesis.cancel();
    mostrarEscena('escena-mic');
    setTimeout(() => reproducirConFallback('instruccion', 'Dime una palabra y la escribimos juntos'), 200);
  });

  mostrarEscena('escena-bienvenida');
})();
