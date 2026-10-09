/* TECHNOMAR · tienda (front, v1 simulada) */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const { esc, money } = TM;
const state = { cat: 'todos', q: '' };

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ---------- sheet (drawer/modal) ---------- */
function openSheet(html) { $('#sheet').innerHTML = html; $('#sheet').classList.add('open'); $('#scrim').classList.add('open'); }
function closeSheet() { $('#sheet').classList.remove('open'); $('#scrim').classList.remove('open'); }
const sheet = (title, body, foot = '') => `
  <div class="sheet-h"><span>${title}</span><button class="x" data-close aria-label="Cerrar">✕</button></div>
  <div class="sheet-b">${body}</div>${foot ? `<div class="sheet-f">${foot}</div>` : ''}`;
$('#scrim').addEventListener('click', closeSheet);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
$('#sheet').addEventListener('click', e => { if (e.target.closest('[data-close]')) closeSheet(); });

/* ---------- productos ---------- */
const pct = p => p.precioAntes > p.precio ? Math.round((1 - p.precio / p.precioAntes) * 100) : 0;
function lowTag(p) {
  const t = TM.stockTotal(p);
  if (t === 0) return '<span class="low out">Agotado</span>';
  if (t <= 3) return `<span class="low">¡Quedan ${t}!</span>`;
  return '';
}
function card(p) {
  const d = pct(p);
  const thumb = p.img ? `<img src="${esc(p.img)}" alt="${esc(p.nombre)}" loading="lazy">` : p.emoji;
  const out = TM.stockTotal(p) === 0;
  return `<article class="card" data-cat="${p.categoria}">
    <div class="thumb" data-detail="${p.id}">${thumb}${p.etiqueta ? `<span class="tag">${esc(p.etiqueta)}</span>` : ''}${d ? `<span class="tag off">-${d}%</span>` : ''}${lowTag(p)}</div>
    <div class="c-body">
      <span class="c-cat">${esc(TM.data.categorias.find(c => c.id === p.categoria)?.nombre || '')}</span>
      <h3 class="c-name">${esc(p.nombre)}</h3>
      <div class="price"><b>${money(p.precio)}</b>${d ? `<s>${money(p.precioAntes)}</s>` : ''}</div>
      <div class="c-act">
        <button class="btn btn-blue" data-add="${p.id}" ${out ? 'disabled' : ''}>🛒 Agregar</button>
        <a class="btn btn-wa" target="_blank" rel="noopener" href="${TM.waLink(`Hola Technomar, quiero el ${p.nombre} (${money(p.precio)}), ¿tienen disponible?`)}" aria-label="Pedir por WhatsApp">💬</a>
      </div>
    </div></article>`;
}
function renderCatalog() {
  const q = state.q.trim().toLowerCase();
  const list = TM.data.productos.filter(p => (state.cat === 'todos' || p.categoria === state.cat) && (!q || (p.nombre + ' ' + p.descripcion).toLowerCase().includes(q)));
  $('#grid').innerHTML = list.length ? list.map(card).join('') : '<div class="empty">No encontramos eso 😕<br>Pídelo por WhatsApp y lo conseguimos.</div>';
  $$('.chip').forEach(c => c.classList.toggle('on', c.dataset.cat === state.cat));
}
function setCat(cat, scroll) {
  state.cat = cat; renderCatalog();
  if (scroll) $('#catalogo').scrollIntoView({ behavior: 'smooth' });
}
function renderStatic() {
  const d = TM.data;
  $('#promoList').innerHTML = d.productos.filter(p => p.destacado || pct(p) >= 15).slice(0, 8).map(card).join('');
  $('#catGrid').innerHTML = d.categorias.map(c => `<button class="cat" data-filter="${c.id}"><span class="e">${c.emoji}</span><span>${c.nombre}<br><small>${d.productos.filter(p => p.categoria === c.id).length} productos</small></span></button>`).join('');
  $('#chips').innerHTML = [{ id: 'todos', nombre: 'Todo', emoji: '✨' }, ...d.categorias].map(c => `<button class="chip" data-cat="${c.id}">${c.emoji} ${c.nombre}</button>`).join('');
  $('#sedeList').innerHTML = d.sucursales.map((s, i) => {
    const pend = /confirmar|…/.test(s.nombre + s.direccion);
    return `<div class="sede reveal"><h3>📍 ${esc(s.nombre)}${pend ? ' <span class="pend">por confirmar</span>' : ''}</h3><p>${esc(s.direccion)}</p>
    <div class="row"><a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="${TM.waLink(`Hola Technomar, quiero información de la sede ${s.nombre}`)}">💬 WhatsApp</a>
    <a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.maps)}">🧭 Cómo llegar</a></div></div>`;
  }).join('');
  $('#payList').innerHTML = TM.PAGOS.map((p, i) => `<div class="pay ${i === 0 ? 'hot' : ''}">${['◐', '💵', '📲', '💵', '💳'][i]} ${p}</div>`).join('');
  const wa = TM.waLink('Hola Technomar 👋, vi su página y quiero información.');
  ['#heroWa', '#finalWa', '#footWa', '#waFloat'].forEach(s => { $(s).href = wa; });
}

