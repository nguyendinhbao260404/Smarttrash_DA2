<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Smart Trash — Dashboard (AI + Map)</title>

<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>

<style>
  body{background:linear-gradient(180deg,#eef7f1,#f6fbff);font-family:Inter,Arial;margin:0}
  .header{background:#0f766e;color:#fff;padding:12px 16px;display:flex;justify-content:space-between;align-items:center}
  .header h1{font-size:18px;margin:0}
  .container{padding:16px}
  .card{border-radius:12px;box-shadow:0 10px 30px rgba(2,6,23,0.06);padding:14px;background:#fff}
  #map{height:320px;border-radius:8px}
  .badge-status{font-size:13px;padding:6px 10px;border-radius:999px}
  .small-muted{color:#666;font-size:13px}
  .ai-panel{display:flex;flex-direction:column;gap:8px}
  .ai-badge{font-weight:700;padding:8px;border-radius:8px;background:#f3f4f6}
</style>
</head>
<body>
<div class="header">
  <h1>♻️ Smart Trash — Dashboard</h1>
  <div>
    <span id="wsStatus" class="badge-status" style="background:#fde68a;color:#92400e">WS: disconnected</span>
    <span id="aiStatus" class="badge-status" style="background:#e0f2fe;color:#0369a1;margin-left:8px">AI: idle</span>
  </div>
</div>

<div class="container">
  <div class="row g-3">
    <div class="col-md-4">
      <div class="card">
        <h6 class="small-muted">Current</h6>
        <h2 id="distance" style="font-size:44px">-- cm</h2>
        <div id="statusBadge"></div>
        <hr/>
        <div class="ai-panel">
          <div><strong>AI Label:</strong> <span id="aiLabel">—</span></div>
          <div><strong>Priority:</strong> <span id="aiPriority">—</span></div>
          <div><strong>ETA:</strong> <span id="aiEta">—</span></div>
          <div id="aiDetails" class="small-muted">No analysis yet</div>
        </div>
      </div>
    </div>

    <div class="col-md-8">
      <div class="card mb-3">
        <canvas id="distChart" height="120"></canvas>
      </div>
      <div class="card">
        <div id="map"></div>
      </div>
    </div>
  </div>

  <div style="margin-top:12px" class="card">
    <h6>Raw latest message</h6>
    <pre id="raw" style="white-space:pre-wrap"></pre>
  </div>
</div>

<script>
// ===== CONFIG - REPLACE with your deployed Cloud Function URL =====
const AI_ENDPOINT = "https://REGION-PROJECT.cloudfunctions.net/smartTrashAI"; // <-- REPLACE WITH YOUR CLOUD FUNCTION URL
// =================================================================
const WS_HOST = "gateway.local"; // mDNS name (do not change unless debugging)
const WS_PORT = 81;
let ws;
let lastAiCall = 0;
const AI_THROTTLE_MS = 3000; // call AI at most every 3s

let distChart;
let map, marker;

function initChart(){
  const ctx = document.getElementById('distChart').getContext('2d');
  distChart = new Chart(ctx, {
    type: 'line',
    data: { labels: [], datasets: [{ label: 'Distance (cm)', data: [], borderColor:'#0ea5a4', tension:0.2 }]},
    options: { responsive:true, plugins:{legend:{display:false}} }
  });
}

function initMap(){
  map = L.map('map').setView([16.0544,108.2022],13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
  marker = L.marker([16.0544,108.2022]).addTo(map);
}

function startWS(){
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(proto + '://' + WS_HOST + ':' + WS_PORT + '/');
  ws.onopen = ()=>{ document.getElementById('wsStatus').innerText = 'WS: connected'; document.getElementById('wsStatus').style.background='#bbf7d0'; document.getElementById('wsStatus').style.color='#065f46'; console.log('WS open'); };
  ws.onclose = ()=>{ document.getElementById('wsStatus').innerText = 'WS: disconnected'; document.getElementById('wsStatus').style.background='#fde68a'; document.getElementById('wsStatus').style.color='#92400e'; console.log('WS closed'); setTimeout(startWS,2000); };
  ws.onmessage = (evt)=>{ onSensorData(evt.data); };
}

async function onSensorData(raw){
  document.getElementById('raw').innerText = raw;
  let obj;
  try{ obj = JSON.parse(raw); } catch(e){ console.warn('invalid json'); return; }

  const distance = Number(obj.distance || obj.d || obj.dist || 0);
  const gas = Number(obj.gas || obj.g || 0);
  document.getElementById('distance').innerText = distance + ' cm';

  const statusElem = document.getElementById('statusBadge');
  if (distance < 12 || gas > 700) statusElem.innerHTML = '<span class="badge bg-danger">ALERT</span>';
  else statusElem.innerHTML = '<span class="badge bg-success">OK</span>';

  distChart.data.labels.push('');
  distChart.data.datasets[0].data.push(distance);
  if (distChart.data.datasets[0].data.length>60){ distChart.data.labels.shift(); distChart.data.datasets[0].data.shift(); }
  distChart.update();

  const lat = obj.lat || obj.latitude;
  const lon = obj.lon || obj.longitude || obj.lng;
  if (lat && lon){
    marker.setLatLng([lat, lon]);
    map.panTo([lat, lon]);
  }

  // throttle AI calls
  const now = Date.now();
  if (now - lastAiCall > AI_THROTTLE_MS){
    lastAiCall = now;
    callAI({distance, gas, lat, lon, node: obj.node || 'node1'});
  }
}

async function callAI(payload){
  const aiStatus = document.getElementById('aiStatus');
  aiStatus.innerText = 'AI: analyzing...';
  aiStatus.style.background = '#fce7f3'; aiStatus.style.color = '#7e1b6a';
  try{
    const resp = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    if (!resp.ok){
      const txt = await resp.text();
      throw new Error('AI HTTP ' + resp.status + ' ' + txt);
    }
    const j = await resp.json();
    document.getElementById('aiLabel').innerText = j.ai_label || (j.label || '—');
    document.getElementById('aiPriority').innerText = j.priority || '—';
    document.getElementById('aiEta').innerText = j.eta || '--';
    document.getElementById('aiDetails').innerText = j.details || JSON.stringify(j);
    aiStatus.innerText = 'AI: OK';
    aiStatus.style.background = '#d1fae5'; aiStatus.style.color = '#065f46';
  } catch(err){
    console.error('AI error', err);
    aiStatus.innerText = 'AI: error';
    aiStatus.style.background = '#fee2e2'; aiStatus.style.color = '#991b1b';
    document.getElementById('aiDetails').innerText = 'AI call failed: ' + err.message;
  }
}

window.onload = function(){
  initChart(); initMap(); startWS();
};
</script>
</body>
</html>
