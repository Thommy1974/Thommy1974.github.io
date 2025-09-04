const totalCasas = 12;
const alarmSound = document.getElementById("alarm-sound");
const alarmaUnicaSound = document.getElementById("alarma-unica-sound");

const alertStartSound = new Audio("/public/assets/alerta-inicio.mp3");
const alertEndSound = new Audio("/public/assets/alerta-final.mp3");

let startSoundInterval = null;
let endSoundInterval = null;
let startPlayCount = 0;
let endPlayCount = 0;

const timers = Array(totalCasas).fill(null);
const extended = Array(totalCasas).fill(false);
const negatives = Array(totalCasas).fill(false);

// Flags para evitar múltiples reproducciones de alertas
const alertaPreviaPlayed = Array(totalCasas).fill(false);
const alertaNegativa1Played = Array(totalCasas).fill(false);
const alertaNegativa2Played = Array(totalCasas).fill(false);

// Guardar el tiempo de inicio y duración total
const startTimes = Array(totalCasas).fill(null);
const totalDurations = Array(totalCasas).fill(35 * 60); // segundos

window.addEventListener("load", () => {
  for (let i = 0; i < totalCasas; i++) {
    const saved = JSON.parse(localStorage.getItem(`timer-${i}`));
    if (saved) {
      extended[i] = saved.extended;
      negatives[i] = saved.negative || false;
      startTimes[i] = saved.startTime || null;
      totalDurations[i] = saved.totalDuration || 35 * 60;
      // Si el timer estaba corriendo, restaurar
      if (saved.running) startTimer(i, true);
      else updateTimerDisplay(i, saved.duration ?? 35 * 60);
    } else {
      updateTimerDisplay(i, 35 * 60);
    }
  }
});

function saveTimerState(i, duration) {
  localStorage.setItem(`timer-${i}`, JSON.stringify({
    duration: duration,
    extended: extended[i],
    negative: negatives[i],
    running: !!timers[i],
    startTime: startTimes[i],
    totalDuration: totalDurations[i]
  }));
}

function playSoundLoop(audio, maxPlays, setIntervalRef, playCountRef) {
  audio.currentTime = 0;
  audio.play();

  playCountRef.count = 1;
  clearInterval(setIntervalRef.ref);
  setIntervalRef.ref = setInterval(() => {
    if (playCountRef.count >= maxPlays) {
      clearInterval(setIntervalRef.ref);
    } else {
      audio.currentTime = 0;
      audio.play();
      playCountRef.count++;
    }
  }, (audio.duration || 1) * 1000 + 200);
}

function stopAllSounds() {
  clearInterval(startSoundInterval);
  clearInterval(endSoundInterval);
  [alertStartSound, alertEndSound].forEach(sound => {
    sound.pause();
    sound.currentTime = 0;
  });
}