/* ---------- carrito ---------- */
function updateBadges() {
  const n = TM.cartCount();
  ['#cartBadge', '#cartBadge2'].forEach(s => { const b = $(s); b.textContent = n || ''; b.dataset.n = n; });
}
function addToCart(pid) {
  const p = TM.producto(pid); const cur = TM.cart()[pid] || 0;
  if (cur >= TM.stockTotal(p)) return toast('No hay más unidades disponibles');
  TM.cartSet(pid, cur + 1); updateBadges(); toast(`🛒 ${p.nombre} agregado`);
}
function openCart() {
  const lines = TM.cartLines();
  if (!lines.length) return openSheet(sheet('Tu carrito 🛒', '<div class="empty" style="grid-column:auto">Aún no agregas nada.<br>Mira las promos 👇</div>', '<button class="btn btn-blue" style="width:100%" data-close data-goto="#promos">Ver promociones</button>'));
  const body = lines.map(({ p, qty }) => `<div class="line"><div class="e">${p.emoji}</div><div class="n">${esc(p.nombre)}<small>${money(p.precio)} c/u</small></div>
    <div class="qty"><button data-dec="${p.id}">−</button><span>${qty}</span><button data-inc="${p.id}">+</button></div></div>`).join('');
  openSheet(sheet('Tu carrito 🛒', body, `<div class="tot"><span>Total</span><span>${money(TM.cartTotal())}</span></div><button class="btn btn-blue" style="width:100%" id="goCheckout">Continuar con el pedido →</button>`));
}

