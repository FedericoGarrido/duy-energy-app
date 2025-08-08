/*
 * DUY Energy application logic
 *
 * This script connects to a Shelly Cloud device using the credentials
 * provided in config.js. It periodically polls the device status to obtain
 * instantaneous power readings, integrates them over time to estimate
 * energy consumption in kWh, and splits consumption into "pico" (peak) and
 * "llano" (off‑peak) buckets. The results are displayed in the metric
 * cards. The user can also control the device (turn on/off) from the
 * interface.
 */

// Data structure to persist across sessions. Stores energy tallies and the
// timestamp of the last poll. This is saved to localStorage under
// 'duyEnergyData'.
let state = {
  lastTimestamp: null,
  lastPower: 0,
  picoEnergy: 0,  // kWh consumed during peak hours (17–21)
  llanoEnergy: 0, // kWh consumed during off‑peak hours
  day: null       // Date string (YYYY-MM-DD) of the last update
};

// Load persisted state from localStorage
function loadState() {
  try {
    const stored = localStorage.getItem('duyEnergyData');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Only restore values if the saved date is today; otherwise reset
      const today = new Date().toISOString().slice(0, 10);
      if (parsed.day === today) {
        state = Object.assign(state, parsed);
      }
    }
  } catch (e) {
    console.warn('No stored state or failed to parse localStorage:', e);
  }
}

// Save current state to localStorage
function saveState() {
  try {
    localStorage.setItem('duyEnergyData', JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save state:', e);
  }
}

// Update the metric cards in the UI
function updateMetrics() {
  const total = state.picoEnergy + state.llanoEnergy;
  document.getElementById('total').innerText = total.toFixed(3) + ' kWh';
  document.getElementById('pico').innerText = state.picoEnergy.toFixed(3) + ' kWh';
  document.getElementById('llano').innerText = state.llanoEnergy.toFixed(3) + ' kWh';
  // Index of good use: percentage of consumption in off‑peak hours. Display 0% if total is zero.
  let indice = 0;
  if (total > 0) {
    indice = (state.llanoEnergy / total) * 100;
  }
  document.getElementById('indice').innerText = indice.toFixed(1) + ' %';
}

// Fetch the current device status from Shelly Cloud
async function getShellyStatus() {
  // Construct the URL for the status endpoint. The Shelly Cloud API uses
  // query parameters for GET requests; note that some endpoints also
  // accept POST. We're using GET here for simplicity.
  const url = `${SHELLY_CONFIG.server}/device/status?device_id=${encodeURIComponent(SHELLY_CONFIG.device_id)}&auth_key=${encodeURIComponent(SHELLY_CONFIG.auth_key)}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    // Extract the instantaneous power in watts. Some Shelly devices report an
    // array of meters; we assume index 0 holds the relevant data.
    const meters = data?.data?.device_status?.meters;
    let power = 0;
    if (Array.isArray(meters) && meters.length > 0) {
      // 'power' is in watts
      power = meters[0].power || 0;
    }
    handleNewPowerMeasurement(power);
  } catch (error) {
    console.error('Error fetching Shelly status:', error);
  }
}

// Handle a new power measurement by integrating energy over time.
function handleNewPowerMeasurement(power) {
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  // Reset daily counters if a new day has started
  if (state.day && state.day !== today) {
    state.picoEnergy = 0;
    state.llanoEnergy = 0;
    state.lastTimestamp = null;
  }
  state.day = today;
  // Integrate energy if we have a previous timestamp
  if (state.lastTimestamp != null) {
    const elapsedMs = now - state.lastTimestamp;
    // Convert to hours
    const elapsedHours = elapsedMs / (1000 * 60 * 60);
    // Use the previous power measurement for the elapsed period. Power is in W,
    // so energy in kWh = (power * hours) / 1000.
    const energyDelta = (state.lastPower * elapsedHours) / 1000;
    // Determine if the current hour is peak or off‑peak based on start of period
    const hour = new Date(state.lastTimestamp).getHours();
    if (hour >= 17 && hour < 21) {
      state.picoEnergy += energyDelta;
    } else {
      state.llanoEnergy += energyDelta;
    }
  }
  // Update state with latest measurement
  state.lastTimestamp = now;
  state.lastPower = power;
  // Persist and update UI
  saveState();
  updateMetrics();
}

// Send a command to turn the device on or off via Shelly Cloud
async function controlShelly(turn) {
  const url = `${SHELLY_CONFIG.server}/device/relay/control?device_id=${encodeURIComponent(SHELLY_CONFIG.device_id)}&auth_key=${encodeURIComponent(SHELLY_CONFIG.auth_key)}&channel=0&turn=${encodeURIComponent(turn)}`;
  try {
    const response = await fetch(url);
    if (response.ok) {
      alert(`Dispositivo ${turn === 'on' ? 'encendido' : 'apagado'}`);
    } else {
      alert('No se pudo enviar el comando.');
    }
  } catch (err) {
    console.error('Error sending control command:', err);
    alert('Error al enviar el comando.');
  }
}

// Initialise the application
function init() {
  loadState();
  updateMetrics();
  // Set up button event handlers
  document.getElementById('btn-on').addEventListener('click', () => controlShelly('on'));
  document.getElementById('btn-off').addEventListener('click', () => controlShelly('off'));
  // Register the service worker if supported
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(err => {
      console.warn('Service worker registration failed:', err);
    });
  }
  // Start polling the Shelly device every minute
  getShellyStatus();
  setInterval(getShellyStatus, 60 * 1000);
}

// Wait for the DOM to be fully loaded before initialising
document.addEventListener('DOMContentLoaded', init);