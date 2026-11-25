// Tela inicial, tela de anotações e navegação por #atlas / #notas. Não depende do modelo 3D.
import { CATS, ITEMS } from './data.js';
import { notes, onNotes, noteCount } from './notes.js';

const $ = s => document.querySelector(s);
const CAT = Object.fromEntries(CATS.map(c => [c.id, c]));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function route() {
  const h = location.hash.replace('#', '');
  const view = h === 'atlas' ? 'atlas' : h === 'notas' ? 'notes' : 'home';
  document.body.dataset.view = view;
  if (view === 'atlas') window.dispatchEvent(new Event('atlas:show'));
  if (view === 'notes') renderNotes();
  if (view === 'home') renderCount();
  window.scrollTo(0, 0);
}
addEventListener('hashchange', route);

function renderCount() {
  const n = noteCount();
  $('#homeCount').textContent = n ? `${n} ${n === 1 ? 'estrutura anotada' : 'estruturas anotadas'}` : 'Nenhuma anotação ainda';
}

function renderNotes() {
  const q = $('#nvSearch').value.trim().toLowerCase();
  const rows = ITEMS.filter(it => notes[it.id]?.trim())
    .filter(it => !q || it.name.toLowerCase().includes(q) || notes[it.id].toLowerCase().includes(q));
  const list = $('#nvList');
  if (!noteCount()) {
    list.innerHTML = `<div class="nv-empty"><p class="nv-empty-t">Nenhuma anotação ainda</p>
      <p>Abra o atlas, toque numa estrutura e escreva em “Minhas anotações”, no fim da ficha. Tudo o que você escrever aparece aqui.</p>
      <a class="go go-main" href="#atlas"><span class="go-t">Abrir o atlas</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></a></div>`;
    return;
  }
  if (!rows.length) { list.innerHTML = `<p class="nv-none">Nada encontrado para “${esc(q)}”.</p>`; return; }
  list.innerHTML = CATS.filter(c => c.id !== 'all').map(c => {
    const g = rows.filter(r => r.cat === c.id);
    if (!g.length) return '';
    return `<h2 class="nv-group">${esc(c.name)}</h2>` + g.map(it => `
      <button class="nv-item" data-id="${esc(it.id)}" style="--accent:${CAT[it.cat].accent}">
        <span class="nv-name"><span class="dot" aria-hidden="true"></span>${esc(it.name)}</span>
        <span class="nv-text">${esc(notes[it.id].trim())}</span>
        <span class="nv-open">Abrir no atlas</span>
      </button>`).join('');
  }).join('');
}
$('#nvSearch').addEventListener('input', renderNotes);
$('#nvList').addEventListener('click', e => {
  const b = e.target.closest('.nv-item');
  if (!b) return;
  if (window.__atlasReady) window.dispatchEvent(new CustomEvent('atlas:open', { detail: b.dataset.id }));
  else window.__atlasPending = b.dataset.id;
  location.hash = 'atlas';
});
onNotes(() => { renderCount(); if (document.body.dataset.view === 'notes') renderNotes(); });

function showHero(url) {
  const img = $('#heroImg');
  img.src = url;
  img.hidden = false;
  $('#heroWait').hidden = true;
}
if (window.__atlasHero) showHero(window.__atlasHero);
addEventListener('atlas:hero', e => showHero(e.detail));

route();