/* ---------- cuenta ---------- */
function authForm(mode = 'registro', after) {
  const zonas = TM.data.zonas.map(z => `<option>${esc(z.nombre)}</option>`).join('');
  const reg = mode === 'registro';
  openSheet(sheet(reg ? 'Crea tu cuenta' : 'Entrar', `
    <div class="tabs"><button class="${reg ? 'on' : ''}" data-mode="registro">Registro</button><button class="${reg ? '' : 'on'}" data-mode="login">Ya tengo cuenta</button></div>
    <div id="authErr"></div>
    <form id="authForm" novalidate>
      ${reg ? `<div class="field"><label>Nombre y apellido</label><input name="nombre" required autocomplete="name"></div>
      <div class="field"><label>Teléfono / WhatsApp</label><input name="telefono" type="tel" required autocomplete="tel" placeholder="0414-0000000"></div>` : ''}
      <div class="field"><label>Correo</label><input name="email" type="email" required autocomplete="email"></div>
      <div class="field"><label>Clave</label><input name="clave" type="password" required minlength="6" autocomplete="${reg ? 'new-password' : 'current-password'}"></div>
      ${reg ? `<div class="field"><label>¿En qué zona estás?</label><select name="zona">${zonas}</select></div>` : ''}
      <button class="btn btn-blue" style="width:100%">${reg ? 'Registrarme' : 'Entrar'}</button>
    </form>`));
  $('#sheet .tabs').onclick = e => { const m = e.target.dataset.mode; if (m) authForm(m, after); };
  $('#authForm').onsubmit = async e => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
    const err = m => { $('#authErr').innerHTML = `<div class="err">${esc(m)}</div>`; };
    try {
      if (reg) {
        if (!f.nombre.trim() || !f.telefono.trim() || !f.email.trim()) return err('Completa todos los campos.');
        if (f.clave.length < 6) return err('La clave debe tener al menos 6 caracteres.');
        await TM.register(f);
      } else await TM.login(f.email, f.clave);
      toast('¡Bienvenido! 🌴'); (after || openAccount)();
    } catch (x) { err(x.message); }
  };
}
function openAccount() {
  const u = TM.currentUser();
  if (!u) return authForm('registro');
  const mine = TM.orders().filter(o => o.userId === u.id);
  const body = `<p style="margin-bottom:12px">Hola <b>${esc(u.nombre)}</b> 👋<br><span style="color:var(--mute);font-size:.85rem">${esc(u.email)} · ${esc(u.zona)}</span></p>
    <h3 style="margin:10px 0">Mis pedidos</h3>
    ${mine.length ? mine.map(o => `<button class="line" style="width:100%;text-align:left" data-order="${o.id}"><div class="e">🧾</div><div class="n">${o.id}<small>${new Date(o.creado).toLocaleDateString('es-VE')} · ${money(o.total)}</small></div><span class="status ${o.estado}">${TM.ESTADOS[o.estado].icon} ${TM.ESTADOS[o.estado].label}</span></button>`).join('') : '<p style="color:var(--mute)">Todavía no tienes pedidos.</p>'}`;
  openSheet(sheet('Mi cuenta', body, '<button class="btn btn-ghost" style="width:100%" id="logout">Cerrar sesión</button>'));
}

/* ---------- checkout ---------- */
function checkout() {
  const u = TM.currentUser();
  if (!u) { toast('Regístrate para finalizar tu pedido'); return authForm('registro', checkout); }
  const lines = TM.cartLines(); if (!lines.length) return openCart();
  const zonas = TM.data.zonas.map(z => `<option ${z.nombre === u.zona ? 'selected' : ''}>${esc(z.nombre)}</option>`).join('');
  const sucs = TM.data.sucursales.map(s => `<option value="${s.id}">${esc(s.nombre)}</option>`).join('');
  const resumen = lines.map(({ p, qty }) => `<div class="t-row"><span>${qty}× ${esc(p.nombre)}</span><b>${money(p.precio * qty)}</b></div>`).join('');
  openSheet(sheet('Finalizar pedido', `
    <div id="coErr"></div>
    <div class="ticket" style="margin-top:0">${resumen}<div class="t-row" style="border-top:1px dashed #b7c6e6;margin-top:6px;padding-top:8px"><span><b>Total</b></span><b>${money(TM.cartTotal())}</b></div></div>
    <form id="coForm" novalidate>
      <div class="seg" id="entSeg"><button type="button" class="on" data-ent="delivery">🛵 Delivery</button><button type="button" data-ent="retiro">🏪 Retiro en sede</button></div>
      <div class="field"><label>Tu zona</label><select name="zona">${zonas}</select></div>
      <div class="field" id="fDir"><label>Dirección / punto de referencia</label><textarea name="direccion" rows="2" placeholder="Calle, casa o edificio, referencia"></textarea></div>
      <div class="field" id="fSede" hidden><label>Sede donde retiras</label><select name="sede"><option value="auto">La sede con disponibilidad (recomendado)</option>${sucs}</select></div>
      <div class="field"><label>Método de pago</label><select name="pago">${TM.PAGOS.map(p => `<option>${p}</option>`).join('')}</select></div>
      <div class="field"><label>Nota (opcional)</label><input name="nota" placeholder="Color, horario, etc."></div>
      <button class="btn btn-blue" style="width:100%">Confirmar pedido ✓</button>
      <p style="font-size:.76rem;color:var(--mute);margin-top:8px;text-align:center">El pago se coordina con el equipo al confirmar.</p>
    </form>`));
  let ent = 'delivery';
  $('#entSeg').onclick = e => {
    const b = e.target.closest('[data-ent]'); if (!b) return; ent = b.dataset.ent;
    $$('#entSeg button').forEach(x => x.classList.toggle('on', x === b));
    $('#fDir').hidden = ent !== 'delivery'; $('#fSede').hidden = ent !== 'retiro';
  };
  $('#coForm').onsubmit = e => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
    if (ent === 'delivery' && !f.direccion.trim()) return ($('#coErr').innerHTML = '<div class="err">Indica tu dirección para el delivery.</div>');
    const items = lines.map(l => ({ pid: l.p.id, qty: l.qty }));
    const o = TM.createOrder({ user: u, items, entrega: ent, zona: f.zona, direccion: f.direccion, pago: f.pago, nota: f.nota });
    if (ent === 'retiro' && f.sede !== 'auto') TM.updateOrder(o.id, x => { x.sucursalId = f.sede; });
    TM.cartClear(); updateBadges(); ticketView(o.id, true);
  };
}

