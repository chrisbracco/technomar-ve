/* TECHNOMAR · panel de ventas por sucursal (front, v1 simulada)
 * El acceso es solo una puerta visual de demo: no protege nada de verdad (todo vive en el navegador). */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const { esc, money } = TM;
const view = { tab: 'resumen', sede: 'todas', estado: 'todos' };
let knownIds = new Set();

function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600); }
const fecha = ts => new Date(ts).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' });
const st = e => `<span class="status ${e}">${TM.ESTADOS[e].icon} ${TM.ESTADOS[e].label}</span>`;

function loginView() {
  $('#app').innerHTML = `<div class="login-box"><img src="assets/logo.svg" alt="">
    <h2 style="text-align:center;font-size:1.4rem;margin-bottom:14px">Panel del equipo</h2><div id="lerr"></div>
    <form id="lf"><div class="field"><label>Correo</label><input name="email" type="email" required></div>
    <div class="field"><label>Clave</label><input name="clave" type="password" required></div>
    <button class="btn btn-blue" style="width:100%">Entrar</button></form>
    <div class="hint">🔑 <b>Demo:</b> ${TM.ADMIN.email} / ${TM.ADMIN.clave}<br>Acceso de prueba (solo front). En fase 2 se reemplaza por login real con backend.</div>
    <p style="text-align:center;margin-top:12px"><a href="index.html" style="color:var(--blue);font-weight:800">← Volver a la tienda</a></p></div>`;
  $('#lf').onsubmit = e => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
    try { TM.adminLogin(f.email, f.clave); render(); } catch (x) { $('#lerr').innerHTML = `<div class="err">${x.message}</div>`; }
  };
}

const scoped = () => TM.orders().filter(o => view.sede === 'todas' || o.sucursalId === view.sede);
const vendidos = os => os.filter(o => o.estado !== 'cancelado');

