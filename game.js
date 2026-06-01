const LOCATIONS = {
  world: [
    { lat: 48.8566, lng: 2.3522, name: "Paris, Frankrig" },
    { lat: 35.6762, lng: 139.6503, name: "Tokyo, Japan" },
    { lat: 40.7128, lng: -74.0060, name: "New York, USA" },
    { lat: -33.8688, lng: 151.2093, name: "Sydney, Australien" },
    { lat: -22.9068, lng: -43.1729, name: "Rio de Janeiro, Brasilien" },
    { lat: 51.5074, lng: -0.1278, name: "London, England" },
    { lat: 55.7558, lng: 37.6176, name: "Moskva, Rusland" },
    { lat: 39.9042, lng: 116.4074, name: "Beijing, Kina" },
    { lat: 19.4326, lng: -99.1332, name: "Mexico City, Mexico" },
    { lat: -34.6037, lng: -58.3816, name: "Buenos Aires, Argentina" },
    { lat: 1.3521, lng: 103.8198, name: "Singapore" },
    { lat: 41.0082, lng: 28.9784, name: "Istanbul, Tyrkiet" },
    { lat: 25.2048, lng: 55.2708, name: "Dubai, UAE" },
    { lat: -1.2921, lng: 36.8219, name: "Nairobi, Kenya" },
    { lat: 28.6139, lng: 77.2090, name: "New Delhi, Indien" },
  ],
  europe: [
    { lat: 48.8566, lng: 2.3522, name: "Paris, Frankrig" },
    { lat: 51.5074, lng: -0.1278, name: "London, England" },
    { lat: 52.5200, lng: 13.4050, name: "Berlin, Tyskland" },
    { lat: 41.9028, lng: 12.4964, name: "Rom, Italien" },
    { lat: 40.4168, lng: -3.7038, name: "Madrid, Spanien" },
    { lat: 55.6761, lng: 12.5683, name: "København, Danmark" },
    { lat: 59.3293, lng: 18.0686, name: "Stockholm, Sverige" },
    { lat: 47.4979, lng: 19.0402, name: "Budapest, Ungarn" },
    { lat: 50.0755, lng: 14.4378, name: "Prag, Tjekkiet" },
    { lat: 52.2297, lng: 21.0122, name: "Warszawa, Polen" },
    { lat: 37.9838, lng: 23.7275, name: "Athen, Grækenland" },
    { lat: 48.2082, lng: 16.3738, name: "Wien, Østrig" },
    { lat: 45.4642, lng: 9.1900, name: "Milano, Italien" },
    { lat: 53.3498, lng: -6.2603, name: "Dublin, Irland" },
    { lat: 59.9139, lng: 10.7522, name: "Oslo, Norge" },
  ],
  denmark: [
    { lat: 55.6761, lng: 12.5683, name: "København" },
    { lat: 56.1629, lng: 10.2039, name: "Aarhus" },
    { lat: 55.4038, lng: 10.4024, name: "Odense" },
    { lat: 57.0488, lng: 9.9217, name: "Aalborg" },
    { lat: 55.7113, lng: 12.5340, name: "Frederiksberg" },
    { lat: 56.4607, lng: 9.9848, name: "Viborg" },
    { lat: 55.0556, lng: 10.6017, name: "Svendborg" },
    { lat: 56.8918, lng: 8.6400, name: "Holstebro" },
    { lat: 55.8607, lng: 9.8503, name: "Silkeborg" },
    { lat: 55.4960, lng: 8.4520, name: "Esbjerg" },
  ]
};

const MAP_BOUNDS = {
  world:   { center: [20, 0], zoom: 2, minZoom: 1, maxZoom: 10 },
  europe:  { center: [52, 15], zoom: 4, minZoom: 3, maxZoom: 12 },
  denmark: { center: [56, 10], zoom: 7, minZoom: 6, maxZoom: 14 },
};

let state = {
  apiKey: null,
  playerName: 'Monne',
  totalRounds: 5,
  timeLimit: 60,
  mode: 'normal',
  mapName: 'world',
  round: 1,
  totalScore: 0,
  timer: 60,
  timerInterval: null,
  guessMarker: null,
  guessLatLng: null,
  currentLocation: null,
  usedIndexes: [],
  leafletMap: null,
  resultMap: null,
  soundEnabled: true,
  startLat: null,
  startLng: null,
};

// Auto-load token fra config.js hvis sat
window.addEventListener('DOMContentLoaded', () => {
  if (typeof CONFIG !== 'undefined' && CONFIG.mapillaryToken && CONFIG.mapillaryToken !== "DIN_TOKEN_HER") {
    state.apiKey = CONFIG.mapillaryToken;
    showScreen('menu-screen');
  } else {
    showScreen('api-screen');
  }
});

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
  });
  const el = document.getElementById(id);
  el.style.display = id === 'game-screen' ? 'block' : 'flex';
  el.classList.add('active');
}

function startWithKey() {
  const key = document.getElementById('api-input').value.trim();
  if (key.length < 5) { alert('Indtast en gyldig Mapillary Access Token'); return; }
  state.apiKey = key;
  showScreen('menu-screen');
}

