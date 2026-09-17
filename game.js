// 1. CONFIGURATION
const SUPABASE_URL = 'https://jzzzzeqphxwvrlqwiget.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imppenp6ZXFwaHh3dnJscXdpZ2V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NTQ3ODEsImV4cCI6MjEwNTIzMDc4MX0.WdBYOYAXovbLllH9MEoBsNjcYmOQ6wxV4unOWzbEMAc';

let supabase = null;
let state = { user: null, sats: 0, level: 1, rate: 1, cost: 50 };

// 2. SAFE INITIALIZATION
window.onload = async () => {
  try {
    if (window.supabase && window.supabase.createClient) {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user) {
        handleLoginSuccess(session.user);
        return;
      }
    }
  } catch (err) {
    console.error("Auth init error:", err);
  }
  showAuthScreen();
};

// 3. AUTHENTICATION
async function handleSignUp() {
  if (!supabase) return alert("Database client not ready yet. Please wait 2 seconds and try again.");
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const authStatus = document.getElementById('authStatus');
  
  if (!email || !password) { authStatus.innerText = 'Enter email & password.'; return; }
  authStatus.innerText = 'Creating account...';
  
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) { 
    authStatus.innerText = 'Error: ' + error.message; 
  } else if (data.user) {
    if (data.session === null) {
      authStatus.innerText = 'Account created! Logging in...';
      handleLogin();
    } else {
      handleLoginSuccess(data.user);
    }
  }
}

async function handleLogin() {
  if (!supabase) return alert("Database client not ready yet. Please wait 2 seconds and try again.");
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const authStatus = document.getElementById('authStatus');
  
  if (!email || !password) { authStatus.innerText = 'Enter email & password.'; return; }
  authStatus.innerText = 'Logging in...';
  
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { 
    authStatus.innerText = 'Login failed: ' + error.message; 
  } else if (data.user) {
    authStatus.innerText = '';
    handleLoginSuccess(data.user);
  }
}

async function handleLogout() {
  if (supabase) {
    await savePlayerData();
    await supabase.auth.signOut();
  }
  state.user = null;
  showAuthScreen();
}

function handleLoginSuccess(user) {
  state.user = user;
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

// 4. GAMEPLAY ACTIONS
function mineSats() {
  state.sats += 10;
  updateUI();
}

function buyUpgrade() {
  if (state.sats >= state.cost) {
    state.sats -= state.cost;
    state.level += 1;
    state.rate += 1;
    state.cost = Math.floor(state.cost * 1.5);
    updateUI();
    savePlayerData();
  } else { 
    alert('Not enough sats!'); 
  }
}

function claimDailyBonus() {
  state.sats += 100;
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
    state.sats = 0; state.level = 1; state.rate = 1; state.cost = 50;
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
  state.sats += 50;
  updateUI(); 
  savePlayerData();
}

function gameLoop() { 
  state.sats += state.rate; 
  updateUI(); 
}

let progressWidth = 0;
function animateProgressBar() {
  progressWidth = (progressWidth + 10) % 100;
  const bar = document.getElementById('progress');
  if (bar) bar.style.width = progressWidth + '%';
}

// 5. DATABASE SYNC
function updateUI() {
  const elSats = document.getElementById('sats');
  const elRate = document.getElementById('rate');
  const elLevel = document.getElementById('level');
  const elCost = document.getElementById('cost');

  if (elSats) elSats.innerText = Math.floor(state.sats);
  if (elRate) elRate.innerText = state.rate;
  if (elLevel) elLevel.innerText = state.level;
  if (elCost) elCost.innerText = state.cost;
}

async function loadPlayerData() {
  if (!state.user || !supabase) return;
  const { data } = await supabase.from('players').select('*').eq('user_id', state.user.id).single();
  
  if (data) {
    state.sats = data.sats || 0;
    state.level = data.level || 1;
    state.rate = data.rate || 1;
    state.cost = data.cost || 50;
    if (data.updated_at) {
      const secondsOffline = Math.floor((Date.now() - new Date(data.updated_at).getTime()) / 1000);
      if (secondsOffline > 10) {
        const offlineEarnings = secondsOffline * state.rate;
        state.sats += offlineEarnings;
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
  if (!state.user || !supabase) return;
  await supabase.from('players').upsert({
    user_id: state.user.id,
    sats: state.sats,
    level: state.level,
    rate: state.rate,
    cost: state.cost,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' });
}