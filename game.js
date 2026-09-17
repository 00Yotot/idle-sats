// 1. SUPABASE CONFIGURATION
const SUPABASE_URL = 'https://jzzzzeqphxwvrlqwiget.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imppenp6ZXFwaHh3dnJscXdpZ2V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NTQ3ODEsImV4cCI6MjEwNTIzMDc4MX0.WdBYOYAXovbLllH9MEoBsNjcYmOQ6wxV4unOWzbEMAc';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. GAME STATE
let state = { user: null, sats: 0, level: 1, rate: 1, cost: 50 };

// 3. DOM ELEMENTS
const authScreen = document.getElementById('authScreen');
const gameScreen = document.getElementById('gameScreen');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const signupBtn = document.getElementById('signup');
const loginBtn = document.getElementById('login');
const logoutBtn = document.getElementById('logout');
const authStatus = document.getElementById('authStatus');
const userEmailSpan = document.getElementById('userEmail');

const satsDisplay = document.getElementById('sats');
const rateDisplay = document.getElementById('rate');
const levelDisplay = document.getElementById('level');
const productionDisplay = document.getElementById('production');
const costDisplay = document.getElementById('cost');

const upgradeBtn = document.getElementById('upgrade');
const mineBtn = document.getElementById('mine');
const rewardBtn = document.getElementById('reward');
const dailyBtn = document.getElementById('daily');
const resetBtn = document.getElementById('reset');

const adOverlay = document.getElementById('adOverlay');
const closeAdBtn = document.getElementById('closeAd');
const adStatus = document.getElementById('adStatus');
const offlineDisplay = document.getElementById('offline');
const progressBar = document.getElementById('progress');

// 4. INITIALIZATION
window.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  const { data: { session } } = await supabase.auth.getSession();
  if (session) { handleLoginSuccess(session.user); } else { showAuthScreen(); }
});

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

// 5. AUTHENTICATION LOGIC
async function handleSignUp() {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  if (!email || !password) { authStatus.innerText = 'Please enter both email and password.'; return; }
  authStatus.innerText = 'Creating account...';
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) { authStatus.innerText = 'Error: ' + error.message; }
  else if (data.user) {
    if (data.session === null) { authStatus.innerText = 'Account created! Check email to confirm or log in.'; }
    else { handleLoginSuccess(data.user); }
  }
}

async function handleLogin() {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  if (!email || !password) { authStatus.innerText = 'Please enter both email and password.'; return; }
  authStatus.innerText = 'Logging in...';
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { authStatus.innerText = 'Login failed: ' + error.message; }
  else if (data.user) { authStatus.innerText = ''; handleLoginSuccess(data.user); }
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
  setInterval(savePlayerData, 20000);
}

function showAuthScreen() {
  authScreen.style.display = 'flex';
  gameScreen.style.display = 'none';
}

// 6. GAMEPLAY
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
  if (confirm('Reset game progress?')) {
    state.sats = 0; state.level = 1; state.rate = 1; state.cost = 50;
    dailyBtn.disabled = false; dailyBtn.innerText = 'CLAIM 100 SATS';
    updateUI(); savePlayerData();
  }
}

// 7. ADS
function showAd() { adOverlay.style.display = 'flex'; adStatus.innerText = 'Ad in progress...'; }
function completeAd() {
  adOverlay.style.display = 'none';
  state.sats += 50;
  adStatus.innerText = 'Earned +50 Sats from watching ad!';
  updateUI(); savePlayerData();
}

// 8. UI & DATABASE
function updateUI() {
  satsDisplay.innerText = Math.floor(state.sats);
  rateDisplay.innerText = state.rate;
  levelDisplay.innerText = state.level;
  productionDisplay.innerText = state.rate;
  costDisplay.innerText = state.cost;
}

async function loadPlayerData() {
  if (!state.user) return;
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
        offlineDisplay.innerText = 'Welcome back! Earned ' + offlineEarnings + ' sats while offline.';
      }
    }
  } else { await savePlayerData(); }
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