function startGame() {
  state.playerName = document.getElementById('player-name')?.value || 'Monne';
  state.totalRounds = parseInt(document.getElementById('rounds-select')?.value || 5);
  state.timeLimit = parseInt(document.getElementById('time-select')?.value || 60);
  state.mode = document.getElementById('mode-select')?.value || 'normal';
  state.mapName = document.getElementById('map-select')?.value || 'world';
  state.round = 1;
  state.totalScore = 0;
  state.usedIndexes = [];
  document.getElementById('hud-name').textContent = state.playerName;
  document.getElementById('tot-rounds').textContent = state.totalRounds;
  document.getElementById('final-max').textContent = 'ud af ' + (state.totalRounds * 5000).toLocaleString('da');
  showScreen('game-screen');
  loadRound();
}

function getRandomLocation() {
  const pool = LOCATIONS[state.mapName];
  let available = pool.map((_, i) => i).filter(i => !state.usedIndexes.includes(i));
  if (available.length === 0) { state.usedIndexes = []; available = pool.map((_, i) => i); }
  const idx = available[Math.floor(Math.random() * available.length)];
  state.usedIndexes.push(idx);
  return pool[idx];
}

function loadRound() {
  state.currentLocation = getRandomLocation();
  state.startLat = state.currentLocation.lat;
  state.startLng = state.currentLocation.lng;
  state.guessLatLng = null;
  state.guessMarker = null;

  document.getElementById('cur-round').textContent = state.round;
  document.getElementById('result-overlay').classList.remove('show');
  document.getElementById('final-overlay').classList.remove('show');
  document.getElementById('health-bar').style.width = '100%';
  document.getElementById('guess-btn').disabled = true;

  const placeholder = document.getElementById('sv-placeholder');
  placeholder.classList.remove('hidden');
  document.getElementById('sv-status').textContent = 'Henter lokation...';

  fetchMapillaryImage(state.currentLocation.lat, state.currentLocation.lng);
  initGuessMap();
  startTimer();
}

async function fetchMapillaryImage(lat, lng) {
  if (!state.apiKey) { fallbackStreetView(lat, lng); return; }
  const url = `https://graph.mapillary.com/images?access_token=${state.apiKey}&fields=id,thumb_2048_url&is_pano=true&limit=5&bbox=${lng-0.05},${lat-0.05},${lng+0.05},${lat+0.05}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.data && data.data.length > 0) {
      showMapillaryViewer(data.data[0].id);
    } else {
      fallbackStreetView(lat, lng);
    }
  } catch (e) {
    fallbackStreetView(lat, lng);
  }
}

function showMapillaryViewer(imageId) {
  const placeholder = document.getElementById('sv-placeholder');
  const iframe = document.getElementById('sv-iframe');
  iframe.src = `https://www.mapillary.com/embed?image_key=${imageId}&style=photo`;
  iframe.style.display = 'block';
  placeholder.classList.add('hidden');

  if (state.mode === 'nomove' || state.mode === 'nmpz') {
    const overlay = document.createElement('div');
    overlay.id = 'move-blocker';
    overlay.style.cssText = 'position:absolute;inset:0;z-index:5;cursor:not-allowed;';
    document.getElementById('game-screen').appendChild(overlay);
  }
}

function fallbackStreetView(lat, lng) {
  const iframe = document.getElementById('sv-iframe');
  const placeholder = document.getElementById('sv-placeholder');
  iframe.src = `https://maps.google.com/maps?q=&layer=c&cbll=${lat},${lng}&cbp=12,0,0,0,0&output=svembed`;
  iframe.style.display = 'block';
  placeholder.classList.add('hidden');
}

function initGuessMap() {
  if (state.leafletMap) {
    state.leafletMap.remove();
    state.leafletMap = null;
  }
  const bounds = MAP_BOUNDS[state.mapName];
  const map = L.map('game-map', {
    center: bounds.center,
    zoom: bounds.zoom,
    minZoom: bounds.minZoom,
    maxZoom: bounds.maxZoom,
    zoomControl: false,
    scrollWheelZoom: true,
  });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© CartoDB',
    subdomains: 'abcd',
  }).addTo(map);
  L.control.zoom({ position: 'topright' }).addTo(map);
  map.on('click', (e) => placeGuess(e.latlng, map));
  state.leafletMap = map;
}