function render() {
  if (!TM.adminLogged()) return loginView();
  const d = TM.data;
  const pend = TM.orders().filter(o => o.estado === 'nuevo').length;
  $('#app').innerHTML = `
  <div class="adm-top"><div class="wrap"><img src="assets/logo.svg" alt=""><b>Panel Technomar</b><span class="sp"></span>
    <select id="sedeSel" aria-label="Sucursal"><option value="todas">Todas las sedes</option>${d.sucursales.map(s => `<option value="${s.id}" ${view.sede === s.id ? 'selected' : ''}>${esc(s.nombre)}</option>`).join('')}</select>
    <button class="btn btn-sm btn-ghost" id="out" style="color:#fff;background:#143a85;border:0">Salir</button></div></div>
  <div class="wrap" style="padding-top:4px;padding-bottom:40px">
    <div class="adm-tabs">${[['resumen', '📊 Resumen'], ['pedidos', `🧾 Pedidos${pend ? ` (${pend} nuevos)` : ''}`], ['mostrador', '🏪 Venta en sucursal'], ['inventario', '📦 Inventario'], ['clientes', '👥 Clientes']]
      .map(([k, l]) => `<button class="${view.tab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
    <div id="body"></div></div>`;
  $('#sedeSel').onchange = e => { view.sede = e.target.value; render(); };
  $('#out').onclick = () => { TM.adminLogout(); render(); };
  $$('[data-tab]').forEach(b => b.onclick = () => { view.tab = b.dataset.tab; render(); });
  ({ resumen, pedidos, mostrador, inventario, clientes })[view.tab]();
  knownIds = new Set(TM.orders().map(o => o.id));
}

/* ---------- resumen ---------- */
function resumen() {
  const all = scoped(), ok = vendidos(all);
  const total = ok.reduce((t, o) => t + o.total, 0);
  const hoy = new Date().setHours(0, 0, 0, 0);
  const hoyV = ok.filter(o => o.creado >= hoy).reduce((t, o) => t + o.total, 0);
  const activos = all.filter(o => ['confirmado', 'preparando', 'en_camino', 'listo_retiro'].includes(o.estado));
  const porSede = TM.data.sucursales.map(s => ({ s, v: vendidos(TM.orders()).filter(o => o.sucursalId === s.id).reduce((t, o) => t + o.total, 0) }));
  const max = Math.max(1, ...porSede.map(x => x.v));
  const web = ok.filter(o => o.canal === 'web').length, mos = ok.length - web;
  const feed = TM.orders().slice(0, 7).map(o => `<div class="n"><span>${o.estado === 'nuevo' ? '🔔' : TM.ESTADOS[o.estado].icon}</span><span><b>${o.id}</b> · ${esc(o.cliente.nombre)} en ${esc(o.zona)} → <b>${esc(TM.sucursal(o.sucursalId).nombre)}</b><br><small style="color:var(--mute)">${fecha(o.creado)} · ${money(o.total)}</small></span></div>`).join('');
  $('#body').innerHTML = `<div class="kpis">
      <div class="kpi"><small>Ventas (sin cancelados)</small><b>${money(total)}</b></div>
      <div class="kpi"><small>Ventas de hoy</small><b>${money(hoyV)}</b></div>
      <div class="kpi"><small>Tickets</small><b>${ok.length}</b><small>${web} web · ${mos} mostrador</small></div>
      <div class="kpi"><small>En proceso / por entregar</small><b>${activos.length}</b></div></div>
    <div class="two"><div class="panel"><h3>Ventas por sucursal</h3>${porSede.map(x => `<div class="bar"><span>${esc(x.s.nombre)}</span><i style="width:${Math.max(2, x.v / max * 100)}%"></i><span>${money(x.v)}</span></div>`).join('')}</div>
    <div class="panel feed"><h3>🔔 Notificaciones internas</h3>${feed || '<p style="color:var(--mute)">Sin pedidos aún.</p>'}</div></div>
    <button class="btn btn-ghost btn-sm" id="reset">Reiniciar datos de demo</button>`;
  $('#reset').onclick = () => { if (confirm('Se borran pedidos, stock editado y carrito de este navegador (las cuentas de clientes se conservan). ¿Continuar?')) { TM.resetDemo(); location.reload(); } };
}

/* ---------- pedidos ---------- */
function pedidos() {
  let list = scoped(); if (view.estado !== 'todos') list = list.filter(o => o.estado === view.estado);
  $('#body').innerHTML = `<div class="filters"><select id="estSel">${[['todos', 'Todos los estados'], ...Object.entries(TM.ESTADOS).map(([k, v]) => [k, v.label])].map(([k, l]) => `<option value="${k}" ${view.estado === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="ord-grid">${list.map(ordCard).join('') || '<p style="color:var(--mute)">No hay pedidos con ese filtro.</p>'}</div>`;
  $('#estSel').onchange = e => { view.estado = e.target.value; pedidos(); };
}
function ordCard(o) {
  const s = TM.sucursal(o.sucursalId), sig = TM.nextEstados(o);
  const falta = !o.stockAplicado && !['entregado', 'cancelado'].includes(o.estado) && o.items.some(i => (TM.producto(i.pid)?.stock[o.sucursalId] || 0) < i.qty);
  const disp = o.items.map(i => `${esc(i.nombre)}: ${TM.disponibilidad(i.pid).filter(a => a.stock).map(a => `${esc(a.sucursal.nombre.split(' · ')[0])} ${a.stock}`).join(', ') || 'sin stock'}`).join('<br>');
  const wa = o.cliente.telefono ? TM.waLink(`Hola ${o.cliente.nombre}, te escribimos de Technomar por tu pedido ${o.id}.`, '58' + o.cliente.telefono.replace(/\D/g, '').replace(/^0/, '')) : '';
  return `<div class="ord ${o.estado === 'nuevo' ? 'new' : ''}" data-id="${o.id}">
    <div class="ord-h"><b>🧾 ${o.id}</b>${st(o.estado)}</div>
    <div class="meta"><span>${fecha(o.creado)}</span><span>${o.canal === 'web' ? '🌐 Web' : '🏪 Mostrador'}</span><span>${o.entrega === 'delivery' ? '🛵 Delivery' : o.entrega === 'retiro' ? '🏪 Retiro' : '🏪 En sede'}</span><span>💳 ${esc(o.pago)}</span></div>
    <div><b>${esc(o.cliente.nombre)}</b> · ${esc(o.cliente.telefono || 's/t')} · 📍 ${esc(o.zona)}${o.direccion ? ` — ${esc(o.direccion)}` : ''}</div>
    <div class="items">${o.items.map(i => `${i.qty}× ${esc(i.nombre)}`).join('<br>')}<br><b>Total ${money(o.total)}</b>${o.nota ? `<br><i>“${esc(o.nota)}”</i>` : ''}</div>
    ${['nuevo', 'confirmado', 'preparando'].includes(o.estado) ? `<div style="font-size:.78rem;color:var(--mute)"><b>Disponibilidad:</b><br>${disp}</div>` : ''}
    ${falta ? '<div class="warn">⚠️ La sede asignada no tiene stock suficiente. Cambia de sede.</div>' : ''}
    <div class="acts"><label style="font-size:.78rem;font-weight:800">Sede:
      <select data-sede="${o.id}" ${['entregado', 'cancelado'].includes(o.estado) ? 'disabled' : ''}>${TM.data.sucursales.map(x => `<option value="${x.id}" ${x.id === o.sucursalId ? 'selected' : ''}>${esc(x.nombre)}</option>`).join('')}</select></label>
      ${sig.map(e => `<button class="btn btn-blue btn-sm" data-go="${o.id}|${e}">${TM.ESTADOS[e].icon} ${TM.ESTADOS[e].label}</button>`).join('')}
      ${!['entregado', 'cancelado'].includes(o.estado) ? `<button class="btn btn-ghost btn-sm" data-go="${o.id}|cancelado">Cancelar</button>` : ''}
      <button class="btn btn-ghost btn-sm" data-print="${o.id}">🖨️ Ticket</button>
      ${wa ? `<a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="${wa}">💬</a>` : ''}</div></div>`;
}

/* ---------- venta en sucursal ---------- */
function mostrador() {
  const d = TM.data;
  $('#body').innerHTML = `<div class="panel"><h3>🏪 Registrar venta en mostrador</h3>
    <p style="color:var(--mute);font-size:.85rem;margin-bottom:12px">Descuenta el stock de la sede al instante y genera su ticket.</p><div id="merr"></div>
    <form id="mf"><div class="field"><label>Sucursal</label><select name="sede">${d.sucursales.map(s => `<option value="${s.id}" ${view.sede === s.id ? 'selected' : ''}>${esc(s.nombre)}</option>`).join('')}</select></div>
    <div class="field"><label>Producto</label><select name="pid" id="mpid"></select></div>
    <div class="field"><label>Cantidad</label><input name="qty" type="number" min="1" value="1"></div>
    <div class="field"><label>Pago</label><select name="pago">${TM.PAGOS.map(p => `<option>${p}</option>`).join('')}</select></div>
    <div class="field"><label>Cliente (opcional)</label><input name="cliente" placeholder="Nombre"></div>
    <button class="btn btn-green" style="width:100%">Registrar venta</button></form></div>`;
  const fill = () => {
    const sede = $('#mf [name=sede]').value;
    $('#mpid').innerHTML = d.productos.map(p => `<option value="${p.id}" ${!(p.stock[sede]) ? 'disabled' : ''}>${esc(p.nombre)} — ${money(p.precio)} (${p.stock[sede] || 0} en sede)</option>`).join('');
  };
  fill(); $('#mf [name=sede]').onchange = fill;
  $('#mf').onsubmit = e => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); const qty = Math.max(1, parseInt(f.qty) || 1);
    if (qty > (TM.producto(f.pid).stock[f.sede] || 0)) return ($('#merr').innerHTML = '<div class="err">Esa sede no tiene suficientes unidades.</div>');
    const o = TM.createCounterSale({ sucursalId: f.sede, items: [{ pid: f.pid, qty }], pago: f.pago, cliente: { nombre: f.cliente.trim() || 'Cliente mostrador', telefono: '', email: '' } });
    toast(`Venta ${o.id} registrada ✓`); render();
  };
}

