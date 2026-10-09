/* TECHNOMAR · tienda (front, v1) */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const { esc, money } = TM;
const PAGE = 24;
const state = { cat: 'Todos', q: '', sort: 'rel', page: 1, f: { marcas: new Set(), precio: null, alm: new Set(), ram: new Set() } };
const RANGOS = [[0, 150, 'Hasta $150'], [150, 300, '$150 – $300'], [300, 600, '$300 – $600'], [600, 1000, '$600 – $1000'], [1000, Infinity, 'Más de $1000']];
const ALM = ['64GB', '128GB', '256GB', '512GB', '1TB'];
const RAM = ['4GB', '6GB', '8GB', '12GB+'];
const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const icon = (id, cls = 'ico') => `<svg class="${cls}"><use href="#i-${id}"/></svg>`;

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ---------- sheet ---------- */
let lastFocus = null;
function openSheet(html) {
  lastFocus = document.activeElement;
  const s = $('#sheet'); s.innerHTML = html; s.classList.add('open'); $('#scrim').classList.add('open');
  setTimeout(() => s.querySelector('.x')?.focus({ preventScroll: true }), 50);
}
function closeSheet() { $('#sheet').classList.remove('open'); $('#scrim').classList.remove('open'); lastFocus?.focus?.({ preventScroll: true }); }
const sheet = (title, body, foot = '') => `<div class="sheet-h"><span>${title}</span><button class="x" data-close aria-label="Cerrar">✕</button></div>
  <div class="sheet-b">${body}</div>${foot ? `<div class="sheet-f">${foot}</div>` : ''}`;
$('#scrim').addEventListener('click', closeSheet);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

/* ---------- precios ---------- */
const mode = () => TM.priceMode();
const minNivel = plat => TM.config()[plat].reduce((a, b) => (b.inicial < a.inicial ? b : a));
function priceHTML(p, vi = 0, m = mode(), desde = p.variantes.length > 1 && vi === 0) {
  const pre = desde ? 'Desde ' : '';
  if (m === 'cashea' || m === 'krece') {
    const tot = TM.precio(p, vi, m), n = minNivel(m), pl = TM.plan(tot, n);
    return `<div class="pr ${m}"><small>${m === 'cashea' ? 'Cashea' : 'Krece'} · inicial ${n.inicial}%</small><b>${money(Math.round(pl.inicial))}</b><i>${pre}total ${money(tot)}</i></div>`;
  }
  if (m === 'bs') {
    const ref = TM.precio(p, vi, 'bs'), b = TM.enBs(ref);
    return b ? `<div class="pr bs"><small>${pre}Bs a tasa BCV</small><b>${TM.bs(b)}</b><i>Ref. ${money(ref)}</i></div>`
      : `<div class="pr bs"><small>${pre}Bs a tasa BCV (ref.)</small><b>${money(ref)}</b></div>`;
  }
  return `<div class="pr"><small>${pre || 'Precio '}divisas</small><b>${money(TM.precio(p, vi))}</b></div>`;
}

/* ---------- tarjetas ---------- */
function stockTag(p) {
  const t = TM.stockTotal(p);
  if (!t) return '<span class="low out">Agotado</span>';
  return t <= 3 ? `<span class="low">¡Quedan ${t}!</span>` : '';
}
function specLine(p) {
  const s = p.specs;
  return [s.ram && s.almacenamiento ? `${s.ram.split(',')[0]} / ${s.almacenamiento.split(',').pop().trim()}` : s.almacenamiento, s.pantalla].filter(Boolean).join(' · ') || (s.desc || '').slice(0, 60);
}
function card(p) {
  const out = !TM.stockTotal(p);
  return `<article class="card">
    <div class="thumb" data-detail="${p.id}" role="button" tabindex="0" aria-label="Ver ${esc(p.nombre)}">
      ${p.foto ? `<img src="${p.foto}" alt="${esc(p.nombre)}" loading="lazy" width="560" height="560">` : `<span class="noimg">${TM.categoria(p.categoria)?.emoji || '📦'}</span>`}
      ${p.destacado ? `<span class="tag">${esc(p.destacado)}</span>` : ''}${stockTag(p)}</div>
    <div class="c-body"><span class="c-brand">${esc(p.marca)}</span>
      <h3 class="c-name" data-detail="${p.id}">${esc(p.nombre)}</h3><span class="c-spec">${esc(specLine(p))}</span>
      <div class="c-foot">${priceHTML(p)}<button class="add" data-quick="${p.id}" aria-label="Agregar ${esc(p.nombre)}" ${out ? 'disabled' : ''}>${icon('plus', '')}</button></div>
    </div></article>`;
}

