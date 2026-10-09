/* TECHNOMAR · panel de ventas por sucursal (front, v1)
 * El acceso es una puerta visual de demo: no protege nada de verdad (todo vive en el navegador). */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const { esc, money } = TM;
const view = { tab: 'resumen', sede: 'todas', estado: 'todos', invQ: '', invCat: 'Todos' };
let knownIds = new Set();

function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600); }
const fecha = ts => new Date(ts).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' });
const st = e => `<span class="status ${e}">${TM.ESTADOS[e].icon} ${TM.ESTADOS[e].label}</span>`;
const itemTxt = i => `${i.qty}× ${esc(i.nombre)}${i.variante && i.variante !== 'Única' ? ' ' + esc(i.variante) : ''}${i.color ? ' · ' + esc(i.color) : ''}`;

function loginView() {
  $('#app').innerHTML = `<div class="login-box"><img src="assets/img/site/logo.webp" alt="Technomar">
    <h2 style="text-align:center;font-size:1.35rem;margin-bottom:14px">Panel del equipo</h2><div id="lerr"></div>
    <form id="lf"><div class="field"><label for="le">Correo</label><input id="le" name="email" type="email" required></div>
    <div class="field"><label for="lc">Clave</label><input id="lc" name="clave" type="password" required></div>
    <button class="btn btn-azul btn-block">Entrar</button></form>
    <div class="hint">🔑 <b>Demo:</b> ${TM.ADMIN.email} / ${TM.ADMIN.clave}<br>Acceso de prueba (solo front). En fase 2 se reemplaza por login real con backend.</div>
    <p style="text-align:center;margin-top:12px"><a href="index.html" class="link">← Volver a la tienda</a></p></div>`;
  $('#lf').onsubmit = e => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
    try { TM.adminLogin(f.email, f.clave); render(); } catch (x) { $('#lerr').innerHTML = `<div class="err">${x.message}</div>`; }
  };
}

const scoped = () => TM.orders().filter(o => view.sede === 'todas' || o.sucursalId === view.sede);
const vendidos = os => os.filter(o => o.estado !== 'cancelado');

