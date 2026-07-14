/**
 * Citizen Portal logic: auth, SOS, report submission, image analysis (client-side
 * canvas heuristic, sent to backend as a pre-computed score), speech-to-text.
 */
let currentUser = null;
let uploadedImageMeta = null;
let recognizing = false;
let recognition = null;

async function loginUser() {
  const name = document.getElementById('reg-name').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  if (!name || phone.replace(/\D/g, '').length < 8) { showToast('Enter a valid name and phone number.'); return; }
  try {
    currentUser = await api.register(name, phone);
    document.getElementById('login-gate').style.display = 'none';
    document.getElementById('citizen-app').style.display = 'block';
    document.getElementById('user-name-display').textContent = currentUser.name;
    await renderMyReports();
    showToast('Welcome, ' + currentUser.name + '. You can now report emergencies.');
  } catch (err) {
    showToast(err.message);
  }
}

function logoutUser() {
  currentUser = null;
  document.getElementById('login-gate').style.display = 'block';
  document.getElementById('citizen-app').style.display = 'none';
}

function shareLocation() {
  if (!navigator.geolocation) { showToast('Geolocation not supported by this browser.'); return; }
  document.getElementById('report-loc').value = 'Locating…';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude.toFixed(4), lon = pos.coords.longitude.toFixed(4);
      document.getElementById('report-loc').value = `${lat}, ${lon}`;
    },
    () => { document.getElementById('report-loc').value = ''; showToast('Location permission denied. Enter manually or try again.'); }
  );
}

// --- Image "analysis": client-side canvas heuristic (brightness + red-channel dominance).
// The computed score is sent to the backend and stored with the report.
function analyzeImageSeverity(imgEl) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const w = 80, h = 80;
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgEl, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    let totalBrightness = 0, redDom = 0, darkPixels = 0, n = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const brightness = (r + g + b) / 3;
      totalBrightness += brightness;
      if (r > g + 25 && r > b + 25) redDom++;
      if (brightness < 60) darkPixels++;
      n++;
    }
    const avgBrightness = totalBrightness / n;
    const redRatio = redDom / n;
    const darkRatio = darkPixels / n;
    let severity = (255 - avgBrightness) / 255 * 45 + redRatio * 100 * 0.9 + darkRatio * 100 * 0.35;
    severity = Math.max(4, Math.min(96, Math.round(severity)));
    let label = 'Minor';
    if (severity >= 66) label = 'Severe';
    else if (severity >= 34) label = 'Moderate';
    resolve({ severityScore: severity, label });
  });
}

function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (ev) {
    const img = document.getElementById('img-preview');
    img.src = ev.target.result;
    document.getElementById('img-preview-wrap').style.display = 'block';
    document.getElementById('img-analysis').textContent = 'Analyzing image…';
    img.onload = async function () {
      const result = await analyzeImageSeverity(img);
      uploadedImageMeta = result;
      const color = result.label === 'Severe' ? 'var(--high)' : result.label === 'Moderate' ? 'var(--medium)' : 'var(--low)';
      document.getElementById('img-analysis').innerHTML =
        `Estimated damage severity: <b style="color:${color}">${result.label} (${result.severityScore}/100)</b>` +
        `<div class="meter"><div class="meter-fill" style="width:${result.severityScore}%;background:${color}"></div></div>` +
        `<div class="proto-note">Heuristic pixel-based estimate computed in the browser and sent to the backend with the report. A production system would use a trained CNN damage-assessment model server-side.</div>`;
    };
  };
  reader.readAsDataURL(file);
}

