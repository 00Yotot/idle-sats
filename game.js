// CONFIGURATION
const SUPABASE_URL = 'https://jizzzeqphxwvrlqwiget.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_YRTibpwfa4SgJ1M1HCyU-w_T8utBcPy';

// In-Memory Storage Adapter to bypass Browser Tracking Prevention
const memoryStorage = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

var supabaseClient = null;
var gameState = { user: null, sats: 0, level: 1, rate: 1, cost: 50 };

// INITIALIZATION
window.onload = async () => {
  try {
    if (window.supabase && window.supabase.createClient) {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          storage: memoryStorage,
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });
    } else {
      alert("Supabase script blocked by browser extension. Please disable tracking blockers for this site.");
    }
  } catch (err) {
    console.error("Init error:", err);
  }
  showAuthScreen();
};

// AUTHENTICATION
async function handleSignUp() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const authStatus = document.getElementById('authStatus');

  if (!email || !password) { 
    alert("Please enter both email and password."); 
    return; 
  }

  if (!supabaseClient) {
    alert("Database client not ready. Try opening in a standard browser window.");
    return;
  }

  authStatus.innerText = 'Creating account...';

  try {
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) { 
      alert("Sign up error: " + error.message);
      authStatus.innerText = 'Error: ' + error.message; 
    } else if (data.user) {
      if (data.session === null) {
        alert("Account created! Logging in...");
        handleLogin();
      } else {
        handleLoginSuccess(data.user);
      }
    }
  } catch (err) {
    alert("Fetch failed. Please check your browser tracking prevention settings or try Chrome/Firefox.");
    console.error("Fetch Error Detail:", err);
  }
}

async function handleLogin() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const authStatus = document.getElementById('authStatus');

  if (!email || !password) { 
    alert("Please enter both email and password."); 
    return; 
  }

  if (!supabaseClient) {
    alert("Database client not ready.");
    return;
  }

  authStatus.innerText = 'Logging in...';

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) { 
      alert("Login error: " + error.message);
      authStatus.innerText = 'Login failed: ' + error.message; 
    } else if (data.user) {
      authStatus.innerText = '';
      handleLoginSuccess(data.user);
    }
  } catch (err) {
    alert("Fetch error: " + err.message);
  }
}

async function handleLogout() {
  if (supabaseClient) {
    await savePlayerData();
    await supabaseClient.auth.signOut();
  }
  gameState.user = null;
  showAuthScreen();
}

function handleLoginSuccess(user) {
  gameState.user = user;
  document.getElementById('userEmail').innerText = user.email;
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('gameScreen').style.display = 'block';

  loadPlayerData();
  setInterval(gameLoop, 1000);
  setInterval(animateProgressBar, 100);
  setInterval(savePlayerData, 10000);
}

function showAuthScreen() {
  document.getElementById('authScreen').style.display = 'block';
  document.getElementById('gameScreen').style.display = 'none';
}

// GAMEPLAY ACTIONS
function mineSats() {
  gameState.sats += 10;
  updateUI();
}

function buyUpgrade() {
  if (gameState.sats >= gameState.cost) {
    gameState.sats -= gameState.cost;
    gameState.level += 1;
    gameState.rate += 1;
    gameState.cost = Math.floor(gameState.cost * 1.5);
    updateUI();
    savePlayerData();
  } else { 
    alert('Not enough sats!'); 
  }
}

function claimDailyBonus() {
  gameState.sats += 100;
  const btn = document.getElementById('daily');
  if (btn) {
    btn.disabled = true;
    btn.innerText = 'CLAIMED TODAY';
  }
  updateUI();
  savePlayerData();
}

function resetGame() {
  if (confirm('Reset all progress?')) {
    gameState.sats = 0; gameState.level = 1; gameState.rate = 1; gameState.cost = 50;
    const btn = document.getElementById('daily');
    if (btn) {
      btn.disabled = false; 
      btn.innerText = '🎁 Claim 100 Daily Sats';
    }
    updateUI(); 
    savePlayerData();
  }
}

function showAd() { 
  document.getElementById('adOverlay').style.display = 'flex'; 
}

function completeAd() {
  document.getElementById('adOverlay').style.display = 'none';
  gameState.sats += 50;
  updateUI(); 
  savePlayerData();
}

function gameLoop() { 
  gameState.sats += gameState.rate; 
  updateUI(); 
}

let progressWidth = 0;
function animateProgressBar() {
  progressWidth = (progressWidth + 10) % 100;
  const bar = document.getElementById('progress');
  if (bar) bar.style.width = progressWidth + '%';
}

// DATABASE SYNC
function updateUI() {
  const elSats = document.getElementById('sats');
  const elRate = document.getElementById('rate');
  const elLevel = document.getElementById('level');
  const elCost = document.getElementById('cost');

  if (elSats) elSats.innerText = Math.floor(gameState.sats);
  if (elRate) elRate.innerText = gameState.rate;
  if (elLevel) elLevel.innerText = gameState.level;
  if (elCost) elCost.innerText = gameState.cost;
}

async function loadPlayerData() {
  if (!gameState.user || !supabaseClient) return;
  const { data } = await supabaseClient.from('players').select('*').eq('user_id', gameState.user.id).single();
  
  if (data) {
    gameState.sats = data.sats || 0;
    gameState.level = data.level || 1;
    gameState.rate = data.rate || 1;
    gameState.cost = data.cost || 50;
    if (data.updated_at) {
      const secondsOffline = Math.floor((Date.now() - new Date(data.updated_at).getTime()) / 1000);
      if (secondsOffline > 10) {
        const offlineEarnings = secondsOffline * gameState.rate;
        gameState.sats += offlineEarnings;
        const elOff = document.getElementById('offline');
        if (elOff) elOff.innerText = 'Earned ' + offlineEarnings + ' sats while offline!';
      }
    }
  } else {
    await savePlayerData();
  }
  updateUI();
}

async function savePlayerData() {
  if (!gameState.user || !supabaseClient) return;
  await supabaseClient.from('players').upsert({
    user_id: gameState.user.id,
    sats: gameState.sats,
    level: gameState.level,
    rate: gameState.rate,
    cost: gameState.cost,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' });
}