function startTimer(i, restoring = false) {
  if (timers[i]) clearInterval(timers[i]);
  stopAllSounds();

  alertaPreviaPlayed[i] = false;
  alertaNegativa1Played[i] = false;
  alertaNegativa2Played[i] = false;

  if (!restoring) {
    extended[i] = false;
    negatives[i] = false;
    startTimes[i] = Date.now();
    totalDurations[i] = 35 * 60;
  } else if (!startTimes[i]) {
    startTimes[i] = Date.now();
  }

  playSoundLoop(alertStartSound, 4, { ref: startSoundInterval = null }, { count: startPlayCount = 0 });

  const card = document.querySelector(`.card[data-id="${i}"]`);
  if (card) {
    card.classList.add("active-timer");
    card.setAttribute("data-activo", "true");
    const overlay = card.querySelector(".overlay");
    // Elimina contenedor anterior si existe
    let btnsContainer = overlay.querySelector(".timer-btns");
    if (btnsContainer) btnsContainer.remove();
    // Crea contenedor flex para los botones
    btnsContainer = document.createElement("div");
    btnsContainer.className = "timer-btns flex gap-2 mt-2";
    // Botón Reiniciar
    const btnRestart = document.createElement("button");
    btnRestart.textContent = "Reiniciar";
    btnRestart.className = "btn-restart bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-1 px-3 rounded";
    btnRestart.onclick = () => restartTimer(i);
    // Botón Detener
    const btnStop = document.createElement("button");
    btnStop.textContent = "Detener";
    btnStop.className = "btn-stop bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded";
    btnStop.onclick = () => stopTimer(i);
    // Añade ambos al contenedor
    btnsContainer.appendChild(btnRestart);
    btnsContainer.appendChild(btnStop);
    overlay.appendChild(btnsContainer);
  }

  timers[i] = setInterval(() => {
    let elapsed = Math.floor((Date.now() - startTimes[i]) / 1000);
    let remaining;
    if (!extended[i] && !negatives[i]) {
      remaining = totalDurations[i] - elapsed;
    } else {
      remaining = -1 * (elapsed - totalDurations[i]);
    }

    // ALERTA PREVIA y NEGATIVAS usan el mismo sonido ahora
    if (!negatives[i] && remaining === 10 && !alertaPreviaPlayed[i]) {
      alarmaUnicaSound.currentTime = 0;
      alarmaUnicaSound.play();
      alertaPreviaPlayed[i] = true;
    }
    if (negatives[i]) {
      if (remaining === -5 && !alertaNegativa1Played[i]) {
        alarmaUnicaSound.currentTime = 0;
        alarmaUnicaSound.play();
        alertaNegativa1Played[i] = true;
      }
      if (remaining === -10 && !alertaNegativa2Played[i]) {
        alarmaUnicaSound.currentTime = 0;
        alarmaUnicaSound.play();
        alertaNegativa2Played[i] = true;
      }
    }

    // Cambio de estado
    if (!negatives[i]) {
      if (remaining === 0 && !extended[i]) {
        alarmSound.play();
        extended[i] = true;
        negatives[i] = true;
        startTimes[i] = Date.now();
        totalDurations[i] = 0;
        document.getElementById(`timer-${i}`).classList.add("text-red-500");
        updateTimerDisplay(i, 0);
        saveTimerState(i, 0);
        return;
      }
      updateTimerDisplay(i, Math.max(remaining, 0));
      saveTimerState(i, Math.max(remaining, 0));
    } else {
      updateTimerDisplay(i, remaining);
      saveTimerState(i, remaining);
      if (remaining <= -600) {
        clearInterval(timers[i]);
        timers[i] = null;
        playSoundLoop(alertEndSound, 4, { ref: endSoundInterval = null }, { count: endPlayCount = 0 });
      }
    }
  }, 1000);

  aplicarFiltros();
}

function updateTimerDisplay(i, value) {
  const t = typeof value === "number" ? value : 35 * 60;
  const absTime = Math.abs(t);
  const min = String(Math.floor(absTime / 60)).padStart(2, '0');
  const sec = String(absTime % 60).padStart(2, '0');
  const prefix = t < 0 ? "-" : "";
  document.getElementById(`timer-${i}`).textContent = `${prefix}${min}:${sec}`;
}

function restartTimer(i) {
  clearInterval(timers[i]);
  extended[i] = false;
  negatives[i] = false;
  startTimes[i] = Date.now();
  totalDurations[i] = 35 * 60;
  document.getElementById(`timer-${i}`).classList.remove("text-red-500");
  updateTimerDisplay(i, 35 * 60);
  startTimer(i);
}

function stopTimer(i) {
  clearInterval(timers[i]);
  timers[i] = null;
  extended[i] = false;
  negatives[i] = false;
  startTimes[i] = null;
  totalDurations[i] = 35 * 60;

  alertaPreviaPlayed[i] = false;
  alertaNegativa1Played[i] = false;
  alertaNegativa2Played[i] = false;

  document.getElementById(`timer-${i}`).classList.remove("text-red-500");
  updateTimerDisplay(i, 35 * 60);
  stopAllSounds();

  localStorage.setItem(`timer-${i}`, JSON.stringify({
    duration: 35 * 60,
    extended: false,
    negative: false,
    running: false,
    startTime: null,
    totalDuration: 35 * 60
  }));

  const card = document.querySelector(`.card[data-id="${i}"]`);
  if (card) {
    card.classList.remove("active-timer");
    card.setAttribute("data-activo", "false");
    // Quitar contenedor de botones si existe
    const overlay = card.querySelector(".overlay");
    if (overlay) {
      const btnsContainer = overlay.querySelector(".timer-btns");
      if (btnsContainer) btnsContainer.remove();
    }
  }

  aplicarFiltros();
}

