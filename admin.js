/** Admin Dashboard — reads/writes go through the backend API (SQLite-backed). */

async function assignTeam(reportId, teamId) {
  try {
    await api.assignTeam(reportId, teamId || null);
    await renderAdminAll();
    if (typeof renderMyReports === 'function') renderMyReports();
  } catch (err) { showToast(err.message); }
}

async function resolveReport(reportId) {
  try {
    await api.resolveReport(reportId);
    await renderAdminAll();
    if (typeof renderMyReports === 'function') renderMyReports();
    showToast(reportId + ' marked resolved.');
  } catch (err) { showToast(err.message); }
}

async function renderAdminTable() {
  const priority = document.getElementById('filter-priority').value;
  const category = document.getElementById('filter-type').value;
  const status = document.getElementById('filter-status').value;
  const teams = await api.getTeams();
  let rows = [];
  try {
    rows = await api.getReports({ priority, category, status });
  } catch (err) {
    document.getElementById('admin-table-body').innerHTML = `<tr><td colspan="7" class="muted" style="padding:16px;">Could not load reports: ${err.message}</td></tr>`;
    return;
  }
  const tbody = document.getElementById('admin-table-body');
  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="muted" style="padding:16px;">No reports match these filters.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td class="mono">${r.id}</td>
      <td>${r.category}</td>
      <td><span class="chip ${r.priority.toLowerCase()}">${r.priority}</span></td>
      <td>${r.reporter || '—'}</td>
      <td class="mono">${r.location}</td>
      <td>
        <select class="assign" onchange="assignTeam('${r.id}', this.value)">
          <option value="">— Assign —</option>
          ${teams.map(t => `<option value="${t.id}" ${r.team === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}
        </select>
      </td>
      <td>
        ${r.status}
        ${r.status !== 'Resolved' ? `<button class="btn btn-sm" style="margin-left:6px;" onclick="resolveReport('${r.id}')">Resolve</button>` : ''}
      </td>
    </tr>
  `).join('');
}

async function renderStats() {
  try {
    const s = await api.getStats();
    document.getElementById('stat-total').textContent = s.total;
    document.getElementById('stat-high').textContent = s.highActive;
    document.getElementById('stat-teams').textContent = s.teamsDeployed;
    document.getElementById('stat-resolved').textContent = s.resolved;
    return s;
  } catch (err) {
    showToast('Could not load stats: ' + err.message);
  }
}

async function renderShelters() {
  try {
    const shelters = await api.getShelters();
    document.getElementById('shelter-list').innerHTML = shelters.map(s => {
      const pct = Math.round((s.occupancy / s.capacity) * 100);
      const color = pct > 85 ? 'var(--high)' : pct > 60 ? 'var(--medium)' : 'var(--signal)';
      return `<div class="shelter-item">
        <div>${s.name}<div class="muted">${s.occupancy}/${s.capacity} occupied</div></div>
        <div class="shelter-bar"><div class="shelter-fill" style="width:${pct}%;background:${color}"></div></div>
      </div>`;
    }).join('');
  } catch (err) { /* ignore in UI */ }
}

async function renderTeams() {
  try {
    const teams = await api.getTeams();
    document.getElementById('team-list').innerHTML = teams.map(t => `
      <div class="shelter-item">
        <div>${t.name}<div class="muted">${t.specialty} specialist</div></div>
        <span class="chip ${t.deployed ? 'medium' : 'low'}">${t.deployed ? 'Deployed' : 'Available'}</span>
      </div>`).join('');
  } catch (err) { /* ignore in UI */ }
}

function renderCharts(stats) {
  if (!stats) return;
  const types = ['Fire', 'Flood', 'Earthquake', 'Medical', 'Accident'];
  const counts = types.map(t => {
    const found = stats.byType.find(x => x.category === t);
    return found ? found.c : 0;
  });
  const max = Math.max(1, ...counts);
  const barW = 80, gap = 20;
  let svg1 = '';
  types.forEach((t, i) => {
    const h = Math.round((counts[i] / max) * 90);
    const x = i * (barW + gap) + 20;
    svg1 += `<rect x="${x}" y="${120 - h}" width="${barW}" height="${h}" fill="#2FB8C6" rx="3"/>
      <text x="${x + barW / 2}" y="135" font-size="10" fill="#7C8798" text-anchor="middle" font-family="IBM Plex Mono">${t}</text>
      <text x="${x + barW / 2}" y="${120 - h - 6}" font-size="11" fill="#E8EDF2" text-anchor="middle" font-family="IBM Plex Mono">${counts[i]}</text>`;
  });
  document.getElementById('chart-type').innerHTML = svg1;

  const prios = ['High', 'Medium', 'Low'];
  const pcolors = { High: '#E8452C', Medium: '#E8A93B', Low: '#3BA55D' };
  const pcounts = prios.map(p => {
    const found = stats.byPriority.find(x => x.priority === p);
    return found ? found.c : 0;
  });
  const pmax = Math.max(1, ...pcounts);
  let svg2 = '';
  prios.forEach((p, i) => {
    const w = Math.round((pcounts[i] / pmax) * 380);
    const y = i * 28 + 8;
    svg2 += `<text x="0" y="${y + 13}" font-size="11" fill="#7C8798" font-family="IBM Plex Mono">${p}</text>
      <rect x="70" y="${y}" width="${w}" height="16" fill="${pcolors[p]}" rx="3"/>
      <text x="${80 + w}" y="${y + 13}" font-size="11" fill="#E8EDF2" font-family="IBM Plex Mono">${pcounts[i]}</text>`;
  });
  document.getElementById('chart-priority').innerHTML = svg2;
}

async function renderAdminAll() {
  const stats = await renderStats();
  await renderAdminTable();
  renderCharts(stats);
}