/* ---------- catálogo ---------- */
function matches(p) {
  const f = state.f, v = TM.precio(p);
  if (state.cat !== 'Todos' && p.categoria !== state.cat) return false;
  if (state.q) { const hay = norm([p.nombre, p.marca, p.categoria, ...p.variantes.map(x => x.nombre)].join(' ')); if (!norm(state.q).split(/\s+/).every(w => hay.includes(w))) return false; }
  if (f.marcas.size && !f.marcas.has(p.marca)) return false;
  if (f.precio !== null) { const [a, b] = RANGOS[f.precio]; if (v < a || v >= b) return false; }
  const txt = (p.specs.almacenamiento || '') + ' ' + p.variantes.map(x => x.nombre).join(' ');
  if (f.alm.size && ![...f.alm].some(a => (a === '1TB' ? /1\s*TB/i : new RegExp('(^|[^0-9])' + a.replace('GB', '') + '\\s*GB', 'i')).test(txt))) return false;
  if (f.ram.size) { const r = p.specs.ram || ''; if (![...f.ram].some(x => x === '12GB+' ? /1[2-9]GB|16GB/.test(r) : r.includes(x))) return false; }
  return true;
}
function filtered() {
  const list = TM.data.productos.filter(matches);
  const by = { asc: (a, b) => TM.precio(a) - TM.precio(b), desc: (a, b) => TM.precio(b) - TM.precio(a), az: (a, b) => a.nombre.localeCompare(b.nombre), rel: (a, b) => (!!b.destacado - !!a.destacado) };
  return list.sort(by[state.sort]);
}
function renderCatalog() {
  const list = filtered(), shown = list.slice(0, state.page * PAGE);
  $('#grid').innerHTML = shown.length ? shown.map(card).join('') : `<div class="empty">No encontramos eso 😕<br><a class="link" target="_blank" rel="noopener" href="${TM.waLink('Hola Technomar, estoy buscando: ' + state.q)}">Pregúntale a un asesor →</a></div>`;
  $('#resCount').textContent = `${list.length} ${list.length === 1 ? 'modelo encontrado' : 'modelos encontrados'}`;
  $('#btnMore').hidden = shown.length >= list.length;
  $$('#chips .chip').forEach(c => c.classList.toggle('on', c.dataset.cat === state.cat));
  $$('#cats .cat').forEach(c => c.classList.toggle('on', c.dataset.cat === state.cat));
  const n = state.f.marcas.size + state.f.alm.size + state.f.ram.size + (state.f.precio !== null ? 1 : 0);
  const fb = $('#fBadge'); fb.textContent = n || ''; fb.dataset.n = n;
}
function setCat(cat, scroll) {
  state.cat = cat; state.page = 1; state.f.marcas.clear(); renderCatalog();
  if (scroll) $('#catalogo').scrollIntoView({ behavior: 'smooth' });
}
function renderModes() { $$('#modes button').forEach(b => b.classList.toggle('on', b.dataset.mode === mode())); }
function setMode(m) {
  TM.setPriceMode(m); renderModes(); renderCatalog(); renderFeatured(); renderHeroPrices();
  if (m === 'bs' && !TM.config().tasaBCV) toast('Mostrando referencia en $ a tasa BCV (la tasa del día la carga el equipo)');
}
function filtersSheet() {
  const f = state.f;
  const marcas = [...new Set(TM.data.productos.filter(p => state.cat === 'Todos' || p.categoria === state.cat).map(p => p.marca))].sort();
  const pill = (grp, val, on, label = val) => `<button class="pill ${on ? 'on' : ''}" data-f="${grp}" data-v="${esc(val)}">${esc(label)}</button>`;
  openSheet(sheet('Filtros', `
    <p class="lbl">Precio (divisas)</p><div class="pills">${RANGOS.map((r, i) => pill('precio', i, f.precio === i, r[2])).join('')}</div>
    <p class="lbl">Marca</p><div class="pills">${marcas.map(m => pill('marcas', m, f.marcas.has(m))).join('')}</div>
    <p class="lbl">Almacenamiento</p><div class="pills">${ALM.map(a => pill('alm', a, f.alm.has(a))).join('')}</div>
    <p class="lbl">Memoria RAM</p><div class="pills">${RAM.map(a => pill('ram', a, f.ram.has(a))).join('')}</div>`,
  `<div style="display:flex;gap:8px"><button class="btn btn-line" style="flex:1" id="fClear">Limpiar</button><button class="btn btn-azul" style="flex:2" data-close id="fApply">Ver ${filtered().length} modelos</button></div>`));
}

