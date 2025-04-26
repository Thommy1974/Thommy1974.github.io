const totalCasas = 12;
const alarmSound = document.getElementById("alarm-sound");

const alertStartSound = new Audio("/public/assets/alerta-inicio.mp3");
const alertEndSound = new Audio("/public/assets/alerta-final.mp3");

let startSoundInterval = null;
let endSoundInterval = null;
let startPlayCount = 0;
let endPlayCount = 0;

const timers = Array(totalCasas).fill(null);
const durations = Array(totalCasas).fill(0);
const extended = Array(totalCasas).fill(false);
const negatives = Array(totalCasas).fill(false);

window.addEventListener("load", () => {
  for (let i = 0; i < totalCasas; i++) {
    const saved = JSON.parse(localStorage.getItem(`timer-${i}`));
    if (saved) {
      durations[i] = saved.duration;
      extended[i] = saved.extended;
      negatives[i] = saved.negative || false;
      updateTimerDisplay(i);
      if (saved.running) startTimer(i);
    }
  }
});

function saveTimerState(i) {
  localStorage.setItem(`timer-${i}`, JSON.stringify({
    duration: durations[i],
    extended: extended[i],
    negative: negatives[i],
    running: !!timers[i]
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

function startTimer(i) {
  if (timers[i]) clearInterval(timers[i]);

  stopAllSounds();

  if (durations[i] <= 0) {
    durations[i] = 35 * 60;
    extended[i] = false;
    negatives[i] = false;
  }

  playSoundLoop(alertStartSound, 4, { ref: startSoundInterval = null }, { count: startPlayCount = 0 });

  const card = document.querySelector(`.card[data-id="${i}"]`);
  card.classList.add("active-timer");

  timers[i] = setInterval(() => {
    if (!negatives[i]) {
      durations[i]--;
      if (durations[i] === 0 && !extended[i]) {
        alarmSound.play();
        durations[i] = -1;
        extended[i] = true;
        negatives[i] = true;
        document.getElementById(`timer-${i}`).classList.add("text-red-500");
      }
    } else {
      durations[i]--;
      if (durations[i] <= -600) {
        clearInterval(timers[i]);
        timers[i] = null;
        playSoundLoop(alertEndSound, 4, { ref: endSoundInterval = null }, { count: endPlayCount = 0 });
      }
    }

    updateTimerDisplay(i);
    saveTimerState(i);
  }, 1000);

  saveTimerState(i);
  filtrarActivos();
}

function updateTimerDisplay(i) {
  const absTime = Math.abs(durations[i]);
  const min = String(Math.floor(absTime / 60)).padStart(2, '0');
  const sec = String(absTime % 60).padStart(2, '0');
  const prefix = durations[i] < 0 ? "-" : "";
  document.getElementById(`timer-${i}`).textContent = `${prefix}${min}:${sec}`;
}

function filtrarActivos() {
  const soloActivos = document.getElementById("toggle-activos")?.checked;
  document.querySelectorAll(".card").forEach(card => {
    const id = parseInt(card.dataset.id);
    const isRunning = timers[id] !== null; // 🔥 el verdadero estado activo

    const visible = !soloActivos || isRunning;
    card.style.display = visible ? "block" : "none";

    const overlay = card.querySelector(".overlay");
    let restartBtn = overlay.querySelector(".btn-restart");
    let stopBtn = overlay.querySelector(".btn-stop");

    if (visible && isRunning) {
      if (!restartBtn) {
        restartBtn = document.createElement("button");
        restartBtn.className = "btn-restart absolute top-2 right-2 p-1 text-white rounded-full bg-black/40 hover:bg-white/20";
        restartBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v6h6M20 20v-6h-6M4 14a8 8 0 0113.856-5.856M20 10a8 8 0 01-13.856 5.856" />
          </svg>`;
        restartBtn.onclick = () => restartTimer(id);
        overlay.appendChild(restartBtn);
      }

      if (!stopBtn) {
        stopBtn = document.createElement("button");
        stopBtn.className = "btn-stop absolute top-2 left-2 p-1 text-white rounded-full bg-red-600 hover:bg-red-700";
        stopBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <rect width="20" height="20" rx="2" />
          </svg>`;
        stopBtn.onclick = () => stopTimer(id);
        overlay.appendChild(stopBtn);
      }
    } else {
      if (restartBtn) restartBtn.remove();
      if (stopBtn) stopBtn.remove();
    }
  });
}

function restartTimer(i) {
  clearInterval(timers[i]);
  durations[i] = 35 * 60;
  extended[i] = false;
  negatives[i] = false;
  document.getElementById(`timer-${i}`).classList.remove("text-red-500");
  updateTimerDisplay(i);
  startTimer(i);
}

function stopTimer(i) {
  clearInterval(timers[i]);
  timers[i] = null;
  durations[i] = 35 * 60;
  extended[i] = false;
  negatives[i] = false;

  document.getElementById(`timer-${i}`).classList.remove("text-red-500");
  updateTimerDisplay(i);
  stopAllSounds();

  localStorage.setItem(`timer-${i}`, JSON.stringify({
    duration: durations[i],
    extended: extended[i],
    negative: negatives[i],
    running: false
  }));

  const card = document.querySelector(`.card[data-id="${i}"]`);
  card.classList.remove("active-timer");

  const overlay = card.querySelector(".overlay");
  const restartBtn = overlay.querySelector(".btn-restart");
  const stopBtn = overlay.querySelector(".btn-stop");
  if (restartBtn) restartBtn.remove();
  if (stopBtn) stopBtn.remove();

  filtrarActivos();
}
