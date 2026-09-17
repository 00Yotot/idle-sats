// 1. SUPABASE INITIALIZATION
const SUPABASE_URL = 'https://jzzzzeqphxwvrlqwiget.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imppenp6ZXFwaHh3dnJscXdpZ2V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NTQ3ODEsImV4cCI6MjEwNTIzMDc4MX0.WdBYOYAXovbLllH9MEoBsNjcYmOQ6wxV4unOWzbEMAc';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. STATE & VARIABLES
let state = { user: null, sats: 0, level: 1, rate: 1, cost: 50 };

let authScreen, gameScreen, emailInput, passwordInput, signupBtn, loginBtn, logoutBtn, authStatus, userEmailSpan;
let satsDisplay, rateDisplay, levelDisplay, costDisplay;
let upgradeBtn, mineBtn, rewardBtn, dailyBtn, resetBtn;
let adOverlay, closeAdBtn, adStatus, offlineDisplay, progressBar;

// 3. INITIALIZATION
window.addEventListener('DOMContentLoaded', async () => {
  bindElements();
  setupEventListeners();
  
  const { data: { session } } = await supabase.auth.getSession();
  if (session && session.user) {
    handleLoginSuccess(session.user);
  } else {
    showAuthScreen();
  }
});

function bindElements() {
  authScreen = document.getElementById('authScreen');
  gameScreen = document.getElementById('gameScreen');
  emailInput = document.getElementById('email');
  passwordInput = document.getElementById('password');
  signupBtn = document.getElementById('signup');
  loginBtn = document.getElementById('login');
  logoutBtn = document.getElementById('logout');
  authStatus = document.getElementById('authStatus');
  userEmailSpan = document.getElementById('userEmail');

  satsDisplay = document.getElementById('sats');
  rateDisplay = document.getElementById('rate');
  levelDisplay = document.getElementById('level');
  costDisplay = document.getElementById('cost');

  upgradeBtn = document.getElementById('upgrade');
  mineBtn = document.getElementById('mine');
  rewardBtn = document.getElementById('reward');
  dailyBtn = document.getElementById('daily');
  resetBtn = document.getElementById('reset');

  adOverlay = document.getElementById('adOverlay');
  closeAdBtn = document.getElementById('closeAd');
  adStatus = document.getElementById('adStatus');
  offlineDisplay = document.getElementById('offline');
  progressBar = document.getElementById('progress');
}

function setupEventListeners() {
  signupBtn.addEventListener('click', handleSignUp);
  loginBtn.addEventListener('click', handleLogin);
  logoutBtn.addEventListener('click', handleLogout);

  mineBtn.addEventListener('click', () => { state.sats += 10; updateUI(); });
  upgradeBtn.addEventListener('click', buyUpgrade);
  dailyBtn.addEventListener('click', claimDailyBonus);
  resetBtn.addEventListener('click', resetGame);

  rewardBtn.addEventListener('click', showAd);
  closeAdBtn.addEventListener('click', completeAd);
}

// 4. AUTHENTICATION
async function handleSignUp() {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  if (!email || !password) { authStatus.innerText = 'Enter email & password.'; return; }
  authStatus.innerText = 'Creating account...';
  
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) { 
    authStatus.innerText = 'Error: ' + error.message; 
  } else if (data.user) {
    if (data.session === null) {
      authStatus.innerText = 'Created! Disable email confirmation in Supabase if login fails.';
    } else {
      handleLoginSuccess(data.user);
    }
  }
}

async function handleLogin() {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
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
  await savePlayerData();
  await supabase.auth.signOut();
  state.user = null;
  showAuthScreen();
}

function handleLoginSuccess(user) {
  state.user = user;
  userEmailSpan.innerText = user.email;
  authScreen.style.display = 'none';
  gameScreen.style.display = 'block';

  loadPlayerData();
  setInterval(gameLoop, 1000);
  setInterval(animateProgressBar, 100);
  setInterval(savePlayerData, 10000);
}

function showAuthScreen() {
  authScreen.style.display = 'block';
  gameScreen.style.display = 'none';
}

// 5. GAME ENGINE
function gameLoop() { state.sats += state.rate; updateUI(); }

let progressWidth = 0;
function animateProgressBar() {
  progressWidth = (progressWidth + 10) % 100;
  if (progressBar) progressBar.style.width = progressWidth + '%';
}

function buyUpgrade() {
  if (state.sats >= state.cost) {
    state.sats -= state.cost;
    state.level += 1;
    state.rate += 1;
    state.cost = Math.floor(state.cost * 1.5);
    updateUI();
    savePlayerData();
  } else { alert('Not enough sats!'); }
}

function claimDailyBonus() {
  state.sats += 100;
  dailyBtn.disabled = true;
  dailyBtn.innerText = 'CLAIMED TODAY';
  updateUI();
  savePlayerData();
}

function resetGame() {
  if (confirm('Reset all progress?')) {
    state.sats = 0; state.level = 1; state.rate = 1; state.cost = 50;
    dailyBtn.disabled = false; dailyBtn.innerText = '?? Claim 100 Daily Sats';
    updateUI(); savePlayerData();
  }
}

function showAd() { adOverlay.style.display = 'flex'; }
function completeAd() {
  adOverlay.style.display = 'none';
  state.sats += 50;
  updateUI(); savePlayerData();
}

// 6. DATABASE SYNC
function updateUI() {
  satsDisplay.innerText = Math.floor(state.sats);
  rateDisplay.innerText = state.rate;
  levelDisplay.innerText = state.level;
  costDisplay.innerText = state.cost;
}

async function loadPlayerData() {
  if (!state.user) return;
  const { data, error } = await supabase.from('players').select('*').eq('user_id', state.user.id).single();
  
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
        offlineDisplay.innerText = 'Earned ' + offlineEarnings + ' sats while offline!';
      }
    }
  } else {
    await savePlayerData();
  }
  updateUI();
}

async function savePlayerData() {
  if (!state.user) return;
  await supabase.from('players').upsert({
    user_id: state.user.id,
    sats: state.sats,
    level: state.level,
    rate: state.rate,
    cost: state.cost,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' });
}
