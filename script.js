
function mostrarModalJsonImportar() {
  try {
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
    label.textContent = "Pega aquí el JSON de los timers:";
    label.style.color = '#fff';
    label.style.marginBottom = '8px';

    let area = document.createElement('textarea');
    area.placeholder = "Pega aquí el JSON de los timers";
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

    let errorDiv = document.createElement('div');
    errorDiv.style.color = '#f87171';
    errorDiv.style.marginBottom = '8px';

    let btnImportar = document.createElement('button');
    btnImportar.textContent = 'Importar';
    btnImportar.className = 'bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded shadow transition w-full mb-2';
    btnImportar.onclick = () => {
      try {
        let json = area.value.trim();
        
        // Si está vacío, no hacer nada y mostrar error
        if (!json) {
          errorDiv.textContent = 'Por favor ingresa un JSON válido.';
          return;
        }
        
        let data;
        try {
          data = JSON.parse(json);
        } catch (e) {
          errorDiv.textContent = 'JSON inválido: ' + e.message;
          return;
        }
        
        for (let i = 0; i < totalCasas; i++) {
          const key = `timer-${i}`;
          if (data[key]) {
            localStorage.setItem(key, JSON.stringify(data[key]));
          }
        }
        document.body.removeChild(modal);
        location.reload();
      } catch (e) {
        console.error("Error importing timers:", e);
        errorDiv.textContent = 'Error al importar los timers.';
      }
    };

    let btnCerrar = document.createElement('button');
    btnCerrar.textContent = 'Cancelar';
    btnCerrar.className = 'bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded shadow transition w-full';
    btnCerrar.onclick = () => {
      try {
        document.body.removeChild(modal);
      } catch (e) {
        console.error("Error closing modal:", e);
      }
    };

    box.appendChild(label);
    box.appendChild(area);
    box.appendChild(errorDiv);
    box.appendChild(btnImportar);
    box.appendChild(btnCerrar);
    modal.appendChild(box);
    document.body.appendChild(modal);
    
  } catch (e) {
    console.error("Error creating import modal:", e);
  }
}// script.js

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

const alertaPreviaPlayed = Array(totalCasas).fill(false);
const alertaNegativa1Played = Array(totalCasas).fill(false);
const alertaNegativa2Played = Array(totalCasas).fill(false);

const startTimes = Array(totalCasas).fill(null);
const totalDurations = Array(totalCasas).fill(35 * 60);