/* ---------- inventario ---------- */
function inventario() {
  const d = TM.data, sedes = d.sucursales.filter(s => view.sede === 'todas' || s.id === view.sede);
  $('#body').innerHTML = `<div class="panel"><h3>📦 Stock por sucursal</h3><p style="color:var(--mute);font-size:.82rem;margin-bottom:8px">Edita las cantidades y se guardan al instante en este navegador. Rojo = agotado.</p>
    <div class="scroll-x"><table class="tbl"><thead><tr><th>Producto</th>${sedes.map(s => `<th>${esc(s.nombre.split(' · ')[0].replace('Sede ', ''))}</th>`).join('')}<th>Total</th></tr></thead><tbody>
    ${d.productos.map(p => `<tr><td>${p.emoji} ${esc(p.nombre)}</td>${sedes.map(s => `<td><input type="number" min="0" value="${p.stock[s.id] || 0}" data-stock="${p.id}|${s.id}" class="${p.stock[s.id] ? '' : 'z'}" aria-label="${esc(p.nombre)} en ${esc(s.nombre)}"></td>`).join('')}<td><b>${TM.stockTotal(p)}</b></td></tr>`).join('')}
    </tbody></table></div></div>`;
}

/* ---------- clientes ---------- */
function clientes() {
  const us = TM.users(), os = TM.orders();
  $('#body').innerHTML = `<div class="panel"><h3>👥 Clientes registrados (${us.length})</h3>${us.length ? us.map(u => {
    const mine = os.filter(o => o.userId === u.id && o.estado !== 'cancelado');
    return `<div class="line"><div class="e">👤</div><div class="n">${esc(u.nombre)}<small>${esc(u.email)} · ${esc(u.telefono)} · ${esc(u.zona)}</small></div><div style="text-align:right;font-size:.82rem"><b>${mine.length}</b> pedidos<br>${money(mine.reduce((t, o) => t + o.total, 0))}</div></div>`;
  }).join('') : '<p style="color:var(--mute)">Aún no hay registros. Los clientes que se registren en la tienda aparecen aquí (mismo navegador en esta demo).</p>'}</div>`;
}

