import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getDatabase, ref, onValue, set, update } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import { firebaseConfig, sharedRoomPath } from "./firebase-config.js";

const $ = (id) => document.getElementById(id);
const DAYS = Array.from({length:10},(_,i)=>i+1);
const TASKS = [
  "Follow UltraClear RENEW label directions",
  "Check today's permitted foods",
  "Prepare or thaw meals safely",
  "Check dairy-free and gluten-free ingredients",
  "Eat adequate meals and snacks",
  "Complete comfortable movement",
  "Plan tomorrow's meals",
  "Wind down for sleep"
];
const PREP = [
  "Choose recipes for tomorrow",
  "Portion and label meals",
  "Freeze extra portions promptly",
  "Move next day's food to the refrigerator"
];
const blankDay = () => ({tasks:[], note:"", meals:{owner:"Both",breakfast:"",lunch:"",dinner:"",snacks:"",allergyChecked:false}, wellness:{water:0,activity:"Walking",minutes:0,supplementNote:""}});
let state = {days:{},prep:{},freezerNote:""};
let remoteReady = false;
let db = null;
let rootRef = null;
let applyingRemote = false;
let saveTimer = null;
let toastTimer = null;

function getDay(day) { if (!state.days[day]) state.days[day] = blankDay(); return state.days[day]; }
function showToast(message) {
  $("toast").textContent = message; $("toast").classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(()=>$("toast").classList.remove("show"),2400);
}
function selectedDay() { return Number($("daySelect").value || 1); }
function saveLocal() { try { localStorage.setItem("clearChangeCompanion", JSON.stringify(state)); } catch(e) {} }
function loadLocal() {
  try { const raw = localStorage.getItem("clearChangeCompanion"); if(raw) state = {...state,...JSON.parse(raw)}; } catch(e) {}
}
function updateSyncBadge(text,kind="") { $("syncBadge").textContent=text; $("syncBadge").className="sync-badge "+kind; }
function renderDaySelect() {
  $("daySelect").innerHTML = DAYS.map(d=>`<option value="${d}">Day ${d}</option>`).join("");
  $("daySelect").value = "1";
}
function renderTasks() {
  const d = selectedDay(), data = getDay(d);
  $("taskList").innerHTML = TASKS.map((t,i)=>`<label class="check-item ${data.tasks.includes(t)?"done":""}"><input type="checkbox" data-task="${i}" ${data.tasks.includes(t)?"checked":""}><span>${t}</span></label>`).join("");
  $("taskList").querySelectorAll("input").forEach(input=>input.addEventListener("change",()=>{
    const item = TASKS[Number(input.dataset.task)], dayData = getDay(selectedDay());
    dayData.tasks = input.checked ? [...new Set([...dayData.tasks,item])] : dayData.tasks.filter(x=>x!==item);
    persist(); renderTasks(); renderProgress();
  }));
  $("dailyNote").value = data.note || "";
  $("todayDayPill").textContent = `Day ${d}`;
  document.querySelectorAll(".inline-day").forEach(el=>el.textContent=d);
}
function renderProgress() {
  const data = getDay(selectedDay()), count = data.tasks.length;
  $("dayProgress").textContent = `${count}/${TASKS.length}`;
  $("progressPercent").textContent = `${Math.round(count/TASKS.length*100)}% complete`;
  $("progressBar").style.width = `${count/TASKS.length*100}%`;
}
function renderMeals() {
  const m = getDay(selectedDay()).meals;
  $("mealOwner").value=m.owner||"Both"; $("breakfast").value=m.breakfast||"";
  $("lunch").value=m.lunch||""; $("dinner").value=m.dinner||""; $("snacks").value=m.snacks||"";
  $("allergyChecked").checked=!!m.allergyChecked;
  $("mealStatus").textContent="";
}
function renderPrep() {
  $("prepList").innerHTML=PREP.map((t,i)=>`<label class="check-item ${state.prep[t]?"done":""}"><input type="checkbox" data-prep="${i}" ${state.prep[t]?"checked":""}><span>${t}</span></label>`).join("");
  $("prepList").querySelectorAll("input").forEach(input=>input.addEventListener("change",()=>{
    const item=PREP[Number(input.dataset.prep)]; state.prep[item]=input.checked; persist(); renderPrep();
  }));
  $("freezerNote").value=state.freezerNote||"";
}
function renderWellness() {
  const w=getDay(selectedDay()).wellness;
  $("waterValue").textContent=w.water||0;
  $("waterDots").innerHTML=Array.from({length:Math.min(w.water||0,12)},()=>"<span></span>").join("");
  $("activityType").value=w.activity||"Walking";
  $("minutes").value=w.minutes||0; $("minutesValue").textContent=w.minutes||0;
  $("supplementNote").value=w.supplementNote||"";
}
function renderAll() { renderTasks();renderProgress();renderMeals();renderPrep();renderWellness(); }
function persist() {
  saveLocal();
  if (remoteReady && rootRef && !applyingRemote) {
    clearTimeout(saveTimer);
    saveTimer=setTimeout(async()=>{
      try { await set(rootRef,state); updateSyncBadge("Synced","online"); $("connectionMessage").textContent="Shared progress is synced between your phones."; }
      catch(e) { updateSyncBadge("Sync issue","error"); $("connectionMessage").textContent="Could not sync right now. Your latest changes remain on this device."; }
    },350);
  }
}
function bindText(id, fn) { $(id).addEventListener("input",fn); }
function saveMealFields() {
  const m=getDay(selectedDay()).meals;
  m.owner=$("mealOwner").value; m.breakfast=$("breakfast").value; m.lunch=$("lunch").value;
  m.dinner=$("dinner").value; m.snacks=$("snacks").value; m.allergyChecked=$("allergyChecked").checked;
  persist(); $("mealStatus").textContent="Meal plan saved."; showToast("Meal plan saved");
}
function setupTabs() {
  document.querySelectorAll(".tab").forEach(btn=>btn.addEventListener("click",()=>{
    document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b===btn));
    ["today","meals","prep","wellness"].forEach(name=>$(`${name}Panel`).classList.toggle("hidden",name!==btn.dataset.tab));
  }));
}
function setupEvents() {
  $("daySelect").addEventListener("change",renderAll);
  $("saveNote").addEventListener("click",()=>{getDay(selectedDay()).note=$("dailyNote").value;persist();showToast("Note saved");});
  $("saveMeals").addEventListener("click",saveMealFields);
  ["mealOwner","breakfast","lunch","dinner","snacks","allergyChecked"].forEach(id=>{
    $(id).addEventListener("change",()=>{const m=getDay(selectedDay()).meals;m.owner=$("mealOwner").value;m.breakfast=$("breakfast").value;m.lunch=$("lunch").value;m.dinner=$("dinner").value;m.snacks=$("snacks").value;m.allergyChecked=$("allergyChecked").checked;persist();});
  });
  $("copyMeals").addEventListener("click",async()=>{
    const m=getDay(selectedDay()).meals;
    const text=`Clear Change — Day ${selectedDay()}\nFor: ${m.owner}\nBreakfast: ${m.breakfast}\nLunch: ${m.lunch}\nDinner: ${m.dinner}\nSnacks: ${m.snacks}\nDairy/gluten label check: ${m.allergyChecked?"checked":"not checked"}`;
    try { await navigator.clipboard.writeText(text);showToast("Meal plan copied"); } catch(e) { showToast("Copy is unavailable in this browser"); }
  });
  $("saveFreezer").addEventListener("click",()=>{state.freezerNote=$("freezerNote").value;persist();showToast("Freezer notes saved");});
  $("waterMinus").addEventListener("click",()=>{const w=getDay(selectedDay()).wellness;w.water=Math.max(0,(w.water||0)-1);persist();renderWellness();});
  $("waterPlus").addEventListener("click",()=>{const w=getDay(selectedDay()).wellness;w.water=Math.min(30,(w.water||0)+1);persist();renderWellness();});
  $("activityType").addEventListener("change",()=>{getDay(selectedDay()).wellness.activity=$("activityType").value;persist();});
  $("minutes").addEventListener("input",()=>{getDay(selectedDay()).wellness.minutes=Number($("minutes").value);$("minutesValue").textContent=$("minutes").value;persist();});
  $("saveWellness").addEventListener("click",()=>{getDay(selectedDay()).wellness.supplementNote=$("supplementNote").value;persist();showToast("Wellness log saved");});
  $("settingsButton").addEventListener("click",()=>$("settingsDialog").showModal());
}
async function configureFirebase() {
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith("PASTE_")) {
    updateSyncBadge("Local");
    $("connectionMessage").textContent="Shared sync is not set up yet. Data is saved only in this browser on this phone.";
    return;
  }
  try {
    const app=initializeApp(firebaseConfig), auth=getAuth(app);
    const email=prompt("To sync with your shared Clear Change room, enter your Firebase account email:");
    if(!email) { updateSyncBadge("Local"); return; }
    const password=prompt("Enter the password for that Firebase account:");
    if(!password) { updateSyncBadge("Local"); return; }
    await signInWithEmailAndPassword(auth,email,password);
    db=getDatabase(app); rootRef=ref(db,sharedRoomPath);
    onValue(rootRef,snap=>{
      const remote=snap.val();
      if(remote && typeof remote==="object") {
        applyingRemote=true; state=remote; saveLocal(); renderAll(); applyingRemote=false;
      } else { persist(); }
      remoteReady=true; updateSyncBadge("Synced","online");
      $("connectionMessage").textContent="Shared progress is synced between your phones.";
    },err=>{updateSyncBadge("Sync issue","error");$("connectionMessage").textContent="Shared sync is unavailable. Local changes are still saved on this device.";});
  } catch(e) {
    updateSyncBadge("Local");
    $("connectionMessage").textContent="Could not connect to shared sync. Check the setup guide and Firebase account, then reload.";
    console.error(e);
  }
}
renderDaySelect(); loadLocal(); setupTabs(); setupEvents(); renderAll();
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("./service-worker.js").catch(()=>{});
configureFirebase();