// Exportar timers: genera un JSON con el estado de todos los timers
function exportarTimers() {
  const data = {};
  for (let i = 0; i < totalCasas; i++) {
    const timer = localStorage.getItem(`timer-${i}`);
    if (timer) data[`timer-${i}`] = JSON.parse(timer);
  }
  return JSON.stringify(data, null, 2);
}

// UI para exportar: muestra el JSON en un modal estilizado y lo copia al portapapeles
function exportarTimersUI() {
  const json = exportarTimers();
  // Crear modal simple
  let modal = document.createElement('div');
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100vw';
  modal.style.height = '100vh';
  modal.style.background = 'rgba(0,0,0,0.7)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '9999';

  let box = document.createElement('div');
  box.style.background = '#1e293b';
  box.style.borderRadius = '12px';
  box.style.padding = '24px';
  box.style.boxShadow = '0 4px 24px 0 rgba(0,0,0,0.25)';
  box.style.maxWidth = '90vw';
  box.style.width = '400px';

  let label = document.createElement('div');
  label.textContent = "Copia este JSON para compartir tus timers:";
  label.style.color = '#fff';
  label.style.marginBottom = '8px';

  let area = document.createElement('textarea');
  area.value = json;
  area.readOnly = true;
  area.style.width = '100%';
  area.style.height = '180px';
  area.style.background = '#0f172a';
  area.style.color = '#fff';
  area.style.border = '1px solid #334155';
  area.style.borderRadius = '8px';
  area.style.padding = '10px';
  area.style.fontFamily = 'Fira Mono, Consolas, monospace';
  area.style.fontSize = '1rem';
  area.style.marginBottom = '12px';

  let btnCerrar = document.createElement('button');
  btnCerrar.textContent = 'Cerrar';
  btnCerrar.className = 'bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow transition w-full';
  btnCerrar.onclick = () => document.body.removeChild(modal);

  box.appendChild(label);
  box.appendChild(area);
  box.appendChild(btnCerrar);
  modal.appendChild(box);
  document.body.appendChild(modal);

  area.select();
  document.execCommand('copy');
}

// Mostrar área de importación
function mostrarImportarTimers() {
  document.getElementById('importar-timers-area').classList.remove('hidden');
  document.getElementById('importar-timers-json').value = '';
  document.getElementById('importar-timers-error').textContent = '';
}

// Ocultar área de importación
function ocultarImportarTimers() {
  document.getElementById('importar-timers-area').classList.add('hidden');
  document.getElementById('importar-timers-json').value = '';
  document.getElementById('importar-timers-error').textContent = '';
}

// Mostrar solo los timers activos si el checkbox está marcado
function filtrarActivos() {
  aplicarFiltros();
}

// Aplica los filtros de activos y ciudad (si existe el filtro de ciudad)
function aplicarFiltros() {
  const soloActivos = document.getElementById("toggle-activos")?.checked;
  const ciudadSeleccionada = document.getElementById("ciudad-filter")?.value;
  const cards = document.querySelectorAll(".card");
  cards.forEach(card => {
    const activo = card.classList.contains("active-timer");
    const ciudad = card.getAttribute("data-ciudad");
    let visible = true;
    if (soloActivos && !activo) visible = false;
    if (ciudadSeleccionada && ciudadSeleccionada !== "Todas" && ciudad !== ciudadSeleccionada) visible = false;
    card.style.display = visible ? "block" : "none";
  });
}

// Importar timers desde el área de texto
function importarTimersUI() {
  const json = document.getElementById('importar-timers-json').value;
  let data;
  try {
    data = JSON.parse(json);
  } catch (e) {
    document.getElementById('importar-timers-error').textContent = 'JSON inválido.';
    return;
  }
  for (let i = 0; i < totalCasas; i++) {
    const key = `timer-${i}`;
    if (data[key]) {
      localStorage.setItem(key, JSON.stringify(data[key]));
    }
  }
  // Recargar para que la lógica de timers y clases activas se aplique correctamente
  location.reload();
}