function render() {
  if (!TM.adminLogged()) return loginView();
  const d = TM.data, pend = TM.orders().filter(o => o.estado === 'nuevo').length;
  $('#app').innerHTML = `
  <div class="adm-top"><div class="wrap"><img src="assets/img/site/logo.webp" alt=""><b>Panel Technomar</b><span class="sp"></span>
    <select id="sedeSel" aria-label="Sucursal"><option value="todas">Todas las sedes</option>${d.sucursales.map(s => `<option value="${s.id}" ${view.sede === s.id ? 'selected' : ''}>${esc(s.corto)}</option>`).join('')}</select>
    <button class="btn btn-sm" id="out" style="color:#fff;background:rgba(255,255,255,.14)">Salir</button></div></div>
  <div class="wrap" style="padding-bottom:40px">
    <div class="adm-tabs">${[['resumen', '📊 Resumen'], ['pedidos', `🧾 Pedidos${pend ? ` · ${pend} nuevo${pend > 1 ? 's' : ''}` : ''}`], ['mostrador', '🏪 Venta en sede'], ['inventario', '📦 Inventario'], ['clientes', '👥 Clientes'], ['config', '⚙️ Tasa y pagos']]
      .map(([k, l]) => `<button class="${view.tab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
    <div id="body"></div></div>`;
  $('#sedeSel').onchange = e => { view.sede = e.target.value; render(); };
  $('#out').onclick = () => { TM.adminLogout(); render(); };
  $$('[data-tab]').forEach(b => b.onclick = () => { view.tab = b.dataset.tab; render(); });
  ({ resumen, pedidos, mostrador, inventario, clientes, config })[view.tab]();
  knownIds = new Set(TM.orders().map(o => o.id));
}

/* ---------- resumen ---------- */
function resumen() {
  const all = scoped(), ok = vendidos(all), total = ok.reduce((t, o) => t + o.total, 0);
  const hoy = new Date().setHours(0, 0, 0, 0), hoyV = ok.filter(o => o.creado >= hoy).reduce((t, o) => t + o.total, 0);
  const activos = all.filter(o => ['confirmado', 'preparando', 'en_camino', 'listo_retiro'].includes(o.estado));
  const porSede = TM.data.sucursales.map(s => ({ s, v: vendidos(TM.orders()).filter(o => o.sucursalId === s.id).reduce((t, o) => t + o.total, 0) }));
  const max = Math.max(1, ...porSede.map(x => x.v)), web = ok.filter(o => o.canal === 'web').length;
  const porPago = TM.PAGOS.map(p => ({ p, n: ok.filter(o => o.pagoId === p.id).length })).filter(x => x.n);
  const agotados = TM.data.productos.filter(p => view.sede === 'todas' ? !TM.stockTotal(p) : !(p.stock[view.sede])).length;
  const feed = all.slice(0, 8).map(o => `<div class="n"><span>${o.estado === 'nuevo' ? '🔔' : TM.ESTADOS[o.estado].icon}</span><span><b>${o.id}</b> · ${esc(o.cliente.nombre)} en ${esc(o.zona)} → <b>${esc(TM.sucursal(o.sucursalId).corto)}</b><br><small style="color:var(--mute)">${fecha(o.creado)} · ${money(o.total)} · ${esc(o.pago.split(' (')[0])}</small></span></div>`).join('');
  $('#body').innerHTML = `<div class="kpis">
      <div class="kpi"><small>Ventas (sin cancelados)</small><b>${money(total)}</b></div>
      <div class="kpi"><small>Ventas de hoy</small><b>${money(hoyV)}</b></div>
      <div class="kpi"><small>Tickets</small><b>${ok.length}</b><small>${web} web · ${ok.length - web} en sede</small></div>
      <div class="kpi"><small>Por despachar</small><b>${activos.length}</b><small>${agotados} productos agotados</small></div></div>
    <div class="two"><div class="panel"><h3>Ventas por sucursal</h3>${porSede.map(x => `<div class="bar"><span>${esc(x.s.corto)}</span><i style="width:${Math.max(2, x.v / max * 100)}%"></i><span>${money(x.v)}</span></div>`).join('')}
      <h3 style="margin-top:16px">Tickets por forma de pago</h3>${porPago.map(x => `<div class="bar"><span>${esc(x.p.label.split(' (')[0])}</span><i style="width:${x.n / Math.max(1, ok.length) * 100}%;background:var(--azul)"></i><span>${x.n}</span></div>`).join('') || '<p style="color:var(--mute)">—</p>'}</div>
    <div class="panel feed"><h3>🔔 Avisos internos</h3>${feed || '<p style="color:var(--mute)">Sin pedidos aún.</p>'}</div></div>
    <button class="btn btn-line btn-sm" id="reset">Reiniciar datos de demo</button>`;
  $('#reset').onclick = () => { if (confirm('Se borran pedidos, stock editado, tasa y carrito de este navegador (las cuentas de clientes se conservan). ¿Continuar?')) { TM.resetDemo(); location.reload(); } };
}

/* ---------- pedidos ---------- */
function pedidos() {
  let list = scoped(); if (view.estado !== 'todos') list = list.filter(o => o.estado === view.estado);
  $('#body').innerHTML = `<div class="filters"><select id="estSel" aria-label="Estado">${[['todos', 'Todos los estados'], ...Object.entries(TM.ESTADOS).map(([k, v]) => [k, v.label])].map(([k, l]) => `<option value="${k}" ${view.estado === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="ord-grid">${list.map(ordCard).join('') || '<p style="color:var(--mute)">No hay pedidos con ese filtro.</p>'}</div>`;
  $('#estSel').onchange = e => { view.estado = e.target.value; pedidos(); };
}
function ordCard(o) {
  const s = TM.sucursal(o.sucursalId), sig = TM.nextEstados(o), cerrado = ['entregado', 'cancelado'].includes(o.estado);
  const falta = !o.stockAplicado && !cerrado && o.items.some(i => (TM.producto(i.pid)?.stock[o.sucursalId] || 0) < i.qty);
  const disp = o.items.map(i => `${esc(i.nombre)}: ${TM.disponibilidad(i.pid).filter(a => a.stock).map(a => `${esc(a.sucursal.corto)} ${a.stock}`).join(', ') || 'sin stock'}`).join('<br>');
  const tel = (o.cliente.telefono || '').replace(/\D/g, '').replace(/^0/, '');
  const wa = tel ? TM.waLink(`Hola ${o.cliente.nombre}, te escribimos de Technomar ${s.corto} por tu pedido ${o.id}.`, '58' + tel) : '';
  return `<div class="ord ${o.estado === 'nuevo' ? 'new' : ''}">
    <div class="ord-h"><b>🧾 ${o.id}</b>${st(o.estado)}</div>
    <div class="meta"><span>${fecha(o.creado)}</span><span>${o.canal === 'web' ? '🌐 Web' : '🏪 En sede'}</span><span>${o.entrega === 'delivery' ? '🛵 Delivery' : o.entrega === 'retiro' ? '🏪 Retiro' : '🧍 Mostrador'}</span><span>💳 ${esc(o.pago.split(' (')[0])}</span></div>
    <div><b>${esc(o.cliente.nombre)}</b> · ${esc(o.cliente.telefono || 's/t')} · 📍 ${esc(o.zona)}${o.direccion ? ` — ${esc(o.direccion)}` : ''}</div>
    <div class="items">${o.items.map(itemTxt).join('<br>')}<br><b>Total ${money(o.total)}${o.totalBs ? ' · ' + TM.bs(o.totalBs) : ''}</b>${o.nota ? `<br><i>“${esc(o.nota)}”</i>` : ''}</div>
    ${!cerrado && !o.stockAplicado ? `<div style="font-size:.76rem;color:var(--mute)"><b>Disponibilidad:</b><br>${disp}</div>` : ''}
    ${falta ? '<div class="warn">⚠️ La sede asignada no tiene stock suficiente. Cambia de sede.</div>' : ''}
    <div class="acts"><label style="font-size:.76rem;font-weight:700">Sede
      <select data-sede="${o.id}" ${cerrado ? 'disabled' : ''}>${TM.data.sucursales.map(x => `<option value="${x.id}" ${x.id === o.sucursalId ? 'selected' : ''}>${esc(x.corto)}</option>`).join('')}</select></label>
      ${sig.map(e => `<button class="btn btn-azul btn-sm" data-go="${o.id}|${e}">${TM.ESTADOS[e].icon} ${TM.ESTADOS[e].label}</button>`).join('')}
      ${!cerrado ? `<button class="btn btn-line btn-sm" data-go="${o.id}|cancelado">Cancelar</button>` : ''}
      <button class="btn btn-line btn-sm" data-print="${o.id}">🖨️ Ticket</button>
      ${wa ? `<a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="${wa}" aria-label="Escribir al cliente">💬</a>` : ''}</div></div>`;
}

/* ---------- venta en sede ---------- */
function mostrador() {
  const d = TM.data;
  $('#body').innerHTML = `<div class="panel"><h3>🏪 Registrar venta en sede</h3>
    <p style="color:var(--mute);font-size:.84rem;margin-bottom:12px">Descuenta el stock de la sede al instante y genera su ticket.</p><div id="merr"></div>
    <form id="mf"><div class="field"><label for="ms">Sucursal</label><select id="ms" name="sede">${d.sucursales.map(s => `<option value="${s.id}" ${view.sede === s.id ? 'selected' : ''}>${esc(s.nombre)}</option>`).join('')}</select></div>
    <div class="field"><label for="mq">Buscar producto</label><input id="mq" placeholder="Escribe para filtrar…" autocomplete="off"></div>
    <div class="field"><label for="mpid">Producto</label><select name="pid" id="mpid"></select></div>
    <div class="field"><label for="mvi">Versión</label><select name="vi" id="mvi"></select></div>
    <div class="field"><label for="mqty">Cantidad</label><input id="mqty" name="qty" type="number" min="1" value="1"></div>
    <div class="field"><label for="mpg">Pago</label><select id="mpg" name="pago">${TM.PAGOS.map(p => `<option value="${p.id}">${esc(p.label)}</option>`).join('')}</select></div>
    <div class="field"><label for="mcl">Cliente (opcional)</label><input id="mcl" name="cliente" placeholder="Nombre"></div>
    <div class="note" id="mtot" style="margin-bottom:12px"></div>
    <button class="btn btn-verde btn-block">Registrar venta</button></form></div>`;
  const fillP = () => {
    const sede = $('#ms').value, q = $('#mq').value.toLowerCase();
    const list = d.productos.filter(p => !q || p.nombre.toLowerCase().includes(q)).slice(0, 80);
    $('#mpid').innerHTML = list.map(p => `<option value="${p.id}" ${!p.stock[sede] ? 'disabled' : ''}>${esc(p.nombre)} (${p.stock[sede] || 0} en sede)</option>`).join('');
    const first = list.find(p => p.stock[sede]); if (first) $('#mpid').value = first.id; fillV();
  };
  const fillV = () => { const p = TM.producto($('#mpid').value); $('#mvi').innerHTML = p ? p.variantes.map((v, i) => `<option value="${i}">${esc(v.nombre)} — ${money(v.precio)}</option>`).join('') : ''; tot(); };
  const tot = () => { const p = TM.producto($('#mpid').value); if (!p) return ($('#mtot').textContent = 'Sin productos con stock en esta sede.'); const pg = TM.pago($('#mpg').value), u = TM.precio(p, +$('#mvi').value, pg.modo) * Math.max(1, +$('#mqty').value || 1); $('#mtot').innerHTML = `Total a cobrar: <b>${money(u)}</b>${pg.modo === 'bs' && TM.enBs(u) ? ' · ' + TM.bs(TM.enBs(u)) : ''}`; };
  fillP(); $('#ms').onchange = fillP; $('#mq').oninput = fillP; $('#mpid').onchange = fillV; $('#mvi').onchange = tot; $('#mpg').onchange = tot; $('#mqty').oninput = tot;
  $('#mf').onsubmit = e => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)), qty = Math.max(1, parseInt(f.qty) || 1), p = TM.producto(f.pid);
    if (!p || qty > (p.stock[f.sede] || 0)) return ($('#merr').innerHTML = '<div class="err">Esa sede no tiene suficientes unidades.</div>');
    const o = TM.createCounterSale({ sucursalId: f.sede, lines: [{ p, vi: +f.vi, variante: p.variantes.length > 1 ? p.variantes[+f.vi].nombre : '', color: '', qty }], pagoId: f.pago, cliente: { nombre: f.cliente.trim() || 'Cliente mostrador', telefono: '', email: '' } });
    toast(`Venta ${o.id} registrada ✓`); render();
  };
}