async function submitReport(fromSOS) {
  if (!currentUser) { showToast('Please log in first.'); return; }
  const descEl = document.getElementById('report-desc');
  const desc = fromSOS ? '' : descEl.value.trim();
  if (!desc && !fromSOS) { showToast('Please describe the emergency.'); return; }

  const typeSelect = document.getElementById('report-type').value;
  const loc = document.getElementById('report-loc').value || 'Not shared';

  try {
    const { report, classification, advice } = await api.createReport({
      description: desc,
      category: fromSOS ? undefined : typeSelect,
      location: loc,
      reporterName: currentUser.name,
      reporterPhone: currentUser.phone,
      imageSeverityScore: uploadedImageMeta ? uploadedImageMeta.severityScore : null,
      imageSeverityLabel: uploadedImageMeta ? uploadedImageMeta.label : null,
      isSOS: !!fromSOS,
    });

    if (!fromSOS) {
      descEl.value = '';
      document.getElementById('report-type').value = 'auto';
      document.getElementById('img-preview-wrap').style.display = 'none';
      document.getElementById('img-input').value = '';
    }
    uploadedImageMeta = null;

    const color = report.priority === 'High' ? 'var(--high)' : report.priority === 'Medium' ? 'var(--medium)' : 'var(--low)';
    document.getElementById('ai-result').innerHTML = `
      <div class="row" style="margin-bottom:10px;">
        <div><div class="muted">Detected type</div><div style="font-weight:600;font-size:15px;">${report.category}</div></div>
        <div><div class="muted">Priority</div><span class="chip ${report.priority.toLowerCase()}">${report.priority}</span></div>
      </div>
      <div class="proto-note" style="margin-top:0;">Classification confidence: ${Math.round(classification.confidence * 100)}% · Priority score: ${report.priorityScore}/8 (server-side heuristic keyword + image-severity model)</div>
      <div class="divider"></div>
      <div style="font-size:13px;line-height:1.6;">
        <p><b style="color:var(--signal)">Safety:</b> ${advice.safety}</p>
        <p><b style="color:var(--signal)">First aid:</b> ${advice.firstAid}</p>
        <p><b style="color:var(--signal)">Evacuation:</b> ${advice.evacuation}</p>
      </div>
      <div class="divider"></div>
      <p class="muted">Report ${report.id} saved to the database and visible on the Admin Dashboard for rescue-team assignment.</p>
    `;

    await renderMyReports();
    if (typeof renderAdminAll === 'function') renderAdminAll();
    pushTicker(`${report.id} · ${report.category.toUpperCase()} · ${report.priority.toUpperCase()} PRIORITY · ${loc}`);
    showToast('Report ' + report.id + ' submitted — ' + report.priority + ' priority.');
  } catch (err) {
    showToast(err.message);
  }
}

function fireSOS() {
  if (!currentUser) { showToast('Please log in first.'); return; }
  shareLocation();
  setTimeout(() => submitReport(true), 600); // give geolocation a moment to resolve
}

async function renderMyReports() {
  const el = document.getElementById('my-reports');
  if (!currentUser) return;
  try {
    const mine = await api.getMyReports(currentUser.phone);
    if (mine.length === 0) { el.innerHTML = '<p class="muted">No reports yet.</p>'; return; }
    el.innerHTML = mine.map(r => `
      <div class="report-item">
        <div class="top">
          <span class="type">${r.category}</span>
          <span class="chip ${r.priority.toLowerCase()}">${r.priority}</span>
        </div>
        <div class="meta">${r.id} · ${r.time} · Status: ${r.status}${r.team ? ' (' + r.team + ')' : ''}</div>
      </div>
    `).join('');
  } catch (err) {
    el.innerHTML = `<p class="muted">Could not load reports: ${err.message}</p>`;
  }
}

// --- Speech-to-text (Web Speech API, browser-native — no backend involved) ---
function setupSpeech() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    document.getElementById('mic-status').textContent = 'Voice input not supported in this browser — try Chrome.';
    return;
  }
  recognition = new SR();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-IN';
  recognition.onresult = (e) => {
    let transcript = '';
    for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript;
    document.getElementById('report-desc').value = transcript;
  };
  recognition.onend = () => {
    recognizing = false;
    document.getElementById('mic-btn').classList.remove('listening');
    document.getElementById('mic-status').textContent = '';
  };
  recognition.onerror = () => {
    recognizing = false;
    document.getElementById('mic-btn').classList.remove('listening');
    document.getElementById('mic-status').textContent = 'Voice input error — check microphone permission.';
  };
}
function toggleMic() {
  if (!recognition) { showToast('Voice input not supported in this browser.'); return; }
  if (recognizing) { recognition.stop(); return; }
  recognizing = true;
  document.getElementById('mic-btn').classList.add('listening');
  document.getElementById('mic-status').textContent = 'Listening…';
  recognition.start();
}
