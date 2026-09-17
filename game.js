let sats=Number(localStorage.getItem("idleSats")||0);
let level=Number(localStorage.getItem("idleLevel")||1);
let last=Number(localStorage.getItem("idleLast")||Date.now());
let daily=localStorage.getItem("idleDaily")||"";
let lastRewardAd=Number(localStorage.getItem("lastRewardAd")||0);

let rate=level;
let cost=level*50;
let progress=0;
let paused=false;

const satsEl=document.getElementById("sats");
const levelEl=document.getElementById("level");
const rateEl=document.getElementById("rate");
const productionEl=document.getElementById("production");
const costEl=document.getElementById("cost");
const progressEl=document.getElementById("progress");
const offlineEl=document.getElementById("offline");
const upgrade=document.getElementById("upgrade");
const mine=document.getElementById("mine");
const reward=document.getElementById("reward");
const adStatus=document.getElementById("adStatus");
const dailyBtn=document.getElementById("daily");
const reset=document.getElementById("reset");
const adOverlay=document.getElementById("adOverlay");
const closeAd=document.getElementById("closeAd");

const elapsed=Math.min((Date.now()-last)/1000,86400);
const offline=Math.floor(elapsed*rate);

if(offline>0){
sats+=offline;
offlineEl.textContent="+"+offline.toLocaleString()+" sats earned while away";
}else{
offlineEl.textContent="No offline earnings";
}

function save(){
localStorage.setItem("idleSats",Math.floor(sats));
localStorage.setItem("idleLevel",level);
localStorage.setItem("idleLast",Date.now());
localStorage.setItem("lastRewardAd",lastRewardAd);
}

function update(){
rate=level;
cost=level*50;

satsEl.textContent=Math.floor(sats).toLocaleString();
levelEl.textContent=level;
rateEl.textContent=rate.toLocaleString();
productionEl.textContent=rate.toLocaleString();
costEl.textContent=cost.toLocaleString();

upgrade.disabled=sats<cost;
}

mine.onclick=()=>{
if(paused)return;
sats+=10;
update();
save();
};

upgrade.onclick=()=>{
if(paused)return;

if(sats>=cost){
sats-=cost;
level++;
update();
save();
}
};

reward.onclick=()=>{
const now=Date.now();
const cooldown=60000;

if(now-lastRewardAd<cooldown){
const remaining=Math.ceil((cooldown-(now-lastRewardAd))/1000);
adStatus.textContent="Reward ad cooldown: "+remaining+"s";
return;
}

paused=true;
adOverlay.style.display="flex";
adStatus.textContent="";
};

closeAd.onclick=()=>{
adOverlay.style.display="none";

paused=false;

lastRewardAd=Date.now();

adStatus.textContent="Demo ad placement completed.";

save();
};

dailyBtn.onclick=()=>{
const today=new Date().toISOString().slice(0,10);

if(daily!==today){
sats+=100;
daily=today;

localStorage.setItem("idleDaily",daily);

dailyBtn.textContent="BONUS CLAIMED";

update();
save();
}else{
dailyBtn.textContent="COME BACK TOMORROW";
}
};

reset.onclick=()=>{
if(confirm("Reset all game progress?")){
localStorage.clear();
location.reload();
}
};

setInterval(()=>{
if(paused)return;

sats+=rate;
progress+=rate;

if(progress>=100)progress=0;

progressEl.style.width=progress+"%";

update();
save();
},1000);

const today=new Date().toISOString().slice(0,10);

if(daily===today){
dailyBtn.textContent="BONUS CLAIMED";
}

update();
save();
