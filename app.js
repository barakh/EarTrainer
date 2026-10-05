const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const WHITE_KEYS = ["C", "D", "E", "F", "G", "A", "B"];
const BLACK_KEYS = [
  ["C#", 0],
  ["D#", 1],
  ["F#", 3],
  ["G#", 4],
  ["A#", 5],
];

const OCTAVE_START = 60; // C4
const CHROMATIC = Array.from({ length: 12 }, (_, i) => OCTAVE_START + i);

const LEVELS = [
  { name: "C · D · E · F", midis: [60, 62, 64, 65], goal: 8 },
  { name: "White keys", midis: [60, 62, 64, 65, 67, 69, 71], goal: 8 },
  { name: "All 12 notes", midis: CHROMATIC, goal: 12 },
];

const STORAGE_KEY = "eartrainer.progress.v1";
const MAX_OPTIONS = 4;

const state = {
  target: null,
  answered: false,
  score: 0,
  total: 0,
  levelIndex: 0,
  correctByLevel: LEVELS.map(() => 0),
};

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function midiToName(midi) {
  return NOTE_NAMES[midi % 12];
}

function playMidi(midi, duration = 1.1) {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") {
    ctx.resume();
  }

  const now = ctx.currentTime;
  const freq = midiToFreq(midi);

  const master = ctx.createGain();
  master.connect(ctx.destination);
  master.gain.setValueAtTime(0.0001, now);
  master.gain.linearRampToValueAtTime(0.6, now + 0.02);
  master.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  const partials = [
    [1, 1],
    [2, 0.4],
    [3, 0.14],
  ];

  for (const [mult, amp] of partials) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq * mult;

    const gain = ctx.createGain();
    gain.gain.value = amp;

    osc.connect(gain).connect(master);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }
}

function pianoSVG(noteName) {
  const whiteW = 40;
  const whiteH = 150;
  const blackW = 24;
  const blackH = 95;
  const totalW = whiteW * WHITE_KEYS.length;

  let svg =
    `<svg class="piano" viewBox="0 0 ${totalW} ${whiteH}" ` +
    `xmlns="http://www.w3.org/2000/svg" role="img" ` +
    `aria-label="Piano keyboard highlighting ${noteName}">`;

  for (let i = 0; i < WHITE_KEYS.length; i++) {
    const active = WHITE_KEYS[i] === noteName;
    svg +=
      `<rect x="${i * whiteW}" y="0" width="${whiteW}" height="${whiteH}" ` +
      `rx="4" fill="${active ? "#6c8cff" : "#f4f6ff"}" ` +
      `stroke="#0f1220" stroke-width="2" />`;
  }

  for (const [name, after] of BLACK_KEYS) {
    const x = after * whiteW + whiteW - blackW / 2;
    const active = name === noteName;
    svg +=
      `<rect x="${x}" y="0" width="${blackW}" height="${blackH}" ` +
      `rx="3" fill="${active ? "#6c8cff" : "#12152a"}" ` +
      `stroke="#0f1220" stroke-width="2" />`;
  }

  svg += "</svg>";
  return svg;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function currentLevel() {
  return LEVELS[state.levelIndex];
}

function currentCorrect() {
  return state.correctByLevel[state.levelIndex];
}

function setCurrentCorrect(value) {
  state.correctByLevel[state.levelIndex] = value;
}

function pickOptions(target) {
  const pool = currentLevel().midis;
  const count = Math.min(MAX_OPTIONS, pool.length);
  const others = pool.filter((m) => m !== target);
  shuffle(others);
  return shuffle([target, ...others.slice(0, count - 1)]);
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);

    if (
      Number.isInteger(data.levelIndex) &&
      data.levelIndex >= 0 &&
      data.levelIndex < LEVELS.length
    ) {
      state.levelIndex = data.levelIndex;
    }

    if (Array.isArray(data.correctByLevel)) {
      data.correctByLevel.forEach((value, i) => {
        if (i < LEVELS.length && Number.isInteger(value) && value >= 0) {
          state.correctByLevel[i] = value;
        }
      });
    } else if (Number.isInteger(data.correctInLevel) && data.correctInLevel >= 0) {
      state.correctByLevel[state.levelIndex] = data.correctInLevel;
    }
  } catch (err) {
    // Ignore unavailable/corrupt storage.
  }
}

function saveProgress() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        levelIndex: state.levelIndex,
        correctByLevel: state.correctByLevel,
      })
    );
  } catch (err) {
    // Ignore unavailable storage.
  }
}

const els = {
  options: document.getElementById("options"),
  feedback: document.getElementById("feedback"),
  score: document.getElementById("score"),
  playBtn: document.getElementById("playBtn"),
  replayBtn: document.getElementById("replayBtn"),
  nextBtn: document.getElementById("nextBtn"),
  resetBtn: document.getElementById("resetBtn"),
  levelSelect: document.getElementById("levelSelect"),
  levelLabel: document.getElementById("levelLabel"),
  levelProgressText: document.getElementById("levelProgressText"),
  levelProgressFill: document.getElementById("levelProgressFill"),
};

let optionButtons = [];
let levelButtons = [];