/* ---------- ticket + notificación interna simulada ---------- */
function ticketView(id, nuevo) {
  const o = TM.orders().find(x => x.id === id); if (!o) return;
  const s = TM.sucursal(o.sucursalId);
  const disp = o.items.map(i => {
    const av = TM.disponibilidad(i.pid).filter(a => a.stock > 0).map(a => `${esc(a.sucursal.nombre)} (${a.stock})`).join(' · ') || '<i>sin stock</i>';
    return `<div class="row"><span>📦</span><span><b>${esc(i.nombre)}</b> → ${av}</span></div>`;
  }).join('');
  const hist = (o.historial || []).map(h => `<div class="t-row"><span>${TM.ESTADOS[h.estado].icon} ${TM.ESTADOS[h.estado].label}</span><span>${new Date(h.at).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })}</span></div>`).join('');
  openSheet(sheet(nuevo ? '¡Pedido recibido! 🎉' : `Pedido ${o.id}`, `
    <div class="ticket"><h4><span>🧾 ${o.id}</span><span class="status ${o.estado}">${TM.ESTADOS[o.estado].icon} ${TM.ESTADOS[o.estado].label}</span></h4>
      ${o.items.map(i => `<div class="t-row"><span>${i.qty}× ${esc(i.nombre)}</span><b>${money(i.precio * i.qty)}</b></div>`).join('')}
      <div class="t-row"><span>Total</span><b>${money(o.total)}</b></div>
      <div class="t-row"><span>Pago</span><span>${esc(o.pago)}</span></div>
      <div class="t-row"><span>${o.entrega === 'delivery' ? 'Delivery a' : 'Retiro en'}</span><span>${o.entrega === 'delivery' ? esc(o.zona) : esc(s.nombre)}</span></div>
      <div style="margin-top:8px">${hist}</div></div>
    ${nuevo ? `<div class="notif"><div class="nh">🔔 Notificación interna (simulada)<small>lo que ve el equipo</small></div>
      <div class="row"><span>🧾</span><span>Nuevo pedido <b>${o.id}</b> · ${money(o.total)}</span></div>
      <div class="row"><span>📍</span><span>Cliente: <b>${esc(o.cliente.nombre)}</b> en <b>${esc(o.zona)}</b> (${o.entrega === 'delivery' ? 'delivery' : 'retiro'})</span></div>
      ${disp}
      <div class="row"><span>🏪</span><span>Sede sugerida: <b>${esc(s.nombre)}</b> ${o.stockCompleto ? '' : '⚠️ stock incompleto'}</span></div></div>
      <p style="font-size:.8rem;color:var(--mute)">En esta demo el aviso aparece también en el panel del equipo (<a href="admin.html" style="color:var(--blue);font-weight:800">admin.html</a>).</p>` : ''}`,
    `<a class="btn btn-wa" style="width:100%" target="_blank" rel="noopener" href="${TM.waLink(TM.orderWaText(o))}">💬 Enviar pedido por WhatsApp</a>`));
}