/* ---------- detalle de producto ---------- */
const sel = { pid: null, vi: 0, color: '' };
function detail(pid, keep) {
  const p = TM.producto(pid); if (!p) return;
  if (!keep || sel.pid !== pid) Object.assign(sel, { pid, vi: 0, color: p.colores?.[0] || '' });
  const vi = sel.vi, c = TM.config(), out = !TM.stockTotal(p);
  const usd = TM.precio(p, vi), bsRef = TM.precio(p, vi, 'bs'), cs = TM.precio(p, vi, 'cashea'), kr = TM.precio(p, vi, 'krece');
  const planRows = (plat, tot) => c[plat].map(n => { const pl = TM.plan(tot, n); return `<tr><td>${esc(n.nombre)}</td><td>${n.inicial}%</td><td><b>${money(Math.round(pl.inicial))}</b></td><td>${pl.cuotas}× ${money(Math.round(pl.cuota * 100) / 100)}</td></tr>`; }).join('');
  const specs = p.specs, specHTML = [['Pantalla', specs.pantalla], ['Batería', specs.bateria], ['Cámara', specs.camara], ['RAM', specs.ram], ['Almacenamiento', specs.almacenamiento], ['Condición', specs.sello]]
    .filter(x => x[1]).map(([k, v]) => `<div><small>${k}</small>${esc(v)}</div>`).join('') + (specs.desc ? `<div class="w">${esc(specs.desc)}</div>` : '');
  const av = TM.disponibilidad(pid).map(a => `<div class="av"><span>📍 ${esc(a.sucursal.nombre)}</span><b class="${a.stock ? 'ok' : 'no'}">${a.stock ? a.stock + ' disp.' : 'Sin stock'}</b></div>`).join('');
  const waTxt = `Hola Technomar, me interesa el ${p.nombre}${p.variantes.length > 1 ? ' ' + p.variantes[vi].nombre : ''}${sel.color ? ' color ' + sel.color : ''} (${money(usd)}). ¿Tienen disponible?`;
  openSheet(sheet(esc(p.marca), `
    <div class="d-img">${p.foto ? `<img src="${p.foto}" alt="${esc(p.nombre)}">` : `<span style="font-size:4rem">${TM.categoria(p.categoria)?.emoji || '📦'}</span>`}</div>
    ${p.destacado ? `<span class="eyebrow g">${esc(p.destacado)}</span>` : ''}<h3 class="d-name">${esc(p.nombre)}</h3>
    ${p.variantes.length > 1 ? `<p class="lbl">Versión</p><div class="pills">${p.variantes.map((v, i) => `<button class="pill ${i === vi ? 'on' : ''}" data-vi="${i}">${esc(v.nombre)} · ${money(v.precio)}</button>`).join('')}</div>` : ''}
    ${p.colores?.length ? `<p class="lbl">Color</p><div class="pills">${p.colores.map(col => `<button class="pill ${col === sel.color ? 'on' : ''}" data-color="${esc(col)}">${esc(col)}</button>`).join('')}</div>` : '<p class="lbl">Color</p><p style="font-size:.82rem;color:var(--mute);margin:4px 0 8px">Consulta colores disponibles con tu asesor.</p>'}
    <div class="ptable">
      <div class="usd"><small>Divisas</small><b>${money(usd)}</b><i>Efectivo USD / Zelle</i></div>
      <div><small>Bs a tasa BCV</small><b>${TM.enBs(bsRef) ? TM.bs(TM.enBs(bsRef)) : money(bsRef)}</b><i>${TM.enBs(bsRef) ? 'Ref. ' + money(bsRef) : 'Referencia en $'}</i></div>
      <div class="cs"><small>Cashea</small><b>${money(cs)}</b><i>Inicial desde ${money(Math.round(TM.plan(cs, minNivel('cashea')).inicial))}</i></div>
      <div class="kr"><small>Krece</small><b>${money(kr)}</b><i>Inicial desde ${money(Math.round(TM.plan(kr, minNivel('krece')).inicial))}</i></div>
    </div>
    <details class="plans"><summary>Ver inicial y cuotas por nivel</summary>
      <table><tr><th>Cashea</th><th>Inicial</th><th>Pagas hoy</th><th>Cuotas</th></tr>${planRows('cashea', cs)}</table>
      <table><tr><th>Krece</th><th>Inicial</th><th>Pagas hoy</th><th>Cuotas</th></tr>${planRows('krece', kr)}</table></details>
    ${specHTML ? `<p class="lbl">Especificaciones</p><div class="specs">${specHTML}</div>` : ''}
    <p class="lbl">Disponibilidad por sede</p><div class="avail">${av}</div>`,
  `<div style="display:flex;gap:8px"><button class="btn btn-verde" style="flex:1.4" data-addsel ${out ? 'disabled' : ''}>${icon('cart')} ${out ? 'Agotado' : 'Agregar al carrito'}</button>
   <a class="btn btn-wa" style="flex:1" target="_blank" rel="noopener" href="${TM.waLink(waTxt)}"><svg class="ico" fill="currentColor"><use href="#i-wa"/></svg>WhatsApp</a></div>`));
}

/* ---------- carrito ---------- */
function updateBadges() { const n = TM.cartCount(); ['#cartBadge', '#cartBadge2'].forEach(s => { const b = $(s); b.textContent = n || ''; b.dataset.n = n; }); }
function addLine(pid, vi, color) {
  const p = TM.producto(pid), key = TM.lineKey(pid, vi, color), cur = TM.cart()[key] || 0;
  const enCarrito = TM.cartLines().filter(l => l.p.id === pid).reduce((t, l) => t + l.qty, 0);
  if (enCarrito >= TM.stockTotal(p)) return toast('No hay más unidades disponibles');
  TM.cartSet(key, cur + 1); updateBadges(); toast(`🛒 ${p.nombre} agregado`);
}
function quickAdd(pid) {
  const p = TM.producto(pid);
  if (p.variantes.length > 1 || (p.colores?.length || 0) > 1) return detail(pid);
  addLine(pid, 0, p.colores?.[0] || '');
}
const lineImg = p => p.foto ? `<img src="${p.foto}" alt="">` : (TM.categoria(p.categoria)?.emoji || '📦');
function openCart() {
  const lines = TM.cartLines();
  if (!lines.length) return openSheet(sheet('Tu carrito', '<div class="empty">Aún no agregas nada 🛒<br>Mira los equipos destacados.</div>', '<button class="btn btn-azul btn-block" data-close data-goto="#catalogo">Ir al catálogo</button>'));
  const body = lines.map(l => `<div class="line"><div class="e">${lineImg(l.p)}</div><div class="n">${esc(l.p.nombre)}<small>${l.variante ? esc(l.variante) + ' · ' : ''}${l.color ? esc(l.color) + ' · ' : ''}${money(TM.precio(l.p, l.vi))}</small></div>
    <div class="qty"><button data-dec="${esc(l.key)}" aria-label="Quitar uno">−</button><span>${l.qty}</span><button data-inc="${esc(l.key)}" aria-label="Agregar uno">+</button></div></div>`).join('');
  openSheet(sheet('Tu carrito', body + `<p class="note" style="margin-top:12px">💡 Total en divisas. Con Cashea, Krece o Bs el total se recalcula al elegir el pago.</p>`,
    `<div class="tot"><span>Total divisas</span><span>${money(TM.cartTotal())}</span></div><button class="btn btn-azul btn-block" id="goCheckout">Continuar con el pedido →</button>`));
}

