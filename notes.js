// Anotações de cada pessoa: salvas no navegador e, quando a página roda no Claude, na conta (privadas).
const KEY = 'atlas-notes';
const listeners = new Set();
export const notes = (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } })();
let store = null, saving = Promise.resolve(), timer = 0, editing = null, report = () => {};

export const onNotes = cb => { listeners.add(cb); return () => listeners.delete(cb); };
const emit = () => listeners.forEach(cb => { try { cb(); } catch {} });
export const noteCount = () => Object.values(notes).filter(v => typeof v === 'string' && v.trim()).length;
export const setEditing = id => { editing = id; };

export function setNote(id, text, onStatus) {
  notes[id] = text;
  if (onStatus) report = onStatus;
  emit();
  clearTimeout(timer);
  timer = setTimeout(persist, 700);
}
export function flushNotes() { if (timer) { clearTimeout(timer); persist(); } }

function persist() {
  timer = 0;
  try { localStorage.setItem(KEY, JSON.stringify(notes)); } catch {}
  if (!store) { report('Salvo neste aparelho'); return; }
  const body = { notes: { ...notes }, updated: Date.now() };
  saving = saving.then(() => store.set(body)).then(
    () => report('Salvo'),
    e => report(e?.code === 'quota_exceeded' ? 'Espaço de anotações cheio' : 'Salvo só neste aparelho'));
}

(async () => {
  try {
    if (!window.claude?.use) return;
    const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    const uid = db && user ? await user.id() : null;
    if (!uid) return;
    store = db.doc('data/users/' + uid + '/atlas');
    store.onSnapshot(snap => {
      const remote = (snap.exists && snap.data().notes) || {};
      for (const [k, v] of Object.entries(remote)) if (k !== editing && typeof v === 'string') notes[k] = v;
      emit();
    }, () => { store = null; });
  } catch { store = null; }
})();