window.addEventListener("load", () => {
  for (let i = 0; i < totalCasas; i++) {
    const saved = JSON.parse(localStorage.getItem(`timer-${i}`));
    if (saved) {
      extended[i] = saved.extended;
      negatives[i] = saved.negative || false;
      startTimes[i] = saved.startTime || null;
      totalDurations[i] = saved.totalDuration || 35 * 60;
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
    let btnsContainer = overlay.querySelector(".timer-btns");
    if (btnsContainer) btnsContainer.remove();
    btnsContainer = document.createElement("div");
    btnsContainer.className = "timer-btns flex gap-2 mt-2";

    const btnRestart = document.createElement("button");
    btnRestart.textContent = "Reiniciar";
    btnRestart.className = "btn-restart bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-1 px-3 rounded";
    btnRestart.onclick = () => restartTimer(i);

    const btnStop = document.createElement("button");
    btnStop.textContent = "Detener";
    btnStop.className = "btn-stop bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded";
    btnStop.onclick = () => stopTimer(i);

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
    const overlay = card.querySelector(".overlay");
    if (overlay) {
      const btnsContainer = overlay.querySelector(".timer-btns");
      if (btnsContainer) btnsContainer.remove();
    }
  }

  aplicarFiltros();
}

// NUEVA FUNCIÓN: Filtrar timers activos
function filtrarActivos() {
  const toggleActivos = document.getElementById("toggle-activos");
  const cards = document.querySelectorAll(".card");

  cards.forEach(card => {
    const esActivo = card.getAttribute("data-activo") === "true";
    
    if (toggleActivos.checked) {
      // Mostrar solo activos
      if (esActivo) {
        card.style.display = "block";
      } else {
        card.style.display = "none";
      }
    } else {
      // Mostrar todos, pero respetar el filtro de ciudad
      card.style.display = "block";
    }
  });

  // Aplicar también el filtro de ciudad si está activo
  filtrarPorCiudad();
}

// NUEVA FUNCIÓN: Aplicar todos los filtros
function aplicarFiltros() {
  const ciudadSeleccionada = document.getElementById("ciudad-filter").value;
  const toggleActivos = document.getElementById("toggle-activos");
  const cards = document.querySelectorAll(".card");

  cards.forEach(card => {
    const ciudad = card.getAttribute("data-ciudad");
    const esActivo = card.getAttribute("data-activo") === "true";
    
    let mostrar = true;

    // Filtro por ciudad
    if (ciudadSeleccionada !== "Todas" && ciudad !== ciudadSeleccionada) {
      mostrar = false;
    }

    // Filtro por activos
    if (toggleActivos.checked && !esActivo) {
      mostrar = false;
    }

    card.style.display = mostrar ? "block" : "none";
  });
}

// FUNCIÓN CORREGIDA: Filtrar por ciudad
function filtrarPorCiudad() {
  aplicarFiltros();
}

// ---- Exportar / Importar ----
function exportarTimers() {
  const data = {};
  for (let i = 0; i < totalCasas; i++) {
    let timer = localStorage.getItem(`timer-${i}`);
    if (timer) {
      timer = JSON.parse(timer);
      if (timer.running && timer.startTime && typeof timer.totalDuration === "number") {
        const elapsed = Math.floor((Date.now() - timer.startTime) / 1000);
        if (!timer.extended && !timer.negative) {
          timer.duration = Math.max(timer.totalDuration - elapsed, 0);
        } else {
          timer.duration = -1 * (elapsed - timer.totalDuration);
        }
      }
      data[`timer-${i}`] = timer;
    }
  }
  return JSON.stringify(data, null, 2);
}

function exportarTimersUI() {
  const json = exportarTimers();
  mostrarModalJson("Copia este JSON para compartir tus timers:", json);
}

function mostrarImportarTimers() {
  mostrarModalJsonImportar();
}

function mostrarModalJson(labelText, json) {
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
  label.textContent = labelText;
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

function mostrarModalJsonImportar() {
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
  label.textContent = "Pega aquí el JSON de los timers:";
  label.style.color = '#fff';
  label.style.marginBottom = '8px';

  let area = document.createElement('textarea');
  area.placeholder = "Pega aquí el JSON de los timers";
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

  let errorDiv = document.createElement('div');
  errorDiv.style.color = '#f87171';
  errorDiv.style.marginBottom = '8px';

  let btnImportar = document.createElement('button');
  btnImportar.textContent = 'Importar';
  btnImportar.className = 'bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded shadow transition w-full mb-2';
  btnImportar.onclick = () => {
    let json = area.value.trim();
    
    // Si está vacío, no hacer nada
    if (!json) {
      errorDiv.textContent = 'Por favor ingresa un JSON válido.';
      return;
    }
    
    let data;
    try {
      data = JSON.parse(json);
    } catch (e) {
      errorDiv.textContent = 'JSON inválido.';
      return;
    }
    
    for (let i = 0; i < totalCasas; i++) {
      const key = `timer-${i}`;
      if (data[key]) {
        localStorage.setItem(key, JSON.stringify(data[key]));
      }
    }
    document.body.removeChild(modal);
    location.reload();
  };

  let btnCerrar = document.createElement('button');
  btnCerrar.textContent = 'Cancelar';
  btnCerrar.className = 'bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded shadow transition w-full';
  btnCerrar.onclick = () => document.body.removeChild(modal);

  box.appendChild(label);
  box.appendChild(area);
  box.appendChild(errorDiv);
  box.appendChild(btnImportar);
  box.appendChild(btnCerrar);
  modal.appendChild(box);
  document.body.appendChild(modal);
}