/* ---------- cuenta ---------- */
function authForm(m = 'registro', after) {
  const reg = m === 'registro';
  openSheet(sheet(reg ? 'Crea tu cuenta' : 'Entrar', `
    <div class="tabs"><button class="${reg ? 'on' : ''}" data-mode-auth="registro">Registro</button><button class="${reg ? '' : 'on'}" data-mode-auth="login">Ya tengo cuenta</button></div>
    <div id="authErr"></div>
    <form id="authForm" novalidate>
      ${reg ? `<div class="field"><label for="fN">Nombre y apellido</label><input id="fN" name="nombre" required autocomplete="name"></div>
      <div class="field"><label for="fT">Teléfono / WhatsApp</label><input id="fT" name="telefono" type="tel" required autocomplete="tel" placeholder="0414-0000000"></div>` : ''}
      <div class="field"><label for="fE">Correo</label><input id="fE" name="email" type="email" required autocomplete="email"></div>
      <div class="field"><label for="fC">Clave</label><input id="fC" name="clave" type="password" required minlength="6" autocomplete="${reg ? 'new-password' : 'current-password'}"></div>
      ${reg ? `<div class="field"><label for="fZ">¿En qué zona estás?</label><select id="fZ" name="zona">${TM.data.zonas.map(z => `<option>${esc(z.nombre)}</option>`).join('')}</select></div>` : ''}
      <button class="btn btn-azul btn-block">${reg ? 'Registrarme' : 'Entrar'}</button>
      <p style="font-size:.72rem;color:var(--mute);margin-top:10px;text-align:center">Con tu cuenta ves el estado de tus pedidos y tickets.</p>
    </form>`));
  $('#sheet .tabs').onclick = e => { const v = e.target.dataset.modeAuth; if (v) authForm(v, after); };
  $('#authForm').onsubmit = async e => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
    const err = msg => { $('#authErr').innerHTML = `<div class="err">${esc(msg)}</div>`; };
    try {
      if (reg) {
        if (!f.nombre.trim() || !f.telefono.trim() || !/\S+@\S+\.\S+/.test(f.email)) return err('Completa nombre, teléfono y un correo válido.');
        if (f.clave.length < 6) return err('La clave debe tener al menos 6 caracteres.');
        await TM.register(f);
      } else await TM.login(f.email, f.clave);
      toast('¡Bienvenido a Technomar! 🌴'); (after || openAccount)();
    } catch (x) { err(x.message); }
  };
}
function openAccount() {
  const u = TM.currentUser(); if (!u) return authForm('registro');
  const mine = TM.orders().filter(o => o.userId === u.id);
  openSheet(sheet('Mi cuenta', `<p style="margin-bottom:12px">Hola <b>${esc(u.nombre)}</b> 👋<br><span style="color:var(--mute);font-size:.8rem">${esc(u.email)} · ${esc(u.zona)}</span></p>
    <p class="lbl">Mis pedidos</p>
    ${mine.length ? mine.map(o => `<button class="line" style="width:100%;text-align:left" data-order="${o.id}"><div class="e">🧾</div><div class="n">${o.id}<small>${new Date(o.creado).toLocaleDateString('es-VE')} · ${money(o.total)}</small></div><span class="status ${o.estado}">${TM.ESTADOS[o.estado].icon} ${TM.ESTADOS[o.estado].label}</span></button>`).join('') : '<p style="color:var(--mute);font-size:.86rem">Todavía no tienes pedidos.</p>'}`,
  '<button class="btn btn-line btn-block" id="logout">Cerrar sesión</button>'));
}

