import { firebaseConfig } from './firebase-config.js?v=2';
import { approximatePosition, containsPrivateContact, createFamilyMessage, isPanamaPosition, normalizeDetails, places, types } from './core.js?v=2';
const $ = (id) => document.getElementById(id);
const state = { reports: [], ownReport: null, filter: 'all', gps: null, familyGps: null, auth: null, db: null, api: null, map: null, layer: null, markerById: new Map() };
let lastToast;

function toast(message) {
  const el = $('toast'); el.textContent = message; el.hidden = false;
  clearTimeout(lastToast); lastToast = setTimeout(() => { el.hidden = true; }, 5200);
}
function showError(message) { $('submit-error').textContent = message; $('submit-error').hidden = false; }
function setSync(text) { $('sync-label').textContent = text; }
function configured() {
  return firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith('REEMPLAZAR')
    && firebaseConfig.projectId && !firebaseConfig.projectId.startsWith('REEMPLAZAR');
}
function safeDate(ts) { return ts && typeof ts.toDate === 'function' ? ts.toDate() : new Date(0); }
function dateLabel(ts) {
  const date = safeDate(ts);
  if (!date.getTime()) return 'Fecha pendiente';
  return new Intl.DateTimeFormat('es-PA', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Panama' }).format(date);
}
function ago(date) {
  const delta = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (delta < 2) return 'Ahora';
  if (delta < 60) return `Hace ${delta} min`;
  const hours = Math.floor(delta / 60); return `Hace ${hours} h`;
}
function isRecent(report) { return Date.now() - safeDate(report.createdAt).getTime() < 24 * 60 * 60 * 1000; }

function initMap() {
  if (!window.L) {
    $('map-canvas').textContent = 'No se pudo cargar el mapa. Las señales seguirán disponibles en la lista.';
    $('map-canvas').style.padding = '30px'; return;
  }
  const map = window.L.map('map-canvas', { scrollWheelZoom: false, zoomControl: true }).setView([8.3, -80.6], 7);
  window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    maxZoom: 18,
  }).addTo(map);
  state.map = map;
  state.layer = window.L.layerGroup().addTo(map);
  setTimeout(() => map.invalidateSize(), 200);
}
function makePopup(report) {
  const el = document.createElement('div'); el.className = 'popup-content';
  const h = document.createElement('h3'); h.textContent = types[report.type]?.label ?? 'Necesidad'; el.append(h);
  const area = document.createElement('p'); area.textContent = report.area; el.append(area);
  const details = document.createElement('p'); details.textContent = report.details; el.append(details);
  const note = document.createElement('small');
  note.textContent = `${report.precision === 'gps-approx' ? 'Zona GPS aproximada (~1 km)' : 'Centro aproximado de la localidad'} · Activo · ${dateLabel(report.createdAt)} · No verificado`;
  el.append(note); return el;
}
function displayReport(report) {
  if (!state.map || !Number.isInteger(report.latE2) || !Number.isInteger(report.lngE2)) return;
  const tone = types[report.type]?.tone || 'blue';
  const icon = window.L.divIcon({ className: 'pin-marker', html: `<span class="marker-dot ${tone}"></span>`, iconSize: [26, 26], iconAnchor: [13, 13] });
  const marker = window.L.marker([report.latE2 / 100, report.lngE2 / 100], { icon }).bindPopup(makePopup(report));
  marker.addTo(state.layer); state.markerById.set(report.id, marker);
}
function clearNode(node) { while (node.firstChild) node.removeChild(node.firstChild); }
function render() {
  const latest = state.reports.filter(r => r.status === 'active' && isRecent(r) && types[r.type]);
  const shown = state.filter === 'all' ? latest : latest.filter(r => r.type === state.filter);
  $('count-all').textContent = String(latest.length);
  $('count-medical').textContent = String(latest.filter(r => r.type === 'medica').length);
  $('count-supplies').textContent = String(latest.filter(r => r.type === 'agua' || r.type === 'alimentos').length);
  $('feed-count').textContent = String(shown.length);
  if (state.layer) state.layer.clearLayers(); state.markerById.clear();
  shown.forEach(displayReport);
  const feed = $('report-feed'); clearNode(feed);
  const uid = state.auth?.currentUser?.uid;
  const own = (state.ownReport && state.ownReport.id === uid && state.ownReport.status === 'active') ? state.ownReport : latest.find(r => uid && r.id === uid);
  if (own && state.api) {
    const manage = document.createElement('div'); manage.className = 'report-item';
    const label = document.createElement('strong'); label.textContent = 'Tu señal está publicada'; label.style.fontSize = '12px';
    const btn = document.createElement('button'); btn.textContent = 'Marcar como resuelta'; btn.className = 'gps-button'; btn.style.marginTop = '8px';
    btn.addEventListener('click', resolveOwnReport);
    const share = document.createElement('a');
    share.textContent = 'Compartir mi solicitud por WhatsApp ↗';
    share.href = `https://wa.me/?text=${encodeURIComponent(`Publiqué una necesidad comunitaria en Panamá Conecta (no es un canal oficial de emergencias). ${types[own.type].label} en ${own.area}: ${own.details}. ${window.location.href.split('#')[0]} — Ante peligro inmediato llamar al 911.`)}`;
    share.target = '_blank'; share.rel = 'noopener noreferrer';
    share.style.cssText = 'display:block;margin-top:8px;font-size:11px;color:#137a63;font-weight:800';
    manage.append(label, document.createElement('br'), btn, share); feed.append(manage);
  }
  if (!shown.length) {
    const empty = document.createElement('div'); empty.className = 'empty-feed';
    empty.textContent = configured() ? 'No hay señales activas de esta categoría en las últimas 24 horas.' : 'La publicación comunitaria todavía no está activada. Consultá los recursos oficiales mientras tanto.';
    feed.append(empty);
  }
  shown.forEach(r => {
    const box = document.createElement('article'); box.className = 'report-item'; box.tabIndex = 0; box.setAttribute('role','button');
    box.setAttribute('aria-label', `${types[r.type].label} en ${r.area}. Localizar en el mapa`);
    const top = document.createElement('div'); top.className = 'report-top';
    const tag = document.createElement('span'); tag.className = `report-type ${types[r.type].tone === 'amber' ? 'supplies' : types[r.type].tone === 'blue' ? 'other' : ''}`; tag.textContent = types[r.type].label;
    const when = document.createElement('span'); when.className = 'report-time'; when.textContent = ago(safeDate(r.createdAt)); when.title = dateLabel(r.createdAt); top.append(tag, when);
    const heading = document.createElement('h4'); heading.textContent = `⌖ ${r.area}`;
    const p = document.createElement('p'); p.textContent = r.details;
    const note = document.createElement('small'); note.textContent = `${dateLabel(r.createdAt)} · Estado: activo · ${r.precision === 'gps-approx' ? 'GPS aproximado' : 'Referencia de localidad'} · Sin verificar`;
    box.append(top, heading, p, note);
    if (uid && uid !== r.id) {
      const flag = document.createElement('button'); flag.type = 'button'; flag.className = 'moderation-button'; flag.textContent = 'Reportar contenido para revisión';
      flag.addEventListener('click', async event => { event.stopPropagation(); await flagReport(r, flag); });
      box.append(flag);
    }
    const jump = () => { const marker = state.markerById.get(r.id); if (marker && state.map) { state.map.flyTo(marker.getLatLng(), 12); marker.openPopup(); if (window.innerWidth < 720) $('mapa').scrollIntoView({behavior:'smooth'}); } };
    box.addEventListener('click', jump); box.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); jump(); } });
    feed.append(box);
  });
}
async function flagReport(report, button) {
  if (!state.auth?.currentUser || !state.api || !state.db) return;
  if (!window.confirm('¿Querés enviar este reporte a revisión por posible información falsa, datos privados o contenido inapropiado?')) return;
  button.disabled = true;
  try {
    const uid = state.auth.currentUser.uid;
    const ref = state.api.doc(state.db, 'reportFlags', `${report.id}_${uid}`);
    await state.api.setDoc(ref, { reportId: report.id, reason: 'community-review', createdAt: state.api.serverTimestamp() });
    button.textContent = 'Enviado a revisión';
    toast('Gracias. El reporte quedó señalado para revisión en Firebase Console.');
  } catch (error) {
    button.disabled = false;
    toast(error.code === 'permission-denied' ? 'Este reporte ya fue enviado a revisión desde tu navegador.' : 'No se pudo enviar a revisión. Intentá nuevamente.');
  }
}
async function connectRealtime() {
  if (!configured()) { setSync('Pendiente de activar'); render(); return; }
  try {
    const [appSDK, authSDK, fireSDK] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js'),
    ]);
    const app = appSDK.initializeApp(firebaseConfig);
    state.auth = authSDK.getAuth(app); state.db = fireSDK.getFirestore(app);
    state.api = { ...authSDK, ...fireSDK };
    await authSDK.signInAnonymously(state.auth);
    authSDK.onAuthStateChanged(state.auth, async user => {
      state.ownReport = null;
      if (user) {
        try {
          const ownSnap = await fireSDK.getDoc(fireSDK.doc(state.db, 'reports', user.uid));
          if (ownSnap.exists()) state.ownReport = { id: ownSnap.id, ...ownSnap.data() };
        } catch (error) { console.warn('No se pudo cargar tu señal anterior.'); }
      }
      render();
    });
    const since = fireSDK.Timestamp.fromDate(new Date(Date.now() - 24 * 3600 * 1000));
    const q = fireSDK.query(fireSDK.collection(state.db, 'reports'), fireSDK.where('createdAt','>=',since), fireSDK.orderBy('createdAt','desc'), fireSDK.limit(60));
    fireSDK.onSnapshot(q, snapshot => {
      state.reports = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setSync('Señales actualizadas en vivo'); render();
    }, error => {
      console.error('Firestore:', error.code); setSync('No se pudo conectar');
      toast('No se pueden mostrar señales. Consultá las fuentes oficiales.');
    });
  } catch (error) { console.error('Firebase init:', error); setSync('Sin conexión comunitaria'); render(); }
}
function openDialog() { $('submit-error').hidden = true; $('report-dialog').showModal(); }
function initDialog() {
  $('open-report').addEventListener('click',openDialog);
  $('open-report-secondary').addEventListener('click',openDialog);
  $('close-report').addEventListener('click',() => $('report-dialog').close());
  $('report-dialog').addEventListener('click',e => { if(e.target === $('report-dialog')) $('report-dialog').close(); });
  $('report-details').addEventListener('input',()=> $('chars').textContent = `${$('report-details').value.length}/160`);
  $('request-location').addEventListener('click', () => {
    if (!navigator.geolocation) { $('location-status').textContent = 'Este dispositivo no ofrece GPS. Se usará la localidad.'; return; }
    $('location-status').textContent = 'Solicitando permiso de ubicación…';
    navigator.geolocation.getCurrentPosition(pos => {
      // Redondeo ANTES de guardar para no almacenar coordenadas exactas.
      state.gps = approximatePosition(pos.coords.latitude, pos.coords.longitude);
      if (!isPanamaPosition(state.gps)) {
        state.gps = null; $('location-status').textContent = 'Ubicación fuera de Panamá. Se usará la localidad.'; return;
      }
      $('location-status').textContent = 'GPS aproximado disponible (redondeado a ~1 km). No guardamos tu posición exacta.';
    }, () => { state.gps = null; $('location-status').textContent = 'Sin permiso GPS. Se usará el centro de la localidad.'; }, { enableHighAccuracy: false, timeout: 9000, maximumAge: 45000 });
  });
  $('report-form').addEventListener('submit', submitReport);
}
async function submitReport(event) {
  event.preventDefault(); $('submit-error').hidden = true;
  if (!state.api || !state.db || !state.auth) { showError('Falta conectar Firebase (gratuito). La web todavía no acepta señales: revisá el README.'); return; }
  const type = $('report-type').value, key = $('report-area').value, place = places[key];
  const details = normalizeDetails($('report-details').value);
  if (!place || !types[type] || details.length < 10 || details.length > 160) { showError('Revisá la categoría, localidad y descripción.'); return; }
  if (containsPrivateContact(details)) { showError('Por privacidad, evitá publicar enlaces, teléfonos y correos.'); return; }
  const button = $('submit-report'); button.disabled = true; button.textContent = 'Publicando señal…';
  try {
    let user = state.auth.currentUser;
    if (!user) user = (await state.api.signInAnonymously(state.auth)).user;
    const ref = state.api.doc(state.db, 'reports', user.uid);
    const old = await state.api.getDoc(ref);
    if (old.exists() && old.data().status === 'active') {
      showError('Ya tenés una señal activa en este navegador. Marcala como resuelta antes de crear otra.'); return;
    }
    if (old.exists()) {
      const updated = safeDate(old.data().updatedAt);
      if(Date.now() - updated.getTime() < 10 * 60 * 1000) { showError('Podés crear otra señal 10 minutos después de resolver la anterior.'); return; }
    }
    const loc = state.gps ?? place;
    const data = {
      type, area: place.name, details, latE2: loc.latE2, lngE2: loc.lngE2,
      precision: state.gps ? 'gps-approx' : 'area-center', status: 'active',
      createdAt: state.api.serverTimestamp(), updatedAt: state.api.serverTimestamp(),
    };
    await state.api.setDoc(ref, data);
    state.ownReport = { id: user.uid, type, area: data.area, details, status: 'active' };
    render();
    $('report-dialog').close(); $('report-form').reset(); state.gps = null;
    $('location-status').textContent = 'Sin GPS: se marcará el centro de la localidad elegida.';
    $('chars').textContent = '0/160';
    toast('Tu señal comunitaria fue publicada. No implica que los servicios de emergencia la hayan recibido.');
    $('mapa').scrollIntoView({behavior:'smooth'});
  } catch (error) {
    console.error('Publicación:', error.code);
    showError(error.code === 'permission-denied' ? 'No se pudo publicar: verificá las reglas de seguridad de Firestore.' : 'No se pudo publicar. Revisá la conexión e intentá otra vez.');
  } finally { button.disabled = false; button.textContent = 'Publicar señal comunitaria'; }
}
async function resolveOwnReport() {
  if (!state.auth?.currentUser || !state.api) return;
  if (!window.confirm('¿Querés marcar tu señal como resuelta y quitarla del mapa público?')) return;
  try {
    const ref = state.api.doc(state.db, 'reports', state.auth.currentUser.uid);
    await state.api.updateDoc(ref, { status: 'resolved', updatedAt: state.api.serverTimestamp() });
    if (state.ownReport) state.ownReport.status = 'resolved';
    render();
    toast('La señal quedó marcada como resuelta. Gracias por actualizar.');
  } catch(error) { toast('No pudimos actualizar tu señal. Intentá nuevamente.'); }
}
function initFamily() {
  function makeMessage() {
    return createFamilyMessage($('family-status').value, $('family-area').value, state.familyGps);
  }
  const update = () => { $('message-preview').textContent = makeMessage(); };
  $('family-status').addEventListener('change',update);
  $('family-area').addEventListener('input',update);
  $('family-location').addEventListener('click', () => {
    if (!navigator.geolocation) { $('family-location-status').textContent = 'Este dispositivo no ofrece ubicación.'; return; }
    $('family-location-status').textContent = 'Solicitando permiso explícito…';
    navigator.geolocation.getCurrentPosition(position => {
      const approximate = approximatePosition(position.coords.latitude, position.coords.longitude);
      if (!isPanamaPosition(approximate)) { state.familyGps = null; $('family-location-status').textContent = 'Ubicación fuera de Panamá; no se adjuntará.'; update(); return; }
      state.familyGps = approximate;
      $('family-location-status').textContent = 'Se adjuntará una ubicación aproximada (~1 km) solo al mensaje de WhatsApp; no se guarda aquí.';
      update();
    }, () => { state.familyGps = null; $('family-location-status').textContent = 'No se obtuvo permiso; no se adjuntará ubicación.'; update(); }, { enableHighAccuracy: false, timeout: 9000, maximumAge: 45000 });
  });
  $('family-form').addEventListener('submit',e => {
    e.preventDefault(); window.open(`https://wa.me/?text=${encodeURIComponent(makeMessage())}`, '_blank', 'noopener,noreferrer');
  });
}
function initFilters() {
  document.querySelectorAll('[data-filter]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.filter === state.filter));
    button.addEventListener('click', () => {
      state.filter = button.dataset.filter;
      document.querySelectorAll('[data-filter]').forEach(item => {
        const active = item === button;
        item.classList.toggle('active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      render();
    });
  });
}
function initShare() {
  $('share-site').addEventListener('click',async () => {
    const url = window.location.href.split('#')[0];
    if (navigator.share) {
      try { await navigator.share({title:'Panamá Conecta',text:'Recursos oficiales y señales comunitarias de ayuda en Panamá (no es un servicio de emergencias).',url}); }
      catch(e) { if(e.name !== 'AbortError') toast('No se pudo compartir.'); }
    } else {
      try { await navigator.clipboard.writeText(url); toast('Enlace copiado para compartir.'); }
      catch { window.prompt('Copiá el enlace:',url); }
    }
  });
}
initMap(); initDialog(); initFamily(); initFilters(); initShare(); connectRealtime();
setInterval(() => { if (state.reports.length) render(); }, 60000);
