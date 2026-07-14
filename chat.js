/** AI Chat Assistant — calls POST /api/chat, which reuses the same server-side AI engine. */

function appendChat(sender, html) {
  const win = document.getElementById('chat-window');
  const div = document.createElement('div');
  div.className = 'msg ' + sender;
  div.innerHTML = html;
  win.appendChild(div);
  win.scrollTop = win.scrollHeight;
}

function botIntro() {
  appendChat('bot', "Hi, I'm the RAKSHA safety assistant. Ask me about <b>fire</b>, <b>flood</b>, <b>earthquake</b>, <b>medical</b>, or <b>accident</b> situations — or tap a quick option below.");
}

async function quickChat(category) {
  appendChat('user', category);
  await respondChat(null, category);
}

async function sendChat() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;
  appendChat('user', text);
  input.value = '';
  await respondChat(text, null);
}

async function respondChat(message, category) {
  try {
    const { category: cat, advice } = await api.chat(message, category);
    appendChat('bot', `<b>${cat} guidance</b><br>
      <b>Safety:</b> ${advice.safety}<br><br>
      <b>First aid:</b> ${advice.firstAid}<br><br>
      <b>Evacuation:</b> ${advice.evacuation}`);
  } catch (err) {
    appendChat('bot', `Sorry, I couldn't reach the server: ${err.message}`);
  }
}