/* ---------- detalle de producto (con barra fija de acción) ---------- */
function detail(pid) {
  const p = TM.producto(pid); const d = pct(p); const out = TM.stockTotal(p) === 0;
  const av = TM.disponibilidad(pid).map(a => `<div class="av"><span>📍 ${esc(a.sucursal.nombre)}</span><b class="${a.stock ? 'ok' : 'no'}">${a.stock ? a.stock + ' disp.' : 'Sin stock'}</b></div>`).join('');
  openSheet(sheet(esc(p.nombre), `<div class="detail-e">${p.img ? `<img src="${esc(p.img)}" alt="">` : p.emoji}</div>
    <div class="price" style="margin-bottom:8px"><b style="font-size:1.6rem">${money(p.precio)}</b>${d ? `<s>${money(p.precioAntes)}</s><span class="tag" style="position:static">-${d}%</span>` : ''}</div>
    <p style="color:var(--mute)">${esc(p.descripcion)}</p>
    <h3 style="margin:14px 0 4px;font-size:.95rem">Disponibilidad por sede</h3><div class="avail">${av}</div>`,
    `<div style="display:flex;gap:8px"><button class="btn btn-blue" style="flex:1" data-add="${p.id}" data-close ${out ? 'disabled' : ''}>🛒 Agregar</button>
    <a class="btn btn-wa" style="flex:1" target="_blank" rel="noopener" href="${TM.waLink(`Hola Technomar, quiero el ${p.nombre} (${money(p.precio)}), ¿tienen disponible?`)}">💬 Pedir por WhatsApp</a></div>`));
}

/* ---------- eventos ---------- */
document.addEventListener('click', e => {
  const t = e.target;
  const add = t.closest('[data-add]'); if (add) return addToCart(add.dataset.add);
  const det = t.closest('[data-detail]'); if (det) return detail(det.dataset.detail);
  const fil = t.closest('[data-filter]'); if (fil) return setCat(fil.dataset.filter, true);
  const chip = t.closest('.chip'); if (chip) return setCat(chip.dataset.cat);
  const inc = t.closest('[data-inc]'); if (inc) { addToCart(inc.dataset.inc); return openCart(); }
  const dec = t.closest('[data-dec]'); if (dec) { TM.cartSet(dec.dataset.dec, (TM.cart()[dec.dataset.dec] || 0) - 1); updateBadges(); return openCart(); }
  const ord = t.closest('[data-order]'); if (ord) return ticketView(ord.dataset.order, false);
  const go = t.closest('[data-goto]'); if (go) setTimeout(() => $(go.dataset.goto).scrollIntoView({ behavior: 'smooth' }), 250);
  if (t.closest('#btnCart,#tabCart')) return openCart();
  if (t.closest('#btnAcc,#tabAcc')) return openAccount();
  if (t.closest('#goCheckout')) return checkout();
  if (t.closest('#logout')) { TM.logout(); closeSheet(); toast('Sesión cerrada'); }
});
$('#q').addEventListener('input', e => { state.q = e.target.value; renderCatalog(); });
window.addEventListener('storage', () => { updateBadges(); });

(async function init() {
  try { await TM.load(); } catch (err) {
    document.querySelector('main').insertAdjacentHTML('afterbegin', `<div class="wrap"><div class="err" style="margin-top:20px">${esc(err.message)}</div></div>`); return;
  }
  renderStatic(); renderCatalog(); updateBadges();
  const io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } }), { threshold: .12 });
  $$('.reveal').forEach(el => io.observe(el));
})();