/* ---------- checkout ---------- */
function checkout() {
  const u = TM.currentUser();
  if (!u) { toast('Crea tu cuenta para finalizar el pedido'); return authForm('registro', checkout); }
  const lines = TM.cartLines(); if (!lines.length) return openCart();
  openSheet(sheet('Finalizar pedido', `
    <div id="coErr"></div><div class="ticket" id="coSum" style="margin-top:0"></div>
    <form id="coForm" novalidate>
      <div class="seg" id="entSeg"><button type="button" class="on" data-ent="delivery">🛵 Delivery</button><button type="button" data-ent="retiro">🏪 Retiro en sede</button></div>
      <div class="field"><label for="cZ">Tu zona</label><select id="cZ" name="zona">${TM.data.zonas.map(z => `<option ${z.nombre === u.zona ? 'selected' : ''}>${esc(z.nombre)}</option>`).join('')}</select></div>
      <div class="field" id="fDir"><label for="cD">Dirección / punto de referencia</label><textarea id="cD" name="direccion" rows="2" placeholder="Calle, casa o edificio, referencia"></textarea></div>
      <div class="field" id="fSede" hidden><label for="cS">Sede donde retiras</label><select id="cS" name="sede"><option value="auto">La sede con disponibilidad (recomendado)</option>${TM.data.sucursales.map(s => `<option value="${s.id}">${esc(s.nombre)}</option>`).join('')}</select></div>
      <div class="field"><label for="cP">Método de pago</label><select id="cP" name="pago">${TM.PAGOS.map(p => `<option value="${p.id}">${esc(p.label)}</option>`).join('')}</select></div>
      <div class="field"><label for="cN">Nota (opcional)</label><input id="cN" name="nota" placeholder="Horario de entrega, etc."></div>
      <button class="btn btn-azul btn-block">Confirmar pedido ✓</button>
      <p style="font-size:.72rem;color:var(--mute);margin-top:8px;text-align:center">El pago se coordina con tu asesor al confirmar disponibilidad. Delivery con costo según zona.</p>
    </form>`));
  const sum = () => {
    const pg = TM.pago($('#cP').value), tot = TM.cartTotal(pg.modo);
    const extra = pg.modo === 'bs' && TM.enBs(tot) ? `<div class="t-row"><span>En bolívares</span><b>${TM.bs(TM.enBs(tot))}</b></div>`
      : (pg.modo === 'cashea' || pg.modo === 'krece') ? `<div class="t-row"><span>Inicial desde (${minNivel(pg.modo).nombre})</span><b>${money(Math.round(TM.plan(tot, minNivel(pg.modo)).inicial))}</b></div>` : '';
    $('#coSum').innerHTML = lines.map(l => `<div class="t-row"><span>${l.qty}× ${esc(l.p.nombre)}${l.variante ? ' ' + esc(l.variante) : ''}${l.color ? ' · ' + esc(l.color) : ''}</span><b>${money(TM.precio(l.p, l.vi, pg.modo) * l.qty)}</b></div>`).join('')
      + `<div class="t-row" style="border-top:1px dashed #b9cbe8;margin-top:6px;padding-top:8px"><span><b>Total ${esc(pg.modo === 'usd' ? 'divisas' : pg.label.split(' (')[0])}</b></span><b>${money(tot)}</b></div>${extra}`;
  };
  sum(); $('#cP').onchange = sum;
  let ent = 'delivery';
  $('#entSeg').onclick = e => {
    const b = e.target.closest('[data-ent]'); if (!b) return; ent = b.dataset.ent;
    $$('#entSeg button').forEach(x => x.classList.toggle('on', x === b));
    $('#fDir').hidden = ent !== 'delivery'; $('#fSede').hidden = ent !== 'retiro';
  };
  $('#coForm').onsubmit = e => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
    if (ent === 'delivery' && !f.direccion.trim()) return ($('#coErr').innerHTML = '<div class="err">Indica tu dirección para el delivery.</div>');
    const o = TM.createOrder({ user: u, lines, entrega: ent, zona: f.zona, direccion: f.direccion, pagoId: f.pago, nota: f.nota, sucursalId: ent === 'retiro' && f.sede !== 'auto' ? f.sede : null });
    TM.cartClear(); updateBadges(); ticketView(o.id, true);
  };
}

/* ---------- ticket + notificación interna (simulada) ---------- */
function ticketView(id, nuevo) {
  const o = TM.orders().find(x => x.id === id); if (!o) return;
  const s = TM.sucursal(o.sucursalId);
  const disp = o.items.map(i => `<div class="row"><span>📦</span><span><b>${esc(i.nombre)}</b> → ${TM.disponibilidad(i.pid).filter(a => a.stock).map(a => `${esc(a.sucursal.corto)} (${a.stock})`).join(' · ') || '<i>sin stock</i>'}</span></div>`).join('');
  const hist = (o.historial || []).map(h => `<div class="t-row"><span>${TM.ESTADOS[h.estado].icon} ${TM.ESTADOS[h.estado].label}</span><span>${new Date(h.at).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })}</span></div>`).join('');
  openSheet(sheet(nuevo ? '¡Pedido recibido! 🎉' : `Pedido ${o.id}`, `
    <div class="ticket"><h4><span>🧾 ${o.id}</span><span class="status ${o.estado}">${TM.ESTADOS[o.estado].icon} ${TM.ESTADOS[o.estado].label}</span></h4>
      ${o.items.map(i => `<div class="t-row"><span>${i.qty}× ${esc(i.nombre)}${i.variante && i.variante !== 'Única' ? ' ' + esc(i.variante) : ''}${i.color ? ' · ' + esc(i.color) : ''}</span><b>${money(i.precio * i.qty)}</b></div>`).join('')}
      <div class="t-row"><span>Total</span><b>${money(o.total)}${o.totalBs ? ' · ' + TM.bs(o.totalBs) : ''}</b></div>
      <div class="t-row"><span>Pago</span><span>${esc(o.pago)}</span></div>
      <div class="t-row"><span>${o.entrega === 'delivery' ? 'Delivery a' : 'Retiro en'}</span><span>${o.entrega === 'delivery' ? esc(o.zona) : esc(s.nombre)}</span></div>
      <div style="margin-top:8px;border-top:1px dashed #b9cbe8;padding-top:6px">${hist}</div></div>
    ${nuevo ? `<div class="notif"><div class="nh">🔔 Aviso interno al equipo<small>simulado en esta demo</small></div>
      <div class="row"><span>🧾</span><span>Nuevo pedido <b>${o.id}</b> · ${money(o.total)} · ${esc(o.pago)}</span></div>
      <div class="row"><span>📍</span><span>Cliente <b>${esc(o.cliente.nombre)}</b> en <b>${esc(o.zona)}</b> (${o.entrega})</span></div>
      ${disp}<div class="row"><span>🏪</span><span>Sede asignada: <b>${esc(s.nombre)}</b>${o.stockCompleto ? '' : ' ⚠️ stock incompleto'}</span></div></div>
      <p style="font-size:.76rem;color:var(--mute)">El equipo lo ve también en su panel. Envíalo por WhatsApp para agilizar la confirmación.</p>` : ''}`,
  `<a class="btn btn-wa btn-block" target="_blank" rel="noopener" href="${TM.waLink(TM.orderWaText(o), s.whatsapp)}"><svg class="ico" fill="currentColor"><use href="#i-wa"/></svg>Enviar pedido a ${esc(s.corto)} por WhatsApp</a>`));
}