function renderLevelSelect() {
  els.levelSelect.innerHTML = "";
  levelButtons = [];

  LEVELS.forEach((level, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "level-btn";
    btn.textContent = String(index + 1);
    btn.setAttribute("aria-label", `Level ${index + 1}: ${level.name}`);
    btn.addEventListener("click", () => selectLevel(index));
    els.levelSelect.appendChild(btn);
    levelButtons.push(btn);
  });
}

function updateLevelSelect() {
  levelButtons.forEach((btn, index) => {
    btn.classList.toggle("active", index === state.levelIndex);
  });
}

function selectLevel(index) {
  if (index === state.levelIndex) return;
  state.levelIndex = index;
  saveProgress();
  updateLevelUI();
  newQuestion({ autoPlay: true });
}

function updateLevelUI() {
  const level = currentLevel();
  const done = Math.min(currentCorrect(), level.goal);

  els.levelLabel.textContent = `Level ${state.levelIndex + 1} · ${level.name}`;
  els.levelProgressText.textContent = `${done} / ${level.goal}`;
  els.levelProgressFill.style.width = `${(done / level.goal) * 100}%`;
  updateLevelSelect();
}

function renderOptions(options) {
  els.options.innerHTML = "";
  optionButtons = [];

  options.forEach((midi, index) => {
    const name = midiToName(midi);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option";
    btn.dataset.midi = String(midi);
    btn.setAttribute("aria-label", `Option ${index + 1}: ${name}`);
    btn.innerHTML =
      `<span class="key-hint" aria-hidden="true">${index + 1}</span>` +
      `<span class="note-name">${name}</span>` +
      pianoSVG(name);

    btn.addEventListener("click", () => handleAnswer(midi, btn));
    els.options.appendChild(btn);
    optionButtons.push(btn);
  });
}

function handleAnswer(midi, btn) {
  if (state.answered) return;
  state.answered = true;

  const isCorrect = midi === state.target;
  state.total += 1;

  let leveledUp = false;
  let mastered = false;

  if (isCorrect) {
    state.score += 1;
    setCurrentCorrect(currentCorrect() + 1);

    const level = currentLevel();
    if (currentCorrect() >= level.goal) {
      if (state.levelIndex < LEVELS.length - 1) {
        state.levelIndex += 1;
        leveledUp = true;
      } else {
        setCurrentCorrect(level.goal);
        mastered = true;
      }
    }
    saveProgress();
  }

  const buttons = els.options.querySelectorAll(".option");
  buttons.forEach((b) => {
    b.disabled = true;
    if (Number(b.dataset.midi) === state.target) {
      b.classList.add("correct");
    }
  });

  if (!isCorrect) {
    btn.classList.add("wrong");
  }

  if (leveledUp) {
    els.feedback.textContent = `Correct! Level up — ${currentLevel().name}`;
    els.feedback.className = "feedback correct levelup";
  } else if (mastered) {
    els.feedback.textContent = "Correct! You mastered all levels.";
    els.feedback.className = "feedback correct levelup";
  } else if (isCorrect) {
    els.feedback.textContent = "Correct!";
    els.feedback.className = "feedback correct";
  } else {
    els.feedback.textContent = `Not quite — it was ${midiToName(state.target)}.`;
    els.feedback.className = "feedback wrong";
  }

  updateScore();
  updateLevelUI();
  els.nextBtn.disabled = false;
}

function updateScore() {
  els.score.textContent = `Score: ${state.score} / ${state.total}`;
}

function newQuestion({ autoPlay = true } = {}) {
  const pool = currentLevel().midis;
  state.target = pool[Math.floor(Math.random() * pool.length)];
  state.answered = false;

  els.feedback.textContent = "";
  els.feedback.className = "feedback";
  els.nextBtn.disabled = true;

  renderOptions(pickOptions(state.target));

  if (autoPlay) {
    playMidi(state.target);
  }
}

els.playBtn.addEventListener("click", () => {
  if (state.target !== null) playMidi(state.target);
});

els.replayBtn.addEventListener("click", () => {
  if (state.target !== null) playMidi(state.target);
});

els.nextBtn.addEventListener("click", () => newQuestion({ autoPlay: true }));

els.resetBtn.addEventListener("click", () => {
  const ok = window.confirm("Reset your level progress and start over?");
  if (!ok) return;

  state.levelIndex = 0;
  state.correctByLevel = LEVELS.map(() => 0);
  saveProgress();
  updateLevelUI();
  newQuestion({ autoPlay: false });
});

document.addEventListener("keydown", (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;

  const key = event.key;

  if (key === " " || key === "Spacebar") {
    event.preventDefault();
    if (state.target !== null) playMidi(state.target);
    return;
  }

  if (key === "r" || key === "R") {
    event.preventDefault();
    if (state.target !== null) playMidi(state.target);
    return;
  }

  if (key >= "1" && key <= "4") {
    const btn = optionButtons[Number(key) - 1];
    if (btn && !state.answered) {
      event.preventDefault();
      handleAnswer(Number(btn.dataset.midi), btn);
    }
    return;
  }

  if ((key === "Enter" || key === "n" || key === "N") && state.answered) {
    event.preventDefault();
    newQuestion({ autoPlay: true });
  }
});

renderLevelSelect();
loadProgress();
newQuestion({ autoPlay: false });
updateScore();
updateLevelUI();
