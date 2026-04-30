(function () {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const scoreEl = document.getElementById("score");
  const bestScoreEl = document.getElementById("best-score");
  const livesEl = document.getElementById("lives");
  const timeEl = document.getElementById("time");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayText = document.getElementById("overlay-text");
  const coachMessageEl = document.getElementById("coach-message");
  const bossBannerEl = document.getElementById("boss-banner");
  const shopPanelEl = document.getElementById("shop-panel");
  const shopStatusEl = document.getElementById("shop-status");
  const achievementsEl = document.getElementById("achievements");
  const startBtn = document.getElementById("start-btn");
  const resumeBtn = document.getElementById("resume-btn");
  const retryBtn = document.getElementById("retry-btn");
  const exitBtn = document.getElementById("exit-btn");
  const pauseBtn = document.getElementById("pause-btn");
  const modeSelect = document.getElementById("mode-select");
  const muteToggle = document.getElementById("mute-toggle");
  const volumeRange = document.getElementById("volume-range");
  const buyPlatformBtn = document.getElementById("buy-platform-btn");
  const buyShieldBtn = document.getElementById("buy-shield-btn");
  const buySpawnBtn = document.getElementById("buy-spawn-btn");
  const bestScoreStorageKey = "alanEggCatcherBestScore";
  const settingsStorageKey = "alanEggCatcherSettings";
  const upgradesStorageKey = "alanEggCatcherUpgrades";
  const achievementsStorageKey = "alanEggCatcherAchievements";
  const dailyBestStoragePrefix = "alanEggCatcherDailyBest";
  let bestScore = 0;
  let coachMessageTimer = 0;
  let audioContext = null;
  const catchMessages = ["Good Job!", "Yes!", "So Close!", "Nice catch!", "Great save!"];
  const animalSpecies = {
    normal: ["bunny", "chick", "puppy", "kitten"],
    gold: ["golden_bunny", "golden_chick"],
    rotten: ["raccoon", "skunk"],
    slow: ["owl"],
    shield: ["turtle"],
    multi: ["fox"],
    boss: ["bear"],
  };
  const animalLabels = {
    bunny: "bunny",
    chick: "chick",
    puppy: "puppy",
    kitten: "kitten",
    golden_bunny: "golden bunny",
    golden_chick: "golden chick",
    raccoon: "raccoon",
    skunk: "skunk",
    owl: "owl",
    turtle: "turtle",
    fox: "fox",
    bear: "bear",
  };
  const animalPluralLabels = {
    bunny: "bunnies",
    chick: "chicks",
    puppy: "puppies",
    kitten: "kittens",
    golden_bunny: "golden bunnies",
    golden_chick: "golden chicks",
    raccoon: "raccoons",
    skunk: "skunks",
    owl: "owls",
    turtle: "turtles",
    fox: "foxes",
    bear: "bears",
  };
  const modeConfigs = {
    easy: {
      duration: 70,
      lives: 4,
      basketSpeed: 560,
      spawnEvery: 0.72,
      minSpawnEvery: 0.48,
      speedMin: 125,
      speedMax: 190,
      speedBoost: 28,
      rottenChance: 0.07,
      slowChance: 0.05,
      goldChance: 0.08,
      shieldChance: 0.08,
      multiChance: 0.05,
    },
    normal: {
      duration: 60,
      lives: 3,
      basketSpeed: 500,
      spawnEvery: 0.58,
      minSpawnEvery: 0.42,
      speedMin: 140,
      speedMax: 220,
      speedBoost: 34,
      rottenChance: 0.10,
      slowChance: 0.04,
      goldChance: 0.06,
      shieldChance: 0.05,
      multiChance: 0.04,
    },
    hard: {
      duration: 55,
      lives: 3,
      basketSpeed: 470,
      spawnEvery: 0.5,
      minSpawnEvery: 0.35,
      speedMin: 160,
      speedMax: 250,
      speedBoost: 42,
      rottenChance: 0.13,
      slowChance: 0.03,
      goldChance: 0.05,
      shieldChance: 0.04,
      multiChance: 0.04,
    },
    daily: {
      duration: 60,
      lives: 3,
      basketSpeed: 500,
      spawnEvery: 0.58,
      minSpawnEvery: 0.42,
      speedMin: 140,
      speedMax: 220,
      speedBoost: 34,
      rottenChance: 0.10,
      slowChance: 0.04,
      goldChance: 0.06,
      shieldChance: 0.05,
      multiChance: 0.04,
    },
  };
  function saveBestScore(value) {
    bestScore = Math.max(bestScore, value);
    try {
      window.localStorage.setItem(bestScoreStorageKey, String(bestScore));
    } catch (error) {
      // Ignore storage failures in restricted browser modes.
    }
  }

  function loadBestScore() {
    try {
      const storedValue = Number(window.localStorage.getItem(bestScoreStorageKey));
      bestScore = Number.isFinite(storedValue) && storedValue > 0 ? storedValue : 0;
    } catch (error) {
      bestScore = 0;
    }
  }

  function loadJson(key, fallback) {
    try {
      const rawValue = window.localStorage.getItem(key);
      if (!rawValue) return fallback;
      return Object.assign({}, fallback, JSON.parse(rawValue));
    } catch (error) {
      return fallback;
    }
  }

  function saveJson(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      // ignore
    }
  }

  function getDailySeed() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}${month}${day}`;
  }

  function makeSeededRng(seedText) {
    let seed = 2166136261;
    for (let i = 0; i < seedText.length; i++) {
      seed ^= seedText.charCodeAt(i);
      seed = Math.imul(seed, 16777619);
    }
    return function () {
      seed += seed << 13;
      seed ^= seed >>> 7;
      seed += seed << 3;
      seed ^= seed >>> 17;
      seed += seed << 5;
      return ((seed >>> 0) % 1000000) / 1000000;
    };
  }

  const state = {
    running: false,
    paused: false,
    phase: "ready",
    mode: "normal",
    score: 0,
    lives: 3,
    duration: 60,
    timeLeft: 60,
    basketX: canvas.width / 2,
    basketY: canvas.height - 45,
    basketSpeed: 500,
    basketWidth: 155,
    basketHeight: 22,
    keys: { left: false, right: false },
    eggs: [],
    particles: [],
    comboCount: 0,
    comboTimer: 0,
    maxCombo: 0,
    totalGoldCaught: 0,
    caughtAnimals: {},
    caughtAnimalTotal: 0,
    shieldCharges: 0,
    shopCredits: 0,
    dailySeed: "",
    dailyBest: 0,
    rng: Math.random,
    settings: { muted: false, volume: 0.45 },
    upgrades: { platform: 0, shield: 0, spawn: 0 },
    achievements: { combo10: false, noMiss: false, gold5: false, boss: false, daily: false },
    // track non-rotten missed eggs; every 3 misses -> -1 life
    missedEggsSinceLifeLoss: 0,
    // power-up state
    powerUps: { multi: { active: false, expires: 0 }, slow: { active: false, expires: 0 } },
    goldenEggsCollected: 0,
    bossWave: { active: false, endsAt: 0, nextAt: 20, bossSpawned: false },
    spawnTimer: 0,
    spawnEvery: 0.55,
    totalTime: 0,
    lastTickMs: 0,
  };

  function rand(min, max) {
    return state.rng() * (max - min) + min;
  }

  function recordCaughtAnimal(species) {
    const label = species || "bunny";
    state.caughtAnimals[label] = (state.caughtAnimals[label] || 0) + 1;
    state.caughtAnimalTotal += 1;
  }

  function getCaughtAnimalSummary() {
    const entries = Object.entries(state.caughtAnimals)
      .filter(([, count]) => count > 0)
      .map(([species, count]) => {
        const singular = animalLabels[species] || species;
        const plural = animalPluralLabels[species] || `${singular}s`;
        return `${count} ${count === 1 ? singular : plural}`;
      });
    if (!entries.length) return "You didn't catch any animals.";
    if (entries.length === 1) return `You caught ${entries[0]}.`;
    const lastEntry = entries.pop();
    return `You caught ${entries.join(", ")} and ${lastEntry}.`;
  }

  function loadSavedData() {
    state.settings = loadJson(settingsStorageKey, state.settings);
    state.upgrades = loadJson(upgradesStorageKey, state.upgrades);
    state.achievements = loadJson(achievementsStorageKey, state.achievements);
    loadBestScore();
    if (muteToggle) muteToggle.checked = Boolean(state.settings.muted);
    if (volumeRange) volumeRange.value = String(Math.round((state.settings.volume || 0.45) * 100));
    renderAchievements();
    updateShopButtons();
  }

  function getModeConfig() {
    if (state.mode === "daily") return modeConfigs.daily;
    return modeConfigs[state.mode] || modeConfigs.normal;
  }

  function getDailyBestKey() {
    return `${dailyBestStoragePrefix}:${state.dailySeed || getDailySeed()}`;
  }

  function loadDailyBest(seedText) {
    try {
      const storedValue = Number(window.localStorage.getItem(`${dailyBestStoragePrefix}:${seedText}`));
      return Number.isFinite(storedValue) && storedValue > 0 ? storedValue : 0;
    } catch (error) {
      return 0;
    }
  }

  function saveDailyBest(seedText, value) {
    try {
      const currentValue = loadDailyBest(seedText);
      const nextValue = Math.max(currentValue, value);
      window.localStorage.setItem(`${dailyBestStoragePrefix}:${seedText}`, String(nextValue));
      state.dailyBest = nextValue;
    } catch (error) {
      state.dailyBest = Math.max(state.dailyBest || 0, value);
    }
  }

  function saveSettings() {
    saveJson(settingsStorageKey, state.settings);
  }

  function saveUpgrades() {
    saveJson(upgradesStorageKey, state.upgrades);
  }

  function saveAchievements() {
    saveJson(achievementsStorageKey, state.achievements);
  }

  function renderAchievements() {
    if (!achievementsEl) return;
    const labels = [];
    if (state.achievements.combo10) labels.push("Combo Master");
    if (state.achievements.noMiss) labels.push("Flawless Finish");
    if (state.achievements.gold5) labels.push("Gold Hunter");
    if (state.achievements.boss) labels.push("Boss Buster");
    if (state.achievements.daily) labels.push("Daily Champion");
    achievementsEl.innerHTML = labels.length
      ? labels.map((label) => `<span class="achievement-chip">${label}</span>`).join("")
      : '<span class="achievement-chip">Achievements appear here</span>';
  }

  function unlockAchievement(key, label) {
    if (state.achievements[key]) return;
    state.achievements[key] = true;
    saveAchievements();
    renderAchievements();
    setCoachMessage(label);
  }

  function updateShopButtons() {
    if (!shopStatusEl) return;
    shopStatusEl.textContent = `Credits: ${state.shopCredits} | Platform +${state.upgrades.platform} | Shield +${state.upgrades.shield} | Spawn +${state.upgrades.spawn}`;
    if (buyPlatformBtn) buyPlatformBtn.disabled = state.shopCredits < 80 || state.upgrades.platform >= 3;
    if (buyShieldBtn) buyShieldBtn.disabled = state.shopCredits < 70 || state.upgrades.shield >= 3;
    if (buySpawnBtn) buySpawnBtn.disabled = state.shopCredits < 90 || state.upgrades.spawn >= 3;
  }

  function purchaseUpgrade(kind) {
    const costs = { platform: 80, shield: 70, spawn: 90 };
    if (kind === "platform" && state.shopCredits >= costs.platform && state.upgrades.platform < 3) {
      state.shopCredits -= costs.platform;
      state.upgrades.platform += 1;
      saveUpgrades();
      setCoachMessage("Bigger platform unlocked!");
      playPowerUpSound();
    }
    if (kind === "shield" && state.shopCredits >= costs.shield && state.upgrades.shield < 3) {
      state.shopCredits -= costs.shield;
      state.upgrades.shield += 1;
      saveUpgrades();
      setCoachMessage("Shield lasts longer!");
      playPowerUpSound();
    }
    if (kind === "spawn" && state.shopCredits >= costs.spawn && state.upgrades.spawn < 3) {
      state.shopCredits -= costs.spawn;
      state.upgrades.spawn += 1;
      saveUpgrades();
      setCoachMessage("Eggs slow down a bit!");
      playPowerUpSound();
    }
    updateShopButtons();
    updateHud();
  }

  function getBasketWidth() {
    return 155 + state.upgrades.platform * 12;
  }

  function getShieldChargeGain() {
    return 1 + state.upgrades.shield;
  }

  function getSpawnConfig() {
    const config = getModeConfig();
    const spawnReduction = state.upgrades.spawn * 0.04;
    return {
      spawnEvery: Math.max(0.3, config.spawnEvery - spawnReduction),
      minSpawnEvery: Math.max(0.2, config.minSpawnEvery - spawnReduction * 0.7),
      speedMin: config.speedMin,
      speedMax: config.speedMax,
      speedBoost: config.speedBoost,
      rottenChance: config.rottenChance,
      slowChance: config.slowChance,
      goldChance: config.goldChance,
      shieldChance: config.shieldChance,
      multiChance: config.multiChance,
    };
  }

  function ensureAudioContext() {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;
    if (!audioContext) audioContext = new AudioCtor();
    if (audioContext.state === "suspended") audioContext.resume();
    return audioContext;
  }

  function playTone(frequency, duration, type, volume, frequencyEnd) {
    const context = ensureAudioContext();
    if (!context) return;
    const effectiveVolume = state.settings.muted ? 0 : Math.max(0, Math.min(1, state.settings.volume || 0.45));
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    oscillator.type = type || "sine";
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    if (frequencyEnd) {
      oscillator.frequency.exponentialRampToValueAtTime(frequencyEnd, context.currentTime + duration);
    }
    gainNode.gain.setValueAtTime((volume || 0.05) * effectiveVolume, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration + 0.03);
  }

  function playCatchSound(kind) {
    if (kind === "gold") { playTone(880, 0.08, "triangle", 0.05, 1240); return; }
    if (kind === "shield") { playTone(660, 0.09, "sine", 0.045, 990); return; }
    if (kind === "multi") { playTone(740, 0.08, "square", 0.04, 930); return; }
    if (kind === "slow") { playTone(520, 0.08, "triangle", 0.04, 680); return; }
    playTone(620, 0.07, "sine", 0.04, 860);
  }

  function playMissSound() {
    playTone(220, 0.13, "sawtooth", 0.04, 160);
  }

  function playPowerUpSound() {
    playTone(784, 0.09, "triangle", 0.05, 1046);
  }

  function playGameOverSound() {
    playTone(240, 0.12, "sawtooth", 0.04, 120);
  }

  function playPauseSound() {
    playTone(480, 0.05, "square", 0.02, 380);
  }

  function resetCombo() {
    state.comboCount = 0;
    state.comboTimer = 0;
  }

  function pickAnimalSpecies(kind) {
    const options = animalSpecies[kind] || animalSpecies.normal;
    return options[Math.floor(rand(0, options.length))];
  }

  function registerCatch(kind) {
    if (kind === "rotten") {
      resetCombo();
      return 0;
    }
    state.comboCount = state.comboTimer > 0 ? state.comboCount + 1 : 1;
    state.comboTimer = 1.25;
    state.maxCombo = Math.max(state.maxCombo, state.comboCount);
    return Math.max(0, (state.comboCount - 1) * 3);
  }

  function updateOverlayButtons(mode) {
    const currentMode = mode || "ready";
    startBtn.hidden = currentMode !== "ready";
    resumeBtn.hidden = !(currentMode === "paused" || currentMode === "shop" || currentMode === "gameover");
    retryBtn.hidden = true;
    exitBtn.hidden = currentMode === "ready";
    if (shopPanelEl) shopPanelEl.hidden = currentMode !== "shop";
    if (pauseBtn) pauseBtn.textContent = state.paused ? "Resume" : "Pause";
    if (currentMode === "paused" && resumeBtn) resumeBtn.textContent = "Continue";
    if (currentMode === "shop" && resumeBtn) resumeBtn.textContent = "Start Next Round";
    if (currentMode === "gameover" && resumeBtn) resumeBtn.textContent = "Continue";
  }

  function showPausedOverlay() {
    overlayTitle.textContent = "Paused";
    overlayText.textContent = "Press Continue or P to keep guiding the wildlife basket.";
    updateOverlayButtons("paused");
    showOverlay();
  }

  function showShopOverlay() {
    overlayTitle.textContent = state.lives > 0 ? "Shop" : "Game Over Shop";
    overlayText.textContent = state.mode === "daily"
      ? `Daily score: ${state.score}. Daily best: ${state.dailyBest}. Spend credits before the next round.`
      : `Round score: ${state.score}. Spend credits before the next round.`;
    updateOverlayButtons("shop");
    updateShopButtons();
    showOverlay();
  }

  function setPaused(paused) {
    if (!state.running) return;
    state.paused = paused;
    state.phase = paused ? "paused" : "playing";
    if (pauseBtn) pauseBtn.textContent = paused ? "Resume" : "Pause";
    if (paused) {
      playPauseSound();
      showPausedOverlay();
    } else {
      hideOverlay();
    }
  }

  function togglePause() {
    setPaused(!state.paused);
  }

  function startGame() {
    state.mode = modeSelect ? modeSelect.value : "normal";
    const config = getModeConfig();
    state.phase = "playing";
    state.running = true;
    state.paused = false;
    state.score = 0;
    state.lives = config.lives;
    state.duration = config.duration;
    state.timeLeft = config.duration;
    state.totalTime = 0;
    state.eggs = [];
    state.particles = [];
    state.comboCount = 0;
    state.comboTimer = 0;
    state.maxCombo = 0;
    state.totalGoldCaught = 0;
    state.caughtAnimals = {};
    state.caughtAnimalTotal = 0;
    state.shieldCharges = 0;
    state.missedEggsSinceLifeLoss = 0;
    state.goldenEggsCollected = 0;
    state.powerUps.multi.active = false; state.powerUps.multi.expires = 0;
    state.powerUps.slow.active = false; state.powerUps.slow.expires = 0;
    state.spawnTimer = 0;
    state.basketX = canvas.width / 2;
    state.dailySeed = state.mode === "daily" ? getDailySeed() : "";
    state.dailyBest = state.mode === "daily" ? loadDailyBest(state.dailySeed) : 0;
    state.rng = state.mode === "daily" ? makeSeededRng(state.dailySeed) : Math.random;
    state.basketSpeed = config.basketSpeed;
    state.basketWidth = getBasketWidth();
    const spawnConfig = getSpawnConfig();
    state.spawnEvery = spawnConfig.spawnEvery;
    state.bossWave = { active: false, endsAt: 0, nextAt: 20, bossSpawned: false };
    state.lastTickMs = performance.now();
    setCoachMessage("");
    bossBannerEl.classList.remove("show");
    updateOverlayButtons("ready");
    if (pauseBtn) pauseBtn.disabled = false;
    ensureAudioContext();
    updateShopButtons();
    updateHud();
    hideOverlay();
    requestAnimationFrame(loop);
  }

  function returnToReadyScreen() {
    state.running = false;
    state.paused = false;
    state.phase = "ready";
    state.eggs = [];
    state.particles = [];
    resetCombo();
    overlayTitle.textContent = "Ready?";
    overlayText.textContent = "Move with Left/Right arrow keys or A/D to catch animals. Daily Challenge uses one shared seed for the day.";
    updateOverlayButtons("ready");
    if (pauseBtn) pauseBtn.textContent = "Pause";
    if (pauseBtn) pauseBtn.disabled = true;
    startBtn.textContent = "Start Animal Catcher";
    setCoachMessage("");
    bossBannerEl.classList.remove("show");
    showOverlay();
    render();
  }

  function setCoachMessage(text) {
    if (!coachMessageEl) return;
    coachMessageEl.textContent = text;
    coachMessageEl.classList.toggle("show", Boolean(text));
    coachMessageTimer = text ? 1.4 : 0;
  }

  function drawAnimalSilhouette(x, y, type, scale = 1, color = "#3c4653") {
    ctx.fillStyle = color;
    if (type === "bunny") {
      ctx.beginPath(); ctx.ellipse(x, y, 16 * scale, 11 * scale, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x - 10 * scale, y - 20 * scale, 4 * scale, 12 * scale, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + 6 * scale, y - 18 * scale, 4 * scale, 12 * scale, 0.25, 0, Math.PI * 2); ctx.fill();
    } else if (type === "fox") {
      ctx.beginPath(); ctx.moveTo(x - 18 * scale, y + 8 * scale); ctx.lineTo(x, y - 10 * scale); ctx.lineTo(x + 18 * scale, y + 8 * scale); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x, y, 14 * scale, 10 * scale, 0, 0, Math.PI * 2); ctx.fill();
    } else if (type === "bird") {
      ctx.beginPath(); ctx.arc(x, y, 6 * scale, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - 6 * scale, y + 1 * scale); ctx.lineTo(x - 18 * scale, y - 4 * scale); ctx.lineTo(x - 8 * scale, y + 7 * scale); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + 6 * scale, y + 1 * scale); ctx.lineTo(x + 18 * scale, y - 4 * scale); ctx.lineTo(x + 8 * scale, y + 7 * scale); ctx.fill();
    } else if (type === "cat") {
      ctx.beginPath(); ctx.ellipse(x, y, 15 * scale, 11 * scale, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - 11 * scale, y - 5 * scale); ctx.lineTo(x - 5 * scale, y - 18 * scale); ctx.lineTo(x - 1 * scale, y - 4 * scale); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + 11 * scale, y - 5 * scale); ctx.lineTo(x + 5 * scale, y - 18 * scale); ctx.lineTo(x + 1 * scale, y - 4 * scale); ctx.fill();
    }
  }

  function endGame() {
    state.running = false;
    state.paused = false;
    state.phase = "shop";
    saveBestScore(state.score);
    playGameOverSound();
    const won = state.lives > 0;
    if (won && state.missedEggsSinceLifeLoss === 0) unlockAchievement("noMiss", "Flawless Finish!");
    if (state.maxCombo >= 10) unlockAchievement("combo10", "Combo Master!");
    if (state.totalGoldCaught >= 5) unlockAchievement("gold5", "Gold Hunter!");
    if (state.mode === "daily") {
      const previousDailyBest = state.dailyBest;
      saveDailyBest(state.dailySeed, state.score);
      if (state.score > previousDailyBest) unlockAchievement("daily", "Daily Champion!");
    }
    state.shopCredits = state.score;
    overlayTitle.textContent = won ? "Shop" : "Shop";
    overlayText.textContent = won
      ? "Great run. Spend your score on upgrades, then start the next round."
      : "Better luck next time. Spend your score on upgrades, then try again.";
    overlayText.textContent += " " + getCaughtAnimalSummary();
    updateOverlayButtons("shop");
    updateShopButtons();
    if (pauseBtn) pauseBtn.disabled = true;
    showOverlay();
  }

  function showOverlay() {
    overlay.classList.add("show");
  }

  function hideOverlay() {
    overlay.classList.remove("show");
  }

  function updateHud() {
    scoreEl.textContent = String(state.score);
    bestScoreEl.textContent = String(bestScore);
    livesEl.textContent = String(state.lives);
    timeEl.textContent = String(Math.max(0, Math.ceil(state.timeLeft)));
    if (pauseBtn) pauseBtn.disabled = !state.running || state.phase !== "playing";
    if (modeSelect && state.mode) modeSelect.value = state.mode;
    if (muteToggle) muteToggle.checked = Boolean(state.settings.muted);
    if (volumeRange) volumeRange.value = String(Math.round((state.settings.volume || 0.45) * 100));
  }

  function spawnEgg() {
    const roll = rand(0, 1);
    let kind = "normal";
    const config = getSpawnConfig();
    const difficulty = Math.min(1, state.totalTime / Math.max(25, state.duration));
    const bossWaveBoost = state.bossWave.active ? 0.05 : 0;
    const rottenChance = Math.max(0.03, config.rottenChance + difficulty * 0.04 - bossWaveBoost);
    const slowChance = config.slowChance + difficulty * 0.015;
    const goldChance = config.goldChance + bossWaveBoost;
    const multiChance = config.multiChance + (state.bossWave.active ? 0.02 : 0);
    const shieldChance = config.shieldChance + (state.bossWave.active ? 0.03 : 0);
    // probabilities shift slightly as the round goes on.
    if (roll < rottenChance) kind = "rotten";
    else if (roll < rottenChance + slowChance) kind = "slow";
    else if (roll < rottenChance + slowChance + shieldChance) kind = "shield";
    else if (roll > 1 - multiChance) kind = "multi";
    else if (roll > 1 - multiChance - goldChance) kind = "gold";

    if (state.bossWave.active && !state.bossWave.bossSpawned) {
      kind = "boss";
      state.bossWave.bossSpawned = true;
    }

    const speedBase = kind === "gold" || kind === "boss"
      ? rand(config.speedMin + 40, config.speedMax + 60)
      : rand(config.speedMin, config.speedMax);
    const speed = speedBase + difficulty * config.speedBoost;

    state.eggs.push({
      x: kind === "boss" ? canvas.width / 2 : rand(20, canvas.width - 20),
      y: kind === "boss" ? -36 : -20,
      r: kind === "boss" ? 24 : 12,
      speed,
      kind,
      species: pickAnimalSpecies(kind),
      wobble: kind === "boss" ? 0.4 : rand(0.6, 2.2),
      t: rand(0, Math.PI * 2),
    });
  }

  function update(dt) {
    if (!state.running || state.paused) return;

    state.totalTime += dt;
    state.timeLeft -= dt;
    state.spawnTimer += dt;
    if (state.comboTimer > 0) {
      state.comboTimer = Math.max(0, state.comboTimer - dt);
      if (state.comboTimer === 0) resetCombo();
    }

    if (!state.bossWave.active && state.totalTime >= state.bossWave.nextAt) {
      state.bossWave.active = true;
      state.bossWave.endsAt = state.totalTime + 8;
      state.bossWave.bossSpawned = false;
      state.bossWave.nextAt += 20;
      if (bossBannerEl) {
        bossBannerEl.textContent = "Boss Wave!";
        bossBannerEl.classList.add("show");
      }
      playPowerUpSound();
    }

    if (state.bossWave.active && state.totalTime >= state.bossWave.endsAt) {
      state.bossWave.active = false;
      if (bossBannerEl) bossBannerEl.classList.remove("show");
    }

    if (state.timeLeft <= 0 || state.lives <= 0) {
      endGame();
      return;
    }

    const config = getSpawnConfig();
    const difficulty = Math.min(1, state.totalTime / Math.max(25, state.duration));
    state.spawnEvery = Math.max(config.minSpawnEvery, config.spawnEvery - difficulty * 0.13 - (state.bossWave.active ? 0.05 : 0));
    state.basketWidth = getBasketWidth();

    if (state.spawnTimer >= state.spawnEvery) {
      state.spawnTimer = 0;
      spawnEgg();
    }

    if (state.keys.left) {
      state.basketX -= state.basketSpeed * dt;
    }
    if (state.keys.right) {
      state.basketX += state.basketSpeed * dt;
    }

    const half = state.basketWidth / 2;
    state.basketX = Math.max(half, Math.min(canvas.width - half, state.basketX));

    for (let i = state.eggs.length - 1; i >= 0; i--) {
      const egg = state.eggs[i];
      egg.t += dt * egg.wobble;
      egg.x += Math.sin(egg.t) * 40 * dt;
      // Apply slow power-up to fall speed
      const slowMultiplier = state.powerUps.slow.active ? 0.5 : 1;
      egg.y += egg.speed * dt * slowMultiplier;

      // If multi power-up active, check additional basket positions
      const basketOffsets = state.powerUps.multi.active ? [-160, 0, 160] : [0];
      let inBasketX = false;
      for (const off of basketOffsets) {
        const bx = state.basketX + off;
        if (egg.x > bx - half && egg.x < bx + half) { inBasketX = true; break; }
      }
      const inBasketY = egg.y + egg.r > state.basketY - state.basketHeight;

      if (inBasketX && inBasketY) {
        if (egg.kind === "normal") state.score += 10;
        if (egg.kind === "gold") {
          state.score += 30;
          state.goldenEggsCollected = (state.goldenEggsCollected || 0) + 1;
          state.totalGoldCaught += 1;
          if (state.goldenEggsCollected >= 3) { state.powerUps.multi.active = true; state.powerUps.multi.expires = state.totalTime + 10; state.goldenEggsCollected = 0; }
          if (state.totalGoldCaught >= 5) unlockAchievement("gold5", "Gold Hunter!");
        }
        if (egg.kind === "shield") { state.shieldCharges += getShieldChargeGain(); }
        if (egg.kind === "rotten") { state.score = Math.max(0, state.score - 15); }
        if (egg.kind === "boss") {
          state.score += 80;
          state.bossWave.active = false;
          if (bossBannerEl) bossBannerEl.classList.remove("show");
          unlockAchievement("boss", "Boss Buster!");
          spawnParticles(egg.x, egg.y, "sparkle", 30);
          playPowerUpSound();
        }
        if (egg.kind === "multi") { state.powerUps.multi.active = true; state.powerUps.multi.expires = state.totalTime + 10; }
        if (egg.kind === "slow") { state.powerUps.slow.active = true; state.powerUps.slow.expires = state.totalTime + 8; }
        // spawn sparkles on any successful catch
        spawnParticles(egg.x, egg.y, 'sparkle', 22);
        // if catching a rotten egg costs a life, spawn a small blood puff
        if (egg.kind === 'rotten') spawnParticles(egg.x, egg.y, 'blood', 12);
        if (egg.kind === 'shield') {
          setCoachMessage("Shield up!");
          playCatchSound("shield");
        } else if (egg.kind === "boss") {
          setCoachMessage("Boss down!");
          playCatchSound("gold");
        } else if (egg.kind !== "rotten") {
          setCoachMessage(catchMessages[Math.floor(Math.random() * catchMessages.length)]);
          playCatchSound(egg.kind);
        }
        const comboBonus = registerCatch(egg.kind);
        if (comboBonus > 0) {
          state.score += comboBonus;
          setCoachMessage("Combo x" + state.comboCount + "!");
        }
        recordCaughtAnimal(egg.species || pickAnimalSpecies(egg.kind));
        if (state.maxCombo >= 10) unlockAchievement("combo10", "Combo Master!");
        state.eggs.splice(i, 1);
        continue;
      }

      if (egg.y - egg.r > canvas.height) {
        // Missed egg: non-rotten misses increment a counter. Every 3 misses cost 1 life.
        if (egg.kind !== "rotten" && egg.kind !== "boss") {
          resetCombo();
          state.missedEggsSinceLifeLoss = (state.missedEggsSinceLifeLoss || 0) + 1;
          if (state.missedEggsSinceLifeLoss >= 3) {
            if (state.shieldCharges > 0) {
              state.shieldCharges -= 1;
              setCoachMessage("Shield saved you!");
              spawnParticles(egg.x || (canvas.width / 2), canvas.height - 24, 'sparkle', 18);
              playCatchSound("shield");
            } else {
              state.lives -= 1;
              // spawn blood at ground where egg fell
              spawnParticles(egg.x || (canvas.width/2), canvas.height - 24, 'blood', 20);
              playMissSound();
            }
            state.missedEggsSinceLifeLoss = 0;
          }
        } else {
          resetCombo();
        }
        state.eggs.splice(i, 1);
      }
    }

    // Expire power-ups
    if (state.powerUps.multi.active && state.totalTime >= state.powerUps.multi.expires) state.powerUps.multi.active = false;
    if (state.powerUps.slow.active && state.totalTime >= state.powerUps.slow.expires) state.powerUps.slow.active = false;

    if (state.score > bestScore) {
      saveBestScore(state.score);
    }

    if (state.mode === "daily" && state.score > state.dailyBest) {
      state.dailyBest = state.score;
      saveDailyBest(state.dailySeed, state.score);
    }

    // update particles
    updateParticles(dt);

    if (coachMessageTimer > 0) {
      coachMessageTimer -= dt;
      if (coachMessageTimer <= 0) setCoachMessage("");
    }

    updateHud();
  }

  function drawBackground() {
    // Soft, desaturated sky gradient
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, '#0f1620');
    g.addColorStop(0.35, '#26313a');
    g.addColorStop(0.72, '#48434a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);

    // moon and drifting clouds for extra motion
    ctx.fillStyle = 'rgba(245, 235, 220, 0.26)';
    ctx.beginPath(); ctx.arc(canvas.width - 110, 70, 30, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 4; i++) {
      const cloudX = (canvas.width + 220 - ((state.totalTime * 16 + i * 190) % (canvas.width + 280)));
      const cloudY = 70 + i * 30;
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.beginPath();
      ctx.ellipse(cloudX, cloudY, 48, 16, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cloudX + 30, cloudY + 4, 38, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cloudX - 28, cloudY + 3, 32, 10, 0, 0, Math.PI * 2); ctx.fill();
    }

    // Distant misty hills
    ctx.fillStyle = 'rgba(35,38,44,0.26)'; ctx.fillRect(0, canvas.height - 200, canvas.width, 120);

    // Animal parade in the background
    const paradeX = (state.totalTime * 28) % (canvas.width + 220);
    drawAnimalSilhouette(canvas.width - 40 - paradeX, canvas.height - 182, "bunny", 0.95, "#3a4650");
    drawAnimalSilhouette(canvas.width + 120 - paradeX, canvas.height - 174, "fox", 1.0, "#404a4f");
    drawAnimalSilhouette(canvas.width + 280 - paradeX, canvas.height - 178, "bird", 1.1, "#46505a");
    drawAnimalSilhouette(canvas.width + 430 - paradeX, canvas.height - 170, "cat", 0.9, "#434a53");

    // Soft ambient particles
    for (let i = 0; i < 30; i++) {
      const sx = (i * 113) % canvas.width + 20;
      const sy = 40 + ((i * 47) % 160) + Math.sin(state.totalTime * 1.2 + i) * 4;
      const alpha = 0.035 + ((i % 5) * 0.03);
      ctx.fillStyle = `rgba(210,200,185,${alpha})`;
      ctx.beginPath(); ctx.arc(sx, sy, 1.5 + (i % 3), 0, Math.PI * 2); ctx.fill();
    }

    // Foreground glow strip (replace grass with muted terrain)
    ctx.fillStyle = '#17161c'; ctx.fillRect(0, canvas.height - 120, canvas.width, 120);

    // Ground critters and paw prints
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i < 8; i++) {
      const px = 40 + i * 110 + Math.sin(state.totalTime * 0.8 + i) * 6;
      const py = canvas.height - 92 + (i % 2) * 8;
      ctx.beginPath(); ctx.ellipse(px, py, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(px - 7, py - 6, 2, 0, Math.PI * 2); ctx.arc(px - 2, py - 9, 2, 0, Math.PI * 2); ctx.arc(px + 4, py - 8, 2, 0, Math.PI * 2); ctx.arc(px + 9, py - 4, 2, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawBasket() {
    const baseY = state.basketY - state.basketHeight;
    const drawOne = (cx) => {
      const x = cx - state.basketWidth / 2;
      const y = baseY;
      ctx.fillStyle = "#f3efe7";
      ctx.fillRect(x, y, state.basketWidth, state.basketHeight);
      ctx.strokeStyle = "#59626e";
      ctx.lineWidth = 2;
      for (let i = 1; i < 6; i++) {
        const lx = x + (state.basketWidth / 6) * i;
        ctx.beginPath();
        ctx.moveTo(lx, y);
        ctx.lineTo(lx, y + state.basketHeight);
        ctx.stroke();
      }
    };
    const offsets = state.powerUps.multi.active ? [-160, 0, 160] : [0];
    for (const off of offsets) drawOne(state.basketX + off);
    if (state.shieldCharges > 0) {
      ctx.strokeStyle = "rgba(120, 220, 255, 0.95)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(state.basketX, state.basketY - state.basketHeight / 2 - 10, state.basketWidth / 1.7, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawEgg(egg) {
    const species = egg.species || pickAnimalSpecies(egg.kind);
    const baseWidth = egg.kind === "boss" ? 24 : 12;
    const baseHeight = egg.kind === "boss" ? 22 : 12;
    const colorMap = {
      bunny: "#e8ddd4",
      chick: "#e7dfb5",
      puppy: "#dcc9b7",
      kitten: "#ddd8e2",
      golden_bunny: "#d8c46b",
      golden_chick: "#d3b957",
      raccoon: "#82848a",
      skunk: "#cfc8c1",
      owl: "#b8c1d4",
      turtle: "#9eb9aa",
      fox: "#c79265",
      bear: "#a97f62",
    };
    const fill = colorMap[species] || "#f5f0de";
    ctx.fillStyle = fill;

    if (egg.kind === "boss") {
      ctx.beginPath();
      ctx.ellipse(egg.x, egg.y, baseWidth * 1.3, baseHeight * 1.15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ff6d6d";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(egg.x, egg.y, baseWidth * 1.05, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#7a0916";
      ctx.beginPath();
      ctx.arc(egg.x - 8, egg.y - 5, 3, 0, Math.PI * 2);
      ctx.arc(egg.x + 8, egg.y - 5, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(egg.x - 12, egg.y - 18, 5, 0, Math.PI * 2);
      ctx.arc(egg.x + 12, egg.y - 18, 5, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    ctx.beginPath();
    ctx.ellipse(egg.x, egg.y, baseWidth * 1.0, baseHeight * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();

    if (species === "bunny" || species === "golden_bunny") {
      ctx.beginPath();
      ctx.ellipse(egg.x - 6, egg.y - 14, 3, 11, -0.15, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.ellipse(egg.x + 6, egg.y - 14, 3, 11, 0.15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#7b4454";
      ctx.beginPath(); ctx.arc(egg.x, egg.y + 2, 1.6, 0, Math.PI * 2); ctx.fill();
    } else if (species === "chick" || species === "golden_chick") {
      ctx.fillStyle = "#ff8f2b";
      ctx.beginPath(); ctx.moveTo(egg.x, egg.y + 2); ctx.lineTo(egg.x + 4, egg.y + 6); ctx.lineTo(egg.x - 4, egg.y + 6); ctx.fill();
      ctx.fillStyle = "rgba(80,60,30,0.55)";
      ctx.beginPath(); ctx.arc(egg.x - 3, egg.y - 1, 1.5, 0, Math.PI * 2); ctx.arc(egg.x + 3, egg.y - 1, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = fill;
      ctx.beginPath(); ctx.arc(egg.x, egg.y - 8, 4, 0, Math.PI * 2); ctx.fill();
    } else if (species === "puppy") {
      ctx.beginPath(); ctx.arc(egg.x - 7, egg.y - 6, 4, 0, Math.PI * 2); ctx.arc(egg.x + 7, egg.y - 6, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#5a3d2e"; ctx.beginPath(); ctx.arc(egg.x, egg.y + 2, 1.4, 0, Math.PI * 2); ctx.fill();
    } else if (species === "kitten") {
      ctx.beginPath(); ctx.moveTo(egg.x - 10, egg.y - 5); ctx.lineTo(egg.x - 5, egg.y - 14); ctx.lineTo(egg.x - 1, egg.y - 4); ctx.fill();
      ctx.beginPath(); ctx.moveTo(egg.x + 10, egg.y - 5); ctx.lineTo(egg.x + 5, egg.y - 14); ctx.lineTo(egg.x + 1, egg.y - 4); ctx.fill();
      ctx.fillStyle = "#6a507f"; ctx.beginPath(); ctx.arc(egg.x, egg.y + 2, 1.3, 0, Math.PI * 2); ctx.fill();
    } else if (species === "raccoon") {
      ctx.fillStyle = "rgba(30,30,40,0.35)";
      ctx.beginPath(); ctx.ellipse(egg.x, egg.y - 1, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = fill;
      ctx.beginPath(); ctx.arc(egg.x, egg.y + 2, 1.3, 0, Math.PI * 2); ctx.fill();
    } else if (species === "skunk") {
      ctx.strokeStyle = "#6a3b22";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(egg.x, egg.y - 8); ctx.lineTo(egg.x, egg.y - 16); ctx.stroke();
      ctx.fillStyle = fill;
      ctx.beginPath(); ctx.arc(egg.x, egg.y + 2, 1.2, 0, Math.PI * 2); ctx.fill();
    } else if (species === "owl") {
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.beginPath(); ctx.arc(egg.x - 4, egg.y - 2, 3, 0, Math.PI * 2); ctx.arc(egg.x + 4, egg.y - 2, 3, 0, Math.PI * 2); ctx.fill();
    } else if (species === "turtle") {
      ctx.fillStyle = "rgba(50,90,70,0.32)";
      ctx.beginPath(); ctx.arc(egg.x - 8, egg.y + 10, 3, 0, Math.PI * 2); ctx.arc(egg.x + 8, egg.y + 10, 3, 0, Math.PI * 2); ctx.fill();
    } else if (species === "fox") {
      ctx.beginPath(); ctx.moveTo(egg.x - 10, egg.y - 2); ctx.lineTo(egg.x, egg.y - 14); ctx.lineTo(egg.x + 10, egg.y - 2); ctx.fill();
      ctx.fillStyle = "#fff2dc"; ctx.beginPath(); ctx.arc(egg.x, egg.y + 2, 1.2, 0, Math.PI * 2); ctx.fill();
    } else if (species === "bear") {
      ctx.fillStyle = "#4b2f1f";
      ctx.beginPath(); ctx.arc(egg.x - 8, egg.y - 6, 4, 0, Math.PI * 2); ctx.arc(egg.x + 8, egg.y - 6, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#2d190f"; ctx.beginPath(); ctx.arc(egg.x, egg.y + 2, 1.6, 0, Math.PI * 2); ctx.fill();
    }

    ctx.fillStyle = "rgba(11, 29, 53, 0.45)";
    ctx.beginPath();
    ctx.arc(egg.x - 4, egg.y - 2, 1.6, 0, Math.PI * 2);
    ctx.arc(egg.x + 4, egg.y - 2, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Particle system (sparkles and blood) ---------------------------------
  function spawnParticles(x, y, kind = 'sparkle', count = 16) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = kind === 'sparkle' ? rand(30, 260) : rand(80, 380);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed * (kind === 'sparkle' ? 0.6 : 0.9);
      const size = kind === 'sparkle' ? rand(1, 3) : rand(3, 8);
      const life = kind === 'sparkle' ? rand(0.45, 0.95) : rand(0.6, 1.8);
      const color = kind === 'sparkle' ? `rgba(255,${200 + Math.floor(rand(0,55))},${220 + Math.floor(rand(0,35))},1)` : `rgba(${160 + Math.floor(rand(0,80))},20,20,1)`;
      state.particles.push({ x: x || canvas.width / 2, y: y || canvas.height - 24, vx, vy, size, life, age: 0, color, kind });
    }
  }

  function updateParticles(dt) {
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.age += dt;
      if (p.age >= p.life) { state.particles.splice(i, 1); continue; }
      // gravity only for blood
      if (p.kind === 'blood') p.vy += 900 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      // apply slight drag
      p.vx *= (p.kind === 'sparkle' ? 0.995 : 0.98);
    }
  }

  function drawParticles() {
    for (const p of state.particles) {
      const t = 1 - p.age / p.life;
      if (p.kind === 'sparkle') {
        ctx.fillStyle = `rgba(240,236,228,${t})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.6 + t * 1.4), 0, Math.PI * 2); ctx.fill();
        // small glow
        ctx.fillStyle = `rgba(196,182,165,${t * 0.12})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 3 * t, 0, Math.PI * 2); ctx.fill();
      } else {
        // blood splatter
        ctx.fillStyle = `rgba(150,50,56,${0.78 * t})`;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, p.size * (1 + (1 - t) * 0.6), p.size * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    drawBasket();
    for (const egg of state.eggs) drawEgg(egg);
    // draw particles on top of eggs but below HUD
    drawParticles();
    // Draw power-up HUD indicators
    try {
      if (state.powerUps.multi.active) { const remain = Math.max(0, Math.ceil(state.powerUps.multi.expires - state.totalTime)); ctx.fillStyle = "#00ffff"; ctx.font = "14px monospace"; ctx.fillText(`Pack: ${remain}s`, canvas.width - 150, 28); }
      if (state.powerUps.slow.active) { const remain = Math.max(0, Math.ceil(state.powerUps.slow.expires - state.totalTime)); ctx.fillStyle = "#b28cff"; ctx.font = "14px monospace"; ctx.fillText(`Calm: ${remain}s`, canvas.width - 150, 48); }
      if (state.missedEggsSinceLifeLoss) { ctx.fillStyle = "#ffffff"; ctx.font = "12px monospace"; ctx.fillText(`Wild misses: ${state.missedEggsSinceLifeLoss}/3`, 12, 28); }
      // Gold counter
      if (state.goldenEggsCollected) { ctx.fillStyle = "#ffd24d"; ctx.font = "12px monospace"; ctx.fillText(`Nest gold: ${state.goldenEggsCollected}/3`, 12, 46); }
      if (state.comboCount > 1) { ctx.fillStyle = "#9fffd6"; ctx.font = "bold 13px monospace"; ctx.fillText(`Combo x${state.comboCount}`, canvas.width / 2 - 45, 28); }
      if (state.shieldCharges > 0) { ctx.fillStyle = "#8bd8ff"; ctx.font = "12px monospace"; ctx.fillText(`Animal shield: ${state.shieldCharges}`, 12, 64); }
      if (state.mode === "daily") { ctx.fillStyle = "#ffffff"; ctx.font = "12px monospace"; ctx.fillText(`Daily den: ${state.dailyBest}`, canvas.width - 150, 64); }
      if (state.bossWave.active) { ctx.fillStyle = "#ffcccc"; ctx.font = "bold 13px monospace"; ctx.fillText(`Boss Wave!`, canvas.width / 2 - 36, 50); }
    } catch (e) {}
  }

  function loop(now) {
    if (!state.running) return;
    const dt = Math.min(0.033, (now - state.lastTickMs) / 1000);
    state.lastTickMs = now;

    update(dt);
    render();

    if (state.running) requestAnimationFrame(loop);
  }

  function onKey(e, down) {
    const key = e.key.toLowerCase();
    if (key === "arrowleft" || key === "a") state.keys.left = down;
    if (key === "arrowright" || key === "d") state.keys.right = down;
    if (key === "p" && down) togglePause();
  }

  window.addEventListener("keydown", (e) => onKey(e, true));
  window.addEventListener("keyup", (e) => onKey(e, false));

  startBtn.addEventListener("click", startGame);
  resumeBtn.addEventListener("click", () => {
    if (state.phase === "paused") {
      setPaused(false);
      return;
    }
    if (state.phase === "shop" || state.phase === "gameover") {
      startGame();
    }
  });
  retryBtn.addEventListener("click", startGame);
  exitBtn.addEventListener("click", returnToReadyScreen);
  if (pauseBtn) pauseBtn.addEventListener("click", togglePause);
  if (muteToggle) muteToggle.addEventListener("change", () => { state.settings.muted = muteToggle.checked; saveSettings(); });
  if (volumeRange) volumeRange.addEventListener("input", () => { state.settings.volume = Number(volumeRange.value) / 100; saveSettings(); });
  if (modeSelect) modeSelect.addEventListener("change", () => {
    if (modeSelect.value === "daily") {
      overlayText.textContent = `Daily Challenge uses the seed ${getDailySeed()}.`;
    }
  });
  if (buyPlatformBtn) buyPlatformBtn.addEventListener("click", () => purchaseUpgrade("platform"));
  if (buyShieldBtn) buyShieldBtn.addEventListener("click", () => purchaseUpgrade("shield"));
  if (buySpawnBtn) buySpawnBtn.addEventListener("click", () => purchaseUpgrade("spawn"));

  loadSavedData();
  updateHud();
  updateOverlayButtons("ready");
  setCoachMessage("");
  updateShopButtons();
  render();

  // Debug helper: simulate a missed non-rotten egg (useful for testing)
  try {
    window.__simulateMiss = function () {
      state.missedEggsSinceLifeLoss = (state.missedEggsSinceLifeLoss || 0) + 1;
      if (state.missedEggsSinceLifeLoss >= 3) {
        state.lives -= 1;
        state.missedEggsSinceLifeLoss = 0;
      }
      updateHud();
    };
    // spawn a power-up egg near the basket for testing: __spawnPower('multi'|'slow'|'gold')
    window.__spawnPower = function (kind) {
      const egg = { x: state.basketX, y: state.basketY - 10, r: 12, speed: 140, kind: kind || 'multi', wobble: 1.2, t: 0 };
      state.eggs.push(egg);
    };
  } catch (e) {}
})();