/* ---------- secciones estáticas ---------- */
function renderFeatured() { $('#featured').innerHTML = TM.data.productos.filter(p => p.destacado).map(card).join(''); }
function renderHeroPrices() {
  const p = TM.producto('iphone-18-pro-max'); if (!p) return;
  const min = Math.min(...p.variantes.map(v => v.precio));
  $('#spotPrice').innerHTML = `${money(min)} <small>desde · también con Cashea y Krece</small>`;
}
function renderStatic() {
  const d = TM.data;
  $('#cats').innerHTML = [{ id: 'Todos', nombre: 'Ver todo', emoji: '🛍️', foto: 'assets/img/site/logo.webp' }, ...d.categorias].map(c => `<button class="cat" data-cat="${esc(c.id)}"><span class="ci">${c.foto ? `<img src="${c.foto}" alt="" loading="lazy">` : ''}<span>${c.emoji}</span></span>${esc(c.nombre)}</button>`).join('');
  $('#chips').innerHTML = [{ id: 'Todos', nombre: 'Todo' }, ...d.categorias].map(c => `<button class="chip" data-cat="${esc(c.id)}">${esc(c.nombre)}</button>`).join('');
  $('#sedeList').innerHTML = d.sucursales.map(s => `<article class="sede reveal"><div class="sf"><img src="${s.foto}" alt="Sede ${esc(s.nombre)}" loading="lazy"></div>
    <div class="sb"><h3>${esc(s.nombre)}</h3><p>${esc(s.direccion)}</p>${s.horario.map(h => `<span class="hr">🕘 ${esc(h)}</span>`).join('')}
    <div class="row"><a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="${TM.waLink(`Hola Technomar ${s.corto}, quisiera información`, s.whatsapp)}"><svg class="ico" fill="currentColor"><use href="#i-wa"/></svg>Escribir</a>
    <a class="btn btn-line btn-sm" target="_blank" rel="noopener" href="${esc(s.maps)}"><img src="assets/img/site/gmaps.webp" alt="">Cómo llegar</a></div></div></article>`).join('');
  $('#footSedes').innerHTML = d.sucursales.map(s => `<li><a target="_blank" rel="noopener" href="${esc(s.maps)}">${esc(s.nombre)}</a></li>`).join('');
  $('#socials').innerHTML = [['wa', TM.waLink('Hola Technomar, quiero más información.'), 'WhatsApp'], ['ig', d.redes.instagram, 'Instagram'], ['fb', d.redes.facebook, 'Facebook'], ['th', d.redes.threads, 'Threads'], ['tt', d.redes.tiktok, 'TikTok']]
    .map(([i, u, l]) => `<a href="${esc(u)}" target="_blank" rel="noopener" aria-label="${l}"><svg><use href="#i-${i}"/></svg></a>`).join('');
  $('#rif').textContent = d.rif;
  const wa = TM.waLink('Hola Technomar, vengo de su página web y me gustaría recibir asesoría.');
  ['#waFloat', '#footWa'].forEach(s => { $(s).href = wa; });
  $('#footTec').href = TM.waLink('Hola 🔧 Quiero información de servicio técnico', d.whatsappTecnico);
  $('#spotWa').href = TM.waLink('Hola Technomar, me interesa comprar el iPhone 18 Pro Max.');
  $('#duoWa').href = TM.waLink('Hola Technomar, quiero apartar o saber más sobre el iPhone Duo.');
  renderFeatured(); renderHeroPrices(); renderFin(); renderCoti();
}

