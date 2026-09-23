const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a, n) => shuffle(a).slice(0, n);
const LS = 'judo_videos_v1';
const T = v => ({ type: 'text', value: v }), V = v => ({ type: 'video', value: v });

let DATA, BASE = {}, META = {}, TECH = [], cards = [], idx = 0, score = 0;

const ytId = u => { const m = (u || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/); return m ? m[1] : null; };
function media(x) {
  if (x.type !== 'video') return `<span>${esc(x.value)}</span>`;
  const id = ytId(x.value);
  return id ? `<iframe src="https://www.youtube.com/embed/${id}" allowfullscreen loading="lazy"></iframe>`
            : `<video src="${esc(x.value)}" controls preload="metadata"></video>`;
}
async function getJSON(u) { try { const r = await fetch(u); if (!r.ok) throw 0; return await r.json(); } catch { return null; } }

function buildMeta() {
  let local = {}; try { local = JSON.parse(localStorage.getItem(LS) || '{}'); } catch {}
  META = {}; TECH = [];
  for (const [g, nomi] of Object.entries(DATA.tecniche)) for (const n of nomi) {
    META[n] = { video: '', desc: '', ...(BASE[n] || {}), ...(local[n] || {}) };
    TECH.push({ nome: n, gruppo: g, ...META[n] });
  }
}
const saveLocal = (n, v) => {
  let local = {}; try { local = JSON.parse(localStorage.getItem(LS) || '{}'); } catch {}
  local[n] = v; localStorage.setItem(LS, JSON.stringify(local)); buildMeta();
};

/* ---------- QUIZ ---------- */
function build(q, correct, wrong) {
  return { question: q, options: shuffle([correct, ...wrong].map((x, i) => ({ ...x, id: i }))), answer: 0 };
}
function techCards() {
  const cv = TECH.filter(t => t.video);
  if (cv.length) // video in alto, 4 nomi sotto; mai come distrattore una tecnica con lo stesso video
    return cv.map(t => build(V(t.video), T(t.nome), pick(TECH.filter(x => x.nome !== t.nome && x.video !== t.video), 3).map(x => T(x.nome))));
  const gr = [...Object.keys(DATA.tecniche), ...DATA.gruppi_extra];
  return TECH.map(t => build(T(`A quale gruppo appartiene ${t.nome}?`), T(t.gruppo), pick(gr.filter(g => g !== t.gruppo), 3).map(T)));
}
const textCards = s => DATA.sezioni[s].map(([q, c, w]) => build(T(q), T(c), w.map(T)));

function start() {
  const sez = $('#sezione').value;
  $('#avviso').innerHTML = TECH.some(t => t.video) ? '' :
    `<div class="empty">Nessun video inserito: il quiz "video → nome" parte appena ne aggiungi almeno uno in <a href="#" id="vaiG">Gestione video</a>.</div>`;
  if ($('#vaiG')) $('#vaiG').onclick = e => { e.preventDefault(); go('Gestione'); };
  let c = [];
  if (sez === 'Tutte' || sez === 'Tecniche') c = c.concat(techCards());
  for (const s of Object.keys(DATA.sezioni)) if (sez === 'Tutte' || sez === s) c = c.concat(textCards(s));
  cards = shuffle(c).slice(0, 10); idx = 0; score = 0; show();
}
function show() {
  const st = $('#stage');
  if (!cards.length) { st.innerHTML = '<div class="empty">Nessuna domanda disponibile per questa sezione.</div>'; return; }
  if (idx >= cards.length) { st.innerHTML = `<div class="card"><p class="q">Risultato: ${score} su ${cards.length}</p><button id="again">Ricomincia</button></div>`; $('#again').onclick = start; return; }
  const c = cards[idx];
  st.innerHTML = `<div class="bar"><span>Domanda ${idx + 1} di ${cards.length}</span><span>Punti: ${score}</span></div>
    <div class="card"><div class="q">${media(c.question)}</div>
    <div class="opts">${c.options.map(o => `<button class="opt" data-id="${o.id}">${media(o)}</button>`).join('')}</div></div>
    <button id="next" hidden>Avanti</button>`;
  st.querySelectorAll('.opt').forEach(b => b.onclick = () => {
    const ok = +b.dataset.id === c.answer; if (ok) score++;
    st.querySelectorAll('.opt').forEach(x => { x.disabled = true; if (+x.dataset.id === c.answer) x.classList.add('right'); });
    if (!ok) b.classList.add('wrong');
    $('#next').hidden = false; $('#next').onclick = () => { idx++; show(); };
  });
}

/* ---------- CATALOGO ---------- */
function catalogo() {
  $('#catalogo').innerHTML = TECH.map(x => `<div class="card"><h3>${esc(x.nome)}</h3><div class="tag">${esc(x.gruppo)}</div>
    ${x.video ? media(V(x.video)) : '<div class="empty">Video non ancora inserito</div>'}<p>${esc(x.desc || '')}</p></div>`).join('');
}

/* ---------- STUDIO ---------- */
function studio() {
  const hide = $('#hide').checked;
  $('#listaStudio').innerHTML = DATA.sezioni[$('#sezStudio').value].map(([q, a]) =>
    `<div class="card"><p class="q">${esc(q)}</p><p class="ans ${hide ? 'veil' : ''}"><strong>${esc(a)}</strong></p></div>`).join('');
  document.querySelectorAll('.veil').forEach(p => p.onclick = () => p.classList.remove('veil'));
}