function placeGuess(latlng, map) {
  state.guessLatLng = latlng;
  if (state.guessMarker) state.guessMarker.remove();
  const icon = L.divIcon({
    className: '',
    html: '<div style="width:14px;height:14px;background:#c8f03a;border:2px solid #fff;border-radius:50%;"></div>',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
  state.guessMarker = L.marker(latlng, { icon }).addTo(map);
  document.getElementById('guess-btn').disabled = false;
}

function submitGuess() {
  clearInterval(state.timerInterval);
  const blocker = document.getElementById('move-blocker');
  if (blocker) blocker.remove();

  let dist = 0;
  let score = 0;
  if (state.guessLatLng) {
    const R = 6371;
    const dLat = (state.currentLocation.lat - state.guessLatLng.lat) * Math.PI / 180;
    const dLng = (state.currentLocation.lng - state.guessLatLng.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(state.guessLatLng.lat * Math.PI/180) * Math.cos(state.currentLocation.lat * Math.PI/180) * Math.sin(dLng/2)**2;
    dist = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
    score = Math.max(0, Math.round(5000 * Math.exp(-dist / 2000)));
  }

  state.totalScore += score;
  const healthPct = Math.max(0, 100 - (dist / 100));
  document.getElementById('health-bar').style.width = healthPct + '%';

  document.getElementById('result-score').textContent = score.toLocaleString('da');
  document.getElementById('result-dist').textContent = state.guessLatLng
    ? `Du var ${dist.toLocaleString('da')} km fra ${state.currentLocation.name}`
    : `Ingen gæt placeret — svaret var ${state.currentLocation.name}`;

  showResultMap();
  document.getElementById('result-overlay').classList.add('show');
  playSound(score > 3000 ? 'good' : 'ok');
}

function showResultMap() {
  const el = document.getElementById('result-map');
  el.innerHTML = '';
  const rmap = L.map(el, { zoomControl: false, attributionControl: false });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { subdomains: 'abcd' }).addTo(rmap);

  const correctIcon = L.divIcon({
    className: '',
    html: '<div style="width:16px;height:16px;background:#f74f4f;border:2px solid #fff;border-radius:50%;"></div>',
    iconSize: [16,16], iconAnchor: [8,8]
  });
  const guessIcon = L.divIcon({
    className: '',
    html: '<div style="width:14px;height:14px;background:#c8f03a;border:2px solid #fff;border-radius:50%;"></div>',
    iconSize: [14,14], iconAnchor: [7,7]
  });

  const correct = [state.currentLocation.lat, state.currentLocation.lng];
  L.marker(correct, { icon: correctIcon }).addTo(rmap);

  if (state.guessLatLng) {
    const guess = [state.guessLatLng.lat, state.guessLatLng.lng];
    L.marker(guess, { icon: guessIcon }).addTo(rmap);
    L.polyline([correct, guess], { color: '#c8f03a', weight: 2, dashArray: '6 4' }).addTo(rmap);
    rmap.fitBounds([correct, guess], { padding: [30, 30] });
  } else {
    rmap.setView(correct, 5);
  }

  state.resultMap = rmap;
  setTimeout(() => rmap.invalidateSize(), 100);
}

function nextRound() {
  if (state.resultMap) { state.resultMap.remove(); state.resultMap = null; }
  if (state.round >= state.totalRounds) {
    document.getElementById('final-score').textContent = state.totalScore.toLocaleString('da');
    document.getElementById('result-overlay').classList.remove('show');
    document.getElementById('final-overlay').classList.add('show');
    return;
  }
  state.round++;
  loadRound();
}

function startTimer() {
  if (state.timeLimit === 0) {
    document.getElementById('timer-display').textContent = '∞';
    return;
  }
  state.timer = state.timeLimit;
  document.getElementById('timer-display').textContent = state.timer;
  document.getElementById('timer-display').className = 'timer';
  clearInterval(state.timerInterval);
  state.timerInterval = setInterval(() => {
    state.timer--;
    const el = document.getElementById('timer-display');
    el.textContent = state.timer;
    el.className = 'timer' + (state.timer <= 10 ? ' danger' : state.timer <= 20 ? ' warning' : '');
    if (state.timer <= 0) { clearInterval(state.timerInterval); submitGuess(); }
  }, 1000);
}

function respawn() {
  if (!state.leafletMap) return;
  if (state.startLat && state.startLng) {
    const bounds = MAP_BOUNDS[state.mapName];
    state.leafletMap.setView([state.startLat, state.startLng], bounds.zoom);
  }
  const iframe = document.getElementById('sv-iframe');
  if (iframe.src) iframe.src = iframe.src;
}

function toggleSettings() {
  document.getElementById('settings-panel').classList.toggle('open');
}

function toggleSound() {
  state.soundEnabled = document.getElementById('sound-toggle').checked;
}

function setUISize(size) {
  const scale = size === 'small' ? 0.8 : size === 'large' ? 1.2 : 1;
  document.documentElement.style.setProperty('--ui-scale', scale);
}

function playSound(type) {
  if (!state.soundEnabled) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = type === 'good' ? 523 : 330;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch(e) {}
}

document.addEventListener('click', (e) => {
  const panel = document.getElementById('settings-panel');
  const btn = document.querySelector('.ctrl-btn');
  if (panel && !panel.contains(e.target) && e.target !== btn) {
    panel.classList.remove('open');
  }
});

window.showScreen = showScreen;
window.startWithKey = startWithKey;
window.startGame = startGame;
window.submitGuess = submitGuess;
window.nextRound = nextRound;
window.respawn = respawn;
window.toggleSettings = toggleSettings;
window.toggleSound = toggleSound;
window.setUISize = setUISize;