/* ---------- calculadoras Cashea / Krece ---------- */
function renderFin() {
  const opts = TM.data.productos.flatMap(p => p.variantes.map((v, i) => `<option value="${esc(p.nombre + (p.variantes.length > 1 ? ' ' + v.nombre : ''))}" data-k="${p.id}|${i}"></option>`)).join('');
  const block = (plat, logo, title, sub) => `<div class="fcard ${plat} reveal"><div class="fhead"><img src="assets/img/site/${logo}.webp" alt="${title}"><div><h3>${title}</h3><p>${sub}</p></div></div>
    <div class="calc" data-plat="${plat}">
      <div><label>Elige un equipo (opcional)</label><input list="dl-equipos" data-cprod placeholder="Ej: Redmi 15C" autocomplete="off"></div>
      <div><label>Precio del equipo en ${title.split(' ').pop()} ($)</label><input type="number" inputmode="decimal" min="0" data-cmonto placeholder="0"></div>
      <div><label>Tu nivel</label><select data-clvl>${TM.config()[plat].map((n, i) => `<option value="${i}">${esc(n.nombre)} (${n.inicial}% inicial · ${n.cuotas} cuotas)</option>`).join('')}</select></div>
      <div class="cres" data-cres hidden></div></div>
    <a class="btn btn-k btn-block" style="margin-top:12px" target="_blank" rel="noopener" href="${TM.waLink(`Hola, Technomar. Me interesa comprar con ${title.split(' ').pop()}.`)}">Comprar con ${title.split(' ').pop()}</a></div>`;
  $('#fin').innerHTML = `<datalist id="dl-equipos">${opts}</datalist>` + block('krece', 'krece', 'Estrena con Krece', 'Desde 5% de inicial y hasta 12 cuotas.') + block('cashea', 'cashea', 'Paga con Cashea', 'Compra ahora y paga en cuotas sin interés.');
}
function calc(box) {
  const plat = box.dataset.plat, m = parseFloat(box.querySelector('[data-cmonto]').value), n = TM.config()[plat][box.querySelector('[data-clvl]').value], r = box.querySelector('[data-cres]');
  if (!(m > 0)) { r.hidden = true; return; }
  const pl = TM.plan(m, n); r.hidden = false;
  r.innerHTML = `<div><small>Pago inicial</small><b>${money(Math.round(pl.inicial * 100) / 100)}</b></div><div><small>Monto a financiar</small><b>${money(Math.round(pl.financiar * 100) / 100)}</b></div>
    <div class="hl"><span><small>${pl.cuotas} cuotas de</small></span><b>${money(Math.round(pl.cuota * 100) / 100)}</b></div>`;
}
document.addEventListener('input', e => {
  const box = e.target.closest('.calc'); if (!box) return;
  if (e.target.matches('[data-cprod]')) {
    const o = [...$('#dl-equipos').options].find(x => x.value === e.target.value);
    if (o) { const [pid, vi] = o.dataset.k.split('|'); box.querySelector('[data-cmonto]').value = TM.precio(TM.producto(pid), +vi, box.dataset.plat); }
  }
  calc(box);
});
document.addEventListener('change', e => { const box = e.target.closest('.calc'); if (box) calc(box); });

/* ---------- cotizador servicio técnico ---------- */
const coti = { disp: '', marca: '', falla: '' };
function renderCoti() {
  const step = (n, t, k, arr) => `<div class="step"><b><i>${n}</i>${t}</b><div class="opts">${arr.map(v => `<button class="opt ${coti[k] === v ? 'on' : ''}" data-coti="${k}" data-v="${v}">${v}</button>`).join('')}</div></div>`;
  $('#coti').innerHTML = `<p style="font-weight:800;margin-bottom:10px">Cotizador paso a paso 🔧</p>
    ${step(1, 'Tu dispositivo', 'disp', ['Celular', 'Tablet', 'Laptop', 'Consola', 'Otro'])}
    ${step(2, 'Marca', 'marca', ['Samsung', 'Redmi', 'Xiaomi', 'Infinix', 'Tecno', 'Honor', 'Oukitel', 'iPhone', 'Otra'])}
    <div class="step"><b><i>3</i>Modelo</b><input id="cotiModelo" placeholder="Ej: Redmi Note 13"></div>
    ${step(4, '¿Qué le pasa?', 'falla', ['Pantalla', 'Batería', 'No enciende', 'Muy lento', 'Se mojó', 'Software', 'Otro'])}
    <div class="step"><b><i>5</i>Cuéntanos más (opcional)</b><textarea id="cotiMas" rows="2"></textarea></div>
    <button class="btn btn-verde btn-block" id="cotiGo"><svg class="ico" fill="currentColor"><use href="#i-wa"/></svg>Enviar a servicio técnico</button>`;
}