/* ---------- GESTIONE ---------- */
function gestione() {
  $('#listaGestione').innerHTML = TECH.map(x => `<div class="card" data-nome="${esc(x.nome)}">
    <h3>${esc(x.nome)} <span class="tag">${esc(x.gruppo)}</span></h3>
    <input type="url" placeholder="https://www.youtube.com/watch?v=..." value="${esc(x.video)}">
    <textarea rows="2" placeholder="Descrizione (facoltativa)">${esc(x.desc || '')}</textarea>
    <button class="salva">Salva</button> <span class="stato"></span></div>`).join('');
  document.querySelectorAll('#listaGestione .salva').forEach(b => b.onclick = () => {
    const c = b.closest('.card');
    saveLocal(c.dataset.nome, { video: c.querySelector('input').value.trim(), desc: c.querySelector('textarea').value.trim() });
    c.querySelector('.stato').textContent = 'Salvato nel browser';
  });
}
const thumbOk = id => new Promise(res => {
  const im = new Image(); im.onload = () => res(im.naturalWidth > 120); im.onerror = () => res(false);
  im.src = `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
});
async function oembed(id) { // può essere bloccato dal browser (CORS): in tal caso null
  try {
    const c = new AbortController(); setTimeout(() => c.abort(), 6000);
    const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`, { signal: c.signal });
    if (r.status === 401 || r.status === 403) return { embed: false };
    if (!r.ok) return null;
    return { embed: true, title: (await r.json()).title };
  } catch { return null; }
}
async function verifica() {
  $('#esito').textContent = 'Controllo in corso...';
  const perId = {}; TECH.forEach(t => { const i = ytId(t.video); if (i) (perId[i] = perId[i] || []).push(t.nome); });
  const righe = await Promise.all(TECH.map(async t => {
    const id = ytId(t.video); let stato = 'ok', titolo = '', bad = false;
    if (!t.video) { stato = 'nessun link inserito'; bad = true; }
    else if (!id) { stato = /\.(mp4|webm)(\?|$)/i.test(t.video) ? 'file diretto (non verificabile)' : "link non valido (manca l'ID del video)"; bad = !/\.(mp4|webm)/i.test(t.video); }
    else if (!(await thumbOk(id))) { stato = 'video inesistente o privato'; bad = true; }
    else { const o = await oembed(id); if (o && !o.embed) { stato = 'esiste ma non si può incorporare'; bad = true; } else if (o) titolo = o.title; }
    const dup = id && perId[id].length > 1 ? perId[id].filter(n => n !== t.nome) : null;
    return `<div class="card"><strong>${esc(t.nome)}</strong>: ${bad ? `<span class="tag">${esc(stato)}</span>` : `<span class="ok">${esc(stato === 'ok' ? 'trovato' : stato)}</span>`}
      ${titolo ? `<br><em>Titolo su YouTube: ${esc(titolo)}</em>` : ''}${dup ? `<br><span class="tag">Stesso video di: ${esc(dup.join(', '))}</span>` : ''}</div>`;
  }));
  $('#esito').innerHTML = righe.join('');
}
function esporta() {
  const blob = new Blob([JSON.stringify(META, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'videos.json'; a.click(); URL.revokeObjectURL(a.href);
}

/* ---------- NAVIGAZIONE ---------- */
const tabs = { Quiz: 'quiz', Video: 'video', Studio: 'studio', Gestione: 'gestione' };
function go(k) {
  for (const [t, s] of Object.entries(tabs)) { $('#' + s).hidden = t !== k; $('#tab' + t).classList.toggle('on', t === k); }
  if (k === 'Quiz') start(); if (k === 'Video') catalogo(); if (k === 'Studio') studio(); if (k === 'Gestione') gestione();
}

(async function init() {
  DATA = await getJSON('data.json');
  if (!DATA) { $('main').innerHTML = '<div class="empty">Impossibile caricare data.json. Apri il sito da GitHub Pages oppure avvia un server locale (python -m http.server); aprendo index.html con doppio clic il browser blocca il caricamento dei file JSON.</div>'; return; }
  BASE = (await getJSON('videos.json')) || {};
  buildMeta();
  const sez = Object.keys(DATA.sezioni);
  $('#sezione').innerHTML = ['Tutte', 'Tecniche', ...sez].map(s => `<option>${esc(s)}</option>`).join('');
  $('#sezStudio').innerHTML = sez.map(s => `<option>${esc(s)}</option>`).join('');
  for (const t of Object.keys(tabs)) $('#tab' + t).onclick = () => go(t);
  $('#start').onclick = start; $('#sezStudio').onchange = studio; $('#hide').onchange = studio;
  $('#verifica').onclick = verifica; $('#esporta').onclick = esporta;
  $('#azzera').onclick = () => { if (confirm('Cancellare le modifiche salvate nel browser?')) { localStorage.removeItem(LS); buildMeta(); gestione(); } };
  $('#importa').onchange = async e => {
    try {
      const j = JSON.parse(await e.target.files[0].text());
      for (const n of Object.keys(META)) if (j[n]) saveLocal(n, { video: (j[n].video || '').trim(), desc: (j[n].desc || '').trim() });
      gestione(); $('#esito').textContent = 'File importato. Ricorda di esportare per rendere definitive le modifiche.';
    } catch { $('#esito').textContent = 'File non valido.'; }
    e.target.value = '';
  };
  start();
})();