/* ---------- ticket imprimible ---------- */
function printTicket(id) {
  const o = TM.orders().find(x => x.id === id), s = TM.sucursal(o.sucursalId);
  $('#printArea').innerHTML = `<h3>TECHNOMAR MARGARITA</h3><p>${esc(s.nombre)}</p><hr><p><b>${o.id}</b> · ${fecha(o.creado)}</p><p>Cliente: ${esc(o.cliente.nombre)}</p><p>${o.entrega === 'delivery' ? 'Delivery: ' + esc(o.zona) + ' ' + esc(o.direccion) : 'Retiro / mostrador'}</p><hr>
    ${o.items.map(i => `<p>${i.qty}× ${esc(i.nombre)} ... ${money(i.precio * i.qty)}</p>`).join('')}<hr><p><b>TOTAL ${money(o.total)}</b></p><p>Pago: ${esc(o.pago)}</p><p>¡Gracias por tu compra! 🌴</p>`;
  window.print();
}

/* ---------- eventos ---------- */
document.addEventListener('click', e => {
  const go = e.target.closest('[data-go]');
  if (go) { const [id, est] = go.dataset.go.split('|'); if (est === 'cancelado' && !confirm('¿Cancelar este pedido?')) return; TM.setEstado(id, est); toast(`${id}: ${TM.ESTADOS[est].label}`); return render(); }
  const pr = e.target.closest('[data-print]'); if (pr) printTicket(pr.dataset.print);
});
document.addEventListener('change', e => {
  const se = e.target.closest('[data-sede]'); if (se) { TM.setSucursal(se.dataset.sede, se.value); toast('Sede actualizada'); return render(); }
  const sk = e.target.closest('[data-stock]'); if (sk) { const [pid, sid] = sk.dataset.stock.split('|'); TM.setStock(pid, sid, sk.value); toast('Stock guardado'); inventario(); }
});
// Pedidos hechos desde la tienda en otra pestaña llegan en vivo
window.addEventListener('storage', ev => {
  if (!TM.adminLogged() || !TM.data) return;
  if (ev.key === TM.K.orders) {
    const nuevos = TM.orders().filter(o => !knownIds.has(o.id));
    if (nuevos.length) toast(`🔔 Nuevo pedido ${nuevos[0].id} de ${nuevos[0].cliente.nombre} (${nuevos[0].zona})`);
  }
  if ([TM.K.orders, TM.K.stock].includes(ev.key)) { if (ev.key === TM.K.stock) location.reload(); else render(); }
});

(async () => {
  try { await TM.load(); } catch (err) { $('#app').innerHTML = `<div class="wrap"><div class="err" style="margin-top:20px">${esc(err.message)}</div></div>`; return; }
  render();
})();
