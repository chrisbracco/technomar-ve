/* TECHNOMAR · capa de datos compartida (tienda + panel)
 * v1 100% front: catálogo en data/productos.json; usuarios, pedidos, stock editado y
 * configuración (tasa BCV) viven en localStorage del navegador. Fase 2 = backend real. */
const TM = (() => {
  const K = {
    users: 'tm_users', session: 'tm_session', orders: 'tm_orders', stock: 'tm_stock', cart: 'tm_cart2',
    seq: 'tm_seq', seeded: 'tm_seeded2', adminSession: 'tm_admin_session', config: 'tm_config', mode: 'tm_price_mode'
  };
  // Credenciales DEMO del panel (solo front: NO es seguridad real)
  const ADMIN = { email: 'admin@technomar.ve', clave: 'technomar2026' };

  const ESTADOS = {
    nuevo: { label: 'Nuevo', icon: '🆕' },
    confirmado: { label: 'Confirmado', icon: '✅' },
    preparando: { label: 'Preparando', icon: '📦' },
    en_camino: { label: 'En camino', icon: '🛵' },
    listo_retiro: { label: 'Listo para retirar', icon: '🏪' },
    entregado: { label: 'Entregado', icon: '🎉' },
    cancelado: { label: 'Cancelado', icon: '✖️' }
  };
  // Cada forma de pago usa la lista de precios del sitio actual de Technomar
  const PAGOS = [
    { id: 'divisas', label: 'Divisas (efectivo USD / Zelle)', modo: 'usd' },
    { id: 'bs', label: 'Pago Móvil / Transferencia (Bs a tasa BCV)', modo: 'bs' },
    { id: 'pos', label: 'Punto de Venta (Bs)', modo: 'bs' },
    { id: 'cashea', label: 'Cashea', modo: 'cashea' },
    { id: 'krece', label: 'Krece', modo: 'krece' }
  ];

  const read = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage bloqueado */ } };
  const del = k => { try { localStorage.removeItem(k); } catch { /* */ } };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => '$' + Number(n).toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: Number.isInteger(Math.round(n * 100) / 100) ? 0 : 2 });
  const bs = n => 'Bs. ' + Number(n).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const uid = () => Math.random().toString(36).slice(2, 10);

  let data = null;

  async function load() {
    if (data) return data;
    let res;
    try { res = await fetch('data/productos.json', { cache: 'no-cache' }); } catch { res = null; }
    if (!res || !res.ok) throw new Error('No se pudo leer data/productos.json. Abre el sitio con un servidor (ej: python3 -m http.server) en vez de doble clic al archivo.');
    data = await res.json();
    const ov = read(K.stock, {});
    data.productos.forEach(p => { if (ov[p.id]) p.stock = { ...p.stock, ...ov[p.id] }; });
    seed();
    return data;
  }

  const sucursal = id => data.sucursales.find(s => s.id === id);
  const producto = id => data.productos.find(p => p.id === id);
  const categoria = id => data.categorias.find(c => c.id === id);
  const stockTotal = p => Object.values(p.stock).reduce((a, b) => a + b, 0);
  const disponibilidad = pid => data.sucursales.map(s => ({ sucursal: s, stock: producto(pid).stock[s.id] || 0 }));
  function saveStock() { const ov = {}; data.productos.forEach(p => { ov[p.id] = p.stock; }); write(K.stock, ov); }
  function setStock(pid, sid, n) { producto(pid).stock[sid] = Math.max(0, Math.floor(+n || 0)); saveStock(); }
  function addStock(pid, sid, d) { const p = producto(pid); if (!p) return; p.stock[sid] = Math.max(0, (p.stock[sid] || 0) + d); saveStock(); }

  /* ---------- configuración / precios ---------- */
  const config = () => ({ ...data.finanzas, ...read(K.config, {}) });
  const setConfig = patch => write(K.config, { ...read(K.config, {}), ...patch, actualizado: Date.now() });
  const priceMode = () => read(K.mode, 'usd');
  const setPriceMode = m => write(K.mode, m);
  const pago = id => PAGOS.find(p => p.id === id) || PAGOS[0];

  // Precio de una variante según la lista: usd | bs (devuelve USD equivalente) | cashea | krece
  function precio(p, vi = 0, modo = 'usd') {
    const v = p.variantes[vi] || p.variantes[0]; const c = config();
    if (modo === 'cashea') return v.precioCashea;
    if (modo === 'krece') return Math.round(v.precio * c.factorKrece);
    if (modo === 'bs') return Math.round(v.precio * c.factorBs);
    return v.precio;
  }
  const enBs = usd => { const t = config().tasaBCV; return t > 0 ? usd * t : 0; };
  function plan(total, nivel) {
    const inicial = total * nivel.inicial / 100;
    return { inicial, financiar: total - inicial, cuota: (total - inicial) / nivel.cuotas, cuotas: nivel.cuotas };
  }

  /* ---------- usuarios (registro básico) ---------- */
  async function hash(txt) {
    try {
      const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('tm::' + txt));
      return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
    } catch { return btoa(unescape(encodeURIComponent('tm::' + txt))); }
  }
  const users = () => read(K.users, []);
  const currentUser = () => { const id = read(K.session, null); return users().find(u => u.id === id) || null; };
  async function register({ nombre, telefono, email, clave, zona }) {
    email = email.trim().toLowerCase();
    if (users().some(u => u.email === email)) throw new Error('Ya existe una cuenta con ese correo.');
    const u = { id: uid(), nombre: nombre.trim(), telefono: telefono.trim(), email, zona, claveHash: await hash(clave), creado: Date.now() };
    write(K.users, [...users(), u]); write(K.session, u.id); return u;
  }
  async function login(email, clave) {
    email = email.trim().toLowerCase();
    const u = users().find(x => x.email === email);
    if (!u || u.claveHash !== await hash(clave)) throw new Error('Correo o clave incorrectos.');
    write(K.session, u.id); return u;
  }
  const logout = () => del(K.session);
  const adminLogged = () => read(K.adminSession, false);
  function adminLogin(email, clave) {
    if (email.trim().toLowerCase() !== ADMIN.email || clave !== ADMIN.clave) throw new Error('Credenciales de administrador incorrectas.');
    write(K.adminSession, true);
  }
  const adminLogout = () => del(K.adminSession);

  /* ---------- carrito (línea = producto + variante + color) ---------- */
  const cart = () => read(K.cart, {});
  const lineKey = (pid, vi, color) => [pid, vi, color || ''].join('|');
  function cartSet(key, qty) { const c = cart(); if (qty <= 0) delete c[key]; else c[key] = Math.min(qty, 10); write(K.cart, c); }
  const cartClear = () => write(K.cart, {});
  function cartLines() {
    return Object.entries(cart()).map(([key, qty]) => {
      const [pid, vi, color] = key.split('|'); const p = producto(pid);
      return p ? { key, p, vi: +vi, variante: p.variantes.length > 1 ? p.variantes[+vi]?.nombre || '' : '', color, qty } : null;
    }).filter(Boolean);
  }
  const cartCount = () => cartLines().reduce((t, l) => t + l.qty, 0);
  const cartTotal = (modo = 'usd') => cartLines().reduce((t, l) => t + precio(l.p, l.vi, modo) * l.qty, 0);

  /* ---------- pedidos / tickets ---------- */
  const orders = () => read(K.orders, []);
  const saveOrders = o => write(K.orders, o);
  function nextId() { const n = read(K.seq, 0) + 1; write(K.seq, n); return 'TM-' + String(n).padStart(4, '0'); }

  // Sede que cubre TODO el pedido; prioriza la sede de la zona del cliente, luego la de más stock.
  function sugerirSucursal(items, zona) {
    const pref = (data.zonas.find(z => z.nombre === zona) || {}).sucursal;
    const rank = data.sucursales.map(s => ({
      id: s.id, pref: s.id === pref,
      ok: items.every(i => (producto(i.pid)?.stock[s.id] || 0) >= i.qty),
      sobra: items.reduce((t, i) => t + (producto(i.pid)?.stock[s.id] || 0), 0)
    }));
    const sort = arr => arr.sort((a, b) => (b.pref - a.pref) || (b.sobra - a.sobra));
    const best = sort(rank.filter(r => r.ok))[0];
    return best ? { sucursalId: best.id, completa: true } : { sucursalId: sort(rank)[0].id, completa: false };
  }
  const pushHist = (o, estado) => (o.historial = o.historial || []).push({ estado, at: Date.now() });

  function createOrder({ user, lines, entrega, zona, direccion, pagoId, nota, canal = 'web', cliente, sucursalId }) {
    const pg = pago(pagoId);
    const items = lines.map(l => ({ pid: l.p.id, nombre: l.p.nombre, variante: l.variante, color: l.color || '', precio: precio(l.p, l.vi, pg.modo), qty: l.qty }));
    const sug = sugerirSucursal(items, zona);
    const total = items.reduce((t, i) => t + i.precio * i.qty, 0);
    const o = {
      id: nextId(), creado: Date.now(), canal, userId: user?.id || null,
      cliente: cliente || { nombre: user.nombre, telefono: user.telefono, email: user.email },
      zona, direccion: direccion || '', entrega, pago: pg.label, pagoId: pg.id, nota: nota || '',
      items, total, totalBs: pg.modo === 'bs' ? enBs(total) : 0,
      sucursalId: sucursalId || sug.sucursalId, stockCompleto: sug.completa,
      estado: 'nuevo', stockAplicado: false, historial: []
    };
    pushHist(o, 'nuevo');
    saveOrders([o, ...orders()]);
    return o;
  }
  function updateOrder(id, fn) { const all = orders(); const o = all.find(x => x.id === id); if (!o) return null; fn(o); saveOrders(all); return o; }
  const releaseStock = o => { if (o.stockAplicado) { o.items.forEach(i => addStock(i.pid, o.sucursalId, i.qty)); o.stockAplicado = false; } };
  const takeStock = o => { if (!o.stockAplicado) { o.items.forEach(i => addStock(i.pid, o.sucursalId, -i.qty)); o.stockAplicado = true; } };

  // Venta de mostrador: sale entregada y descuenta stock de la sede al instante.
  function createCounterSale({ sucursalId, lines, pagoId, cliente }) {
    const o = createOrder({ lines, entrega: 'mostrador', zona: sucursal(sucursalId).corto, pagoId, canal: 'sucursal', cliente, sucursalId });
    return updateOrder(o.id, x => { takeStock(x); x.estado = 'entregado'; pushHist(x, 'entregado'); });
  }
  function nextEstados(o) {
    const salida = o.entrega === 'delivery' ? 'en_camino' : 'listo_retiro';
    return ({ nuevo: ['confirmado'], confirmado: ['preparando'], preparando: [salida], en_camino: ['entregado'], listo_retiro: ['entregado'] })[o.estado] || [];
  }
  // Confirmar descuenta stock de la sede asignada; cancelar lo devuelve.
  const setEstado = (id, estado) => updateOrder(id, o => {
    if (estado === 'confirmado') takeStock(o);
    if (estado === 'cancelado') releaseStock(o);
    o.estado = estado; pushHist(o, estado);
  });
  const setSucursal = (id, sid) => updateOrder(id, o => { const tenia = o.stockAplicado; releaseStock(o); o.sucursalId = sid; if (tenia) takeStock(o); });

  const waLink = (text, phone) => `https://wa.me/${phone || data.whatsapp}?text=${encodeURIComponent(text)}`;
  function orderWaText(o) {
    const s = sucursal(o.sucursalId);
    return [`Hola Technomar 👋 Soy ${o.cliente.nombre}. Hice el pedido ${o.id} en la web:`,
      ...o.items.map(i => `• ${i.qty}× ${i.nombre}${i.variante && i.variante !== 'Única' ? ' ' + i.variante : ''}${i.color ? ' (' + i.color + ')' : ''} — ${money(i.precio)}`),
      `Total: ${money(o.total)}${o.totalBs ? ' (' + bs(o.totalBs) + ')' : ''} · Pago: ${o.pago}`,
      o.entrega === 'delivery' ? `🛵 Delivery a ${o.zona}${o.direccion ? ' — ' + o.direccion : ''}` : `🏪 Retiro en ${s.nombre}`,
      '¿Me confirman disponibilidad?'].join('\n');
  }

  /* ---------- pedidos de demo para que el panel no arranque vacío ---------- */
  function seed() {
    if (read(K.seeded, false)) return;
    const now = Date.now(), H = 3600e3;
    const demo = [
      ['Mariana Rojas', '0414-5550101', 'Pampatar', 'delivery', 'redmi-15c', 'cashea', 'entregado', 's1', 50, 'web'],
      ['Luis Marcano', '0424-5550102', 'Porlamar Centro', 'retiro', 'iphone-17-pro-max', 'divisas', 'entregado', 's2', 29, 'web'],
      ['Cliente mostrador', '', 'La Vela', 'mostrador', 'honor-earbuds-x8i', 'pos', 'entregado', 's5', 22, 'sucursal'],
      ['Andreína Salazar', '0412-5550103', 'Juan Griego', 'delivery', 'galaxy-a17', 'krece', 'en_camino', 's5', 5, 'web'],
      ['José Gil', '0416-5550104', 'La Asunción', 'delivery', 'playstation-5-slim-digital', 'cashea', 'preparando', 's3', 3, 'web'],
      ['Valentina Díaz', '0414-5550105', 'Playa El Ángel', 'retiro', 'iphone-18-pro-max', 'divisas', 'nuevo', 's1', 0.4, 'web']
    ];
    const list = demo.map(([n, t, zona, entrega, pid, pg, estado, sid, ago, canal], i) => {
      const p = producto(pid); if (!p) return null; const P = pago(pg);
      const pr = precio(p, 0, P.modo);
      return {
        id: 'TM-' + String(i + 1).padStart(4, '0'), creado: now - ago * H, canal, userId: null, demo: true,
        cliente: { nombre: n, telefono: t, email: '' }, zona, direccion: entrega === 'delivery' ? 'Dirección de ejemplo' : '', entrega,
        pago: P.label, pagoId: P.id, nota: '', items: [{ pid, nombre: p.nombre, variante: p.variantes[0].nombre, color: p.colores?.[0] || '', precio: pr, qty: 1 }],
        total: pr, totalBs: 0, sucursalId: sid, stockCompleto: true, estado, stockAplicado: !['nuevo', 'cancelado'].includes(estado),
        historial: [{ estado: 'nuevo', at: now - ago * H }, ...(estado !== 'nuevo' ? [{ estado, at: now - ago * H + 0.3 * H }] : [])]
      };
    }).filter(Boolean);
    write(K.orders, [...list.reverse(), ...orders()]); write(K.seq, Math.max(read(K.seq, 0), list.length)); write(K.seeded, true);
  }
  const resetDemo = () => Object.entries(K).forEach(([n, k]) => { if (!['users', 'session', 'adminSession'].includes(n)) del(k); });

  return {
    K, ADMIN, ESTADOS, PAGOS, esc, money, bs, load, get data() { return data; },
    sucursal, producto, categoria, stockTotal, disponibilidad, setStock, addStock,
    config, setConfig, priceMode, setPriceMode, pago, precio, enBs, plan,
    users, currentUser, register, login, logout, adminLogged, adminLogin, adminLogout,
    cart, lineKey, cartSet, cartClear, cartLines, cartCount, cartTotal,
    orders, createOrder, createCounterSale, updateOrder, setEstado, setSucursal, nextEstados, sugerirSucursal,
    waLink, orderWaText, resetDemo
  };
})();
