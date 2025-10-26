// ===== Helpers =====
const $ = id => document.getElementById(id);
const envStatus = $('envStatus'), progress = $('progress');
const latEl = $('lat'), lngEl = $('lng'), accEl = $('acc'), accBadge = $('accBadge');
const spdEl = $('spd'), hdgEl = $('hdg'), tsEl = $('ts');
const roadEl = $('road'), addressEl = $('address');
const getBtn = $('getBtn'), cancelBtn = $('cancelBtn');
const copyBtn = $('copyBtn'), copyAddrBtn = $('copyAddrBtn'), mapsBtn = $('mapsBtn');
const coordsText = $('coordsText');

// --- Bridge to send data back to the opener (form page) ---
function sendFixToOpener(fix, withAddress = false) {
  try {
    if (!window.opener || window.opener.closed) return;
    window.opener.postMessage({
      type: 'gps-fix',
      payload: {
        lat: fix?.lat,
        lng: fix?.lng,
        acc: fix?.acc,
        road: (typeof roadEl !== 'undefined') ? roadEl.textContent : undefined,
        address: withAddress ? (typeof addressEl !== 'undefined' ? addressEl.textContent : undefined) : undefined
      }
    }, window.location.origin);
  } catch (_) { /* ignore cross-window issues */ }
}

const toKmH = mps => (typeof mps === 'number' && !isNaN(mps)) ? (mps * 3.6).toFixed(1) + ' km/h' : '—';
const toDeg = hdg => (typeof hdg === 'number' && !isNaN(hdg)) ? Math.round(hdg) + '°' : '—';
let lastFix = null;
let lastAddress = '—';

// Secure-context check
const isSecure = location.protocol === 'https:' ||
                 location.hostname === 'localhost' ||
                 location.hostname === '127.0.0.1';
envStatus.textContent = isSecure ? 'Secure context ✓' : 'Needs HTTPS (or localhost)';

// ===== Core =====
let watchId = null, best = null, timer = null;

function startPreciseFix() {
  if (!('geolocation' in navigator)) {
    progress.textContent = 'Geolocation not supported';
    return;
  }
  clearCurrent();
  best = null;
  progress.textContent = 'Requesting permission…';
  getBtn.disabled = true; cancelBtn.disabled = false;

  try {
    watchId = navigator.geolocation.watchPosition(onPos, onErr, {
      enableHighAccuracy: true, maximumAge: 0, timeout: 15000
    });
    timer = setTimeout(finish, 12000);
  } catch (e) {
    progress.textContent = 'Error: ' + e.message;
    cancel();
  }
}

function onPos(pos) {
  const c = pos.coords;
  const fix = {
    lat: c.latitude, lng: c.longitude,
    acc: typeof c.accuracy === 'number' ? c.accuracy : Infinity,
    spd: c.speed, hdg: c.heading, ts: pos.timestamp || Date.now()
  };
  if (fix.acc > 200) { progress.textContent = `Poor fix ±${Math.round(fix.acc)} m`; return; }
  if (!best || fix.acc < best.acc) { best = fix; render(fix); sendFixToOpener(best, false); }
  if (fix.acc <= 20) finish();
  else progress.textContent = `Sampling… best ±${Math.round(best.acc)} m`;
}

function onErr(e) {
  const m = {1:'Permission denied',2:'Position unavailable',3:'Timeout'};
  progress.textContent = m[e.code] || ('Error: '+e.message);
}

function finish() {
  clearWatchTimer();
  if (best) {
    render(best);
    progress.textContent = `Done ±${Math.round(best.acc)} m`;
    reverseGeocode(best.lat, best.lng);
  } else progress.textContent = 'No usable fix';
  getBtn.disabled = false; cancelBtn.disabled = true;
}

function cancel() {
  clearWatchTimer();
  progress.textContent = 'Cancelled';
  getBtn.disabled = false; cancelBtn.disabled = true;
}

