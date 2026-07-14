/** App bootstrap: tab navigation, ticker, toast, initial data load. */

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('view-' + btn.dataset.view).classList.add('active');
    if (btn.dataset.view === 'admin') renderAdminAll();
  });
});

let tickerItems = ['System ready — awaiting live emergency reports…'];
function pushTicker(msg) {
  tickerItems.unshift(msg);
  if (tickerItems.length > 8) tickerItems.pop();
  document.getElementById('ticker-track').textContent = tickerItems.join('      •      ');
}

let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

async function init() {
  setupSpeech();
  botIntro();
  try {
    await api.getReports({});
    pushTicker('Connected to backend — system ready.');
  } catch (err) {
    pushTicker('⚠ Could not reach backend at ' + API_BASE + ' — start the server (see README).');
    showToast('Backend not reachable. Run "npm start" in /backend, then reload this page.');
  }
  renderShelters();
  renderTeams();
  renderAdminAll();
}
init();