/* ---------- inventario ---------- */
function inventario() {
  const d = TM.data, sedes = d.sucursales.filter(s => view.sede === 'todas' || s.id === view.sede);
  const list = d.productos.filter(p => (view.invCat === 'Todos' || p.categoria === view.invCat) && (!view.invQ || p.nombre.toLowerCase().includes(view.invQ.toLowerCase())));
  $('#body').innerHTML = `<div class="panel"><h3>📦 Stock por sucursal</h3><p style="color:var(--mute);font-size:.8rem;margin-bottom:10px">Cantidades de DEMO (el sitio actual no publica stock). Edita y se guarda al instante. Rojo = agotado.</p>
    <div class="filters"><input id="invQ" placeholder="Buscar producto…" value="${esc(view.invQ)}" style="flex:1;min-width:160px"><select id="invCat">${['Todos', ...d.categorias.map(c => c.id)].map(c => `<option ${c === view.invCat ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
    <div class="scroll-x"><table class="tbl"><thead><tr><th>Producto (${list.length})</th>${sedes.map(s => `<th>${esc(s.corto)}</th>`).join('')}<th>Total</th></tr></thead><tbody>
    ${list.map(p => `<tr><td>${p.foto ? `<img src="${p.foto}" alt="" class="ti">` : ''}${esc(p.nombre)}</td>${sedes.map(s => `<td><input type="number" min="0" value="${p.stock[s.id] || 0}" data-stock="${p.id}|${s.id}" class="${p.stock[s.id] ? '' : 'z'}" aria-label="${esc(p.nombre)} en ${esc(s.corto)}"></td>`).join('')}<td><b>${TM.stockTotal(p)}</b></td></tr>`).join('')}
    </tbody></table></div></div>`;
  $('#invQ').oninput = e => { view.invQ = e.target.value; const pos = e.target.selectionStart; inventario(); const i = $('#invQ'); i.focus(); i.setSelectionRange(pos, pos); };
  $('#invCat').onchange = e => { view.invCat = e.target.value; inventario(); };
}

/* ---------- clientes ---------- */
function clientes() {
  const us = TM.users(), os = TM.orders();
  $('#body').innerHTML = `<div class="panel"><h3>👥 Clientes registrados (${us.length})</h3>${us.length ? us.map(u => {
    const mine = os.filter(o => o.userId === u.id && o.estado !== 'cancelado');
    return `<div class="line"><div class="e">👤</div><div class="n">${esc(u.nombre)}<small>${esc(u.email)} · ${esc(u.telefono)} · ${esc(u.zona)}</small></div><div style="text-align:right;font-size:.8rem"><b>${mine.length}</b> pedidos<br>${money(mine.reduce((t, o) => t + o.total, 0))}</div></div>`;
  }).join('') : '<p style="color:var(--mute)">Aún no hay registros. Los clientes que se registran en la tienda aparecen aquí (mismo navegador en esta demo).</p>'}</div>`;
}

/* ---------- tasa BCV y financiamiento ---------- */
function config() {
  const c = TM.config();
  $('#body').innerHTML = `<div class="panel"><h3>💱 Tasa BCV del día</h3>
    <p style="color:var(--mute);font-size:.82rem;margin-bottom:10px">La tienda muestra precios en Bs con esta tasa. Sin tasa, muestra la referencia en $.${c.actualizado ? ' Última actualización: ' + fecha(c.actualizado) + '.' : ''}</p>
    <form id="cf"><div class="field"><label for="ct">Bs por 1 USD</label><input id="ct" name="tasaBCV" type="number" step="0.01" min="0" value="${c.tasaBCV || ''}" placeholder="Ej: 195.50"></div>
    <div class="field"><label for="cb">Factor precio en Bs / Punto (sobre precio en divisas)</label><input id="cb" name="factorBs" type="number" step="0.01" min="1" value="${c.factorBs}"></div>
    <div class="field"><label for="ck">Factor precio Krece (sobre precio en divisas)</label><input id="ck" name="factorKrece" type="number" step="0.01" min="1" value="${c.factorKrece}"></div>
    <button class="btn btn-azul btn-block">Guardar</button></form></div>
    <div class="panel"><h3>Niveles de financiamiento</h3><p style="color:var(--mute);font-size:.82rem">Tomados de las calculadoras de grupotechnomar.com. Se editan en <code>data/productos.json → finanzas</code>.</p>
    <table class="tbl" style="margin-top:8px"><tr><th>Plataforma</th><th>Nivel</th><th>Inicial</th><th>Cuotas</th></tr>
    ${['cashea', 'krece'].flatMap(pl => c[pl].map(n => `<tr><td>${pl === 'cashea' ? 'Cashea' : 'Krece'}</td><td>${esc(n.nombre)}</td><td>${n.inicial}%</td><td>${n.cuotas}</td></tr>`)).join('')}</table></div>`;
  $('#cf').onsubmit = e => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
    TM.setConfig({ tasaBCV: Math.max(0, +f.tasaBCV || 0), factorBs: Math.max(1, +f.factorBs || 1), factorKrece: Math.max(1, +f.factorKrece || 1) });
    toast('Configuración guardada ✓'); config();
  };
}

/* ---------- ticket imprimible ---------- */
function printTicket(id) {
  const o = TM.orders().find(x => x.id === id), s = TM.sucursal(o.sucursalId);
  $('#printArea').innerHTML = `<h3>TECHNOMAR MARGARITA</h3><p>RIF ${esc(TM.data.rif)}</p><p>${esc(s.nombre)}</p><hr><p><b>${o.id}</b> · ${fecha(o.creado)}</p><p>Cliente: ${esc(o.cliente.nombre)}</p><p>${o.entrega === 'delivery' ? 'Delivery: ' + esc(o.zona) + ' ' + esc(o.direccion) : o.entrega === 'retiro' ? 'Retiro en sede' : 'Venta en mostrador'}</p><hr>
    ${o.items.map(i => `<p>${itemTxt(i)} ... ${money(i.precio * i.qty)}</p>`).join('')}<hr><p><b>TOTAL ${money(o.total)}</b>${o.totalBs ? ' (' + TM.bs(o.totalBs) + ')' : ''}</p><p>Pago: ${esc(o.pago)}</p><p>¡Gracias por tu compra! 🌴</p>`;
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
  const sk = e.target.closest('[data-stock]'); if (sk) { const [pid, sid] = sk.dataset.stock.split('|'); TM.setStock(pid, sid, sk.value); sk.classList.toggle('z', !(+sk.value)); toast('Stock guardado'); }
});
// Pedidos hechos desde la tienda en otra pestaña llegan en vivo
window.addEventListener('storage', ev => {
  if (!TM.adminLogged() || !TM.data) return;
  if (ev.key === TM.K.orders) {
    const nuevos = TM.orders().filter(o => !knownIds.has(o.id));
    if (nuevos.length) toast(`🔔 Nuevo pedido ${nuevos[0].id} de ${nuevos[0].cliente.nombre} (${nuevos[0].zona})`);
    if (view.tab !== 'inventario') render();
  }
  if (ev.key === TM.K.stock) location.reload();
});

(async () => {
  try { await TM.load(); } catch (err) { $('#app').innerHTML = `<div class="wrap"><div class="err" style="margin-top:20px">${esc(err.message)}</div></div>`; return; }
  render();
})();