function clearWatchTimer() {
  if (watchId) { navigator.geolocation.clearWatch(watchId); watchId=null; }
  if (timer) { clearTimeout(timer); timer=null; }
}

// ===== UI =====
function render(fix) {
  latEl.textContent = fix.lat.toFixed(7);
  lngEl.textContent = fix.lng.toFixed(7);
  accEl.textContent = Math.round(fix.acc)+' m';
  spdEl.textContent = toKmH(fix.spd);
  hdgEl.textContent = toDeg(fix.hdg);
  tsEl.textContent = new Date(fix.ts).toLocaleString();

  lastFix = fix;
  const txt = `${fix.lat.toFixed(7)}, ${fix.lng.toFixed(7)} (±${Math.round(fix.acc)} m)`;
  coordsText.value = txt;

  const q = classifyAcc(fix.acc);
  accBadge.textContent = q.label;
  accBadge.classList.remove('ok','warn','bad');
  accBadge.classList.add(q.cls);
}

function clearCurrent() {
  [latEl,lngEl,accEl,spdEl,hdgEl,tsEl].forEach(e=>e.textContent='—');
  accBadge.textContent='—'; accBadge.className='badge';
  coordsText.value=''; roadEl.textContent='—'; addressEl.textContent='—';
  lastFix=null; lastAddress='—';
}

function classifyAcc(m){
  if(m<=20)return{label:'excellent',cls:'ok'};
  if(m<=70)return{label:'fair',cls:'warn'};
  return{label:'poor',cls:'bad'};
}

// Copy coordinates
copyBtn.addEventListener('click', async ()=>{
  if(!coordsText.value)return;
  try{await navigator.clipboard.writeText(coordsText.value);
      progress.textContent='Coordinates copied!';}
  catch{progress.textContent='Copy failed';}
});

// Copy address
copyAddrBtn.addEventListener('click', async ()=>{
  if(!lastAddress||lastAddress==='—'){progress.textContent='No address yet';return;}
  try{await navigator.clipboard.writeText(lastAddress);
      progress.textContent='Address copied!';}
  catch{progress.textContent='Copy failed';}
});

// Buttons
getBtn.addEventListener('click',startPreciseFix);
cancelBtn.addEventListener('click',cancel);

// Permissions hint
(async()=>{
  try{
    if(!navigator.permissions)return;
    const st=await navigator.permissions.query({name:'geolocation'});
    envStatus.textContent=(isSecure?'Secure context ✓, ':'')+'Permission: '+st.state;
    st.onchange=()=>envStatus.textContent=(isSecure?'Secure context ✓, ':'')+'Permission: '+st.state;
  }catch{}
})();

// Open in Maps
mapsBtn.addEventListener('click',()=>{
  if(!lastFix){progress.textContent='Get a location first.';return;}
  const url=`https://www.google.com/maps/search/?api=1&query=${lastFix.lat},${lastFix.lng}`;
  window.open(url,'_blank','noopener');
});

// ===== Reverse-geocoding =====
async function reverseGeocode(lat,lng){
  try{
    progress.textContent='Looking up address…';
    const url=`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const r=await fetch(url,{headers:{'Accept':'application/json','Accept-Language':navigator.language||'en'}});
    if(!r.ok)throw new Error('HTTP '+r.status);
    const d=await r.json();
    const a=d.address||{};
    const road=a.road||a.pedestrian||a.footway||a.neighbourhood||'—';
    const city=a.city||a.town||a.village||a.county||'';
    const state=a.state||'', pc=a.postcode||'', country=a.country||'';
    roadEl.textContent=road;
    const parts=[road,city,state,pc,country].filter(Boolean);
    const full=parts.join(', ');
    addressEl.textContent=full||d.display_name||'—';
    lastAddress=addressEl.textContent;
    progress.textContent='Done ±'+accEl.textContent;
  }catch(e){
    roadEl.textContent='—'; addressEl.textContent='—';
    lastAddress='—'; progress.textContent='Address lookup failed';
  }
}