/* ---------- slider ---------- */
function initSlider() {
  const el = $('#slides'), n = el.children.length; let i = 0, timer;
  $('#dots').innerHTML = [...Array(n)].map((_, k) => `<button aria-label="Ir a la promoción ${k + 1}"></button>`).join('');
  const dots = $$('#dots button');
  const mark = () => { i = Math.round(el.scrollLeft / el.clientWidth); dots.forEach((d, k) => d.classList.toggle('on', k === i)); };
  const go = k => el.scrollTo({ left: k * (el.clientWidth + 12), behavior: 'smooth' });
  const play = () => { clearInterval(timer); if (!matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(() => go((i + 1) % n), 5500); };
  el.addEventListener('scroll', () => requestAnimationFrame(mark), { passive: true });
  el.addEventListener('pointerdown', () => clearInterval(timer)); el.addEventListener('pointerup', play);
  dots.forEach((d, k) => d.onclick = () => { go(k); play(); });
  mark(); play();
}

/* ---------- eventos ---------- */
document.addEventListener('click', e => {
  const t = e.target;
  if (t.closest('[data-close]')) closeSheet();
  const q = t.closest('[data-quick]'); if (q) return quickAdd(q.dataset.quick);
  const det = t.closest('[data-detail]'); if (det) return detail(det.dataset.detail);
  const vi = t.closest('[data-vi]'); if (vi) { sel.vi = +vi.dataset.vi; return detail(sel.pid, true); }
  const col = t.closest('[data-color]'); if (col) { sel.color = col.dataset.color; return detail(sel.pid, true); }
  if (t.closest('[data-addsel]')) { addLine(sel.pid, sel.vi, sel.color); return closeSheet(); }
  const cat = t.closest('[data-cat]'); if (cat) return setCat(cat.dataset.cat, !!cat.closest('#cats'));
  const md = t.closest('[data-mode]'); if (md) return setMode(md.dataset.mode);
  const mg = t.closest('[data-mode-go]'); if (mg) { setMode(mg.dataset.modeGo); return $('#catalogo').scrollIntoView({ behavior: 'smooth' }); }
  const inc = t.closest('[data-inc]'); if (inc) { const l = TM.cartLines().find(x => x.key === inc.dataset.inc); addLine(l.p.id, l.vi, l.color); return openCart(); }
  const dec = t.closest('[data-dec]'); if (dec) { TM.cartSet(dec.dataset.dec, (TM.cart()[dec.dataset.dec] || 0) - 1); updateBadges(); return openCart(); }
  const ord = t.closest('[data-order]'); if (ord) return ticketView(ord.dataset.order, false);
  const fl = t.closest('[data-f]'); if (fl) {
    const { f: g, v } = fl.dataset;
    if (g === 'precio') state.f.precio = state.f.precio === +v ? null : +v; else state.f[g].has(v) ? state.f[g].delete(v) : state.f[g].add(v);
    state.page = 1; renderCatalog(); return filtersSheet();
  }
  const cq = t.closest('[data-coti]'); if (cq) { coti[cq.dataset.coti] = cq.dataset.v; const m = $('#cotiModelo').value, x = $('#cotiMas').value; renderCoti(); $('#cotiModelo').value = m; $('#cotiMas').value = x; return; }
  if (t.closest('#cotiGo')) {
    const msg = `Hola 🔧 Quiero cotizar una reparación:\n- Dispositivo: ${coti.disp || 'Sin indicar'}\n- Marca: ${coti.marca || 'Sin indicar'}\n- Modelo: ${$('#cotiModelo').value || 'Sin indicar'}\n- Falla: ${coti.falla || 'Sin indicar'}${$('#cotiMas').value ? '\n- Detalle: ' + $('#cotiMas').value : ''}`;
    return window.open(TM.waLink(msg, TM.data.whatsappTecnico), '_blank', 'noopener');
  }
  const go = t.closest('[data-goto]'); if (go) setTimeout(() => $(go.dataset.goto).scrollIntoView({ behavior: 'smooth' }), 250);
  if (t.closest('#fClear')) { state.f = { marcas: new Set(), precio: null, alm: new Set(), ram: new Set() }; renderCatalog(); return filtersSheet(); }
  if (t.closest('#btnFiltros')) return filtersSheet();
  if (t.closest('#btnMore')) { state.page++; return renderCatalog(); }
  if (t.closest('#btnCart,#tabCart')) return openCart();
  if (t.closest('#btnAcc,#tabAcc')) return openAccount();
  if (t.closest('#btnSearch')) { $('#catalogo').scrollIntoView({ behavior: 'smooth' }); return setTimeout(() => $('#q').focus(), 500); }
  if (t.closest('#goCheckout')) return checkout();
  if (t.closest('#logout')) { TM.logout(); closeSheet(); toast('Sesión cerrada'); }
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('.thumb[data-detail]')) detail(e.target.dataset.detail); });
let qT;
const onSearch = v => { clearTimeout(qT); qT = setTimeout(() => { state.q = v; state.page = 1; renderCatalog(); }, 120); };
$('#q').addEventListener('input', e => { $('#qTop').value = e.target.value; onSearch(e.target.value); });
$('#qTop').addEventListener('input', e => { $('#q').value = e.target.value; onSearch(e.target.value); });
$('#qTop').addEventListener('keydown', e => { if (e.key === 'Enter') $('#catalogo').scrollIntoView({ behavior: 'smooth' }); });
$('#sort').addEventListener('change', e => { state.sort = e.target.value; renderCatalog(); });
window.addEventListener('storage', updateBadges);

(async function init() {
  try { await TM.load(); } catch (err) {
    $('main').insertAdjacentHTML('afterbegin', `<div class="wrap"><div class="err" style="margin-top:20px">${esc(err.message)}</div></div>`); return;
  }
  renderStatic(); renderModes(); renderCatalog(); updateBadges(); initSlider();
  const io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } }), { threshold: .08 });
  $$('.reveal').forEach(el => io.observe(el));
})();
