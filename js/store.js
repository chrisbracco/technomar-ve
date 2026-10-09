/* TECHNOMAR · capa de datos compartida (tienda + admin)
 * v1 100% front: catálogo en data/productos.json; usuarios, pedidos y stock
 * viven en localStorage del navegador. En fase 2 esto se reemplaza por un backend. */
const TM = (() => {
  const K = {
    users: 'tm_users', session: 'tm_session', orders: 'tm_orders', stock: 'tm_stock',
    cart: 'tm_cart', seq: 'tm_seq', seeded: 'tm_seeded', adminSession: 'tm_admin_session'
  };
  // Credenciales DEMO del panel (solo front: NO es seguridad real)
  const ADMIN = { email: 'admin@technomar.ve', clave: 'technomar2026', nombre: 'Equipo Technomar' };

  const ESTADOS = {
    nuevo: { label: 'Nuevo', icon: '🆕' },
    confirmado: { label: 'Confirmado', icon: '✅' },
    preparando: { label: 'Preparando', icon: '📦' },
    en_camino: { label: 'En camino', icon: '🛵' },
    listo_retiro: { label: 'Listo para retirar', icon: '🏪' },
    entregado: { label: 'Entregado', icon: '🎉' },
    cancelado: { label: 'Cancelado', icon: '✖️' }
  };
  const PAGOS = ['Cashea (0% inicial)', 'Zelle', 'Pago móvil', 'Efectivo USD', 'Punto de venta'];

  const read = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage bloqueado */ } };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => '$' + Number(n).toLocaleString('es-VE', { minimumFractionDigits: Number.isInteger(+n) ? 0 : 2, maximumFractionDigits: 2 });
  const uid = () => Math.random().toString(36).slice(2, 10);

  let data = null;

  async function load() {
    if (data) return data;
    let res;
    try { res = await fetch('data/productos.json', { cache: 'no-cache' }); } catch { res = null; }
    if (!res || !res.ok) {
      throw new Error('No se pudo leer data/productos.json. Abre el sitio con un servidor local (ej: python3 -m http.server) en vez de doble clic al archivo.');
    }
    data = await res.json();
    // stock editado desde el admin pisa el del JSON
    const ov = read(K.stock, {});
    data.productos.forEach(p => { if (ov[p.id]) p.stock = { ...p.stock, ...ov[p.id] }; });
    seed();
    return data;
  }

  const sucursal = id => data.sucursales.find(s => s.id === id);
  const producto = id => data.productos.find(p => p.id === id);
  const stockTotal = p => Object.values(p.stock).reduce((a, b) => a + b, 0);
  const disponibilidad = pid => data.sucursales.map(s => ({ sucursal: s, stock: producto(pid).stock[s.id] || 0 }));

  function saveStock() {
    const ov = {}; data.productos.forEach(p => { ov[p.id] = p.stock; }); write(K.stock, ov);
  }
  function setStock(pid, sid, n) { producto(pid).stock[sid] = Math.max(0, Math.floor(+n || 0)); saveStock(); }
  function addStock(pid, sid, delta) { const p = producto(pid); p.stock[sid] = Math.max(0, (p.stock[sid] || 0) + delta); saveStock(); }

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
  const logout = () => { try { localStorage.removeItem(K.session); } catch { /* */ } };

  const adminLogged = () => read(K.adminSession, false);
  function adminLogin(email, clave) {
    if (email.trim().toLowerCase() !== ADMIN.email || clave !== ADMIN.clave) throw new Error('Credenciales de administrador incorrectas.');
    write(K.adminSession, true);
  }
  const adminLogout = () => { try { localStorage.removeItem(K.adminSession); } catch { /* */ } };

  /* ---------- carrito ---------- */
  const cart = () => read(K.cart, {});
  function cartSet(pid, qty) { const c = cart(); if (qty <= 0) delete c[pid]; else c[pid] = Math.min(qty, 20); write(K.cart, c); }
  const cartClear = () => write(K.cart, {});
  function cartLines() {
    return Object.entries(cart()).map(([pid, qty]) => ({ p: producto(pid), qty })).filter(l => l.p);
  }
  const cartTotal = () => cartLines().reduce((t, l) => t + l.p.precio * l.qty, 0);
  const cartCount = () => cartLines().reduce((t, l) => t + l.qty, 0);

  /* ---------- pedidos / tickets ---------- */
  const orders = () => read(K.orders, []);
  const saveOrders = o => write(K.orders, o);
  function nextId() { const n = read(K.seq, 0) + 1; write(K.seq, n); return 'TM-' + String(n).padStart(4, '0'); }

  // Sucursal que cubre TODO el pedido; prioriza la sede de la zona del cliente, luego la de mayor stock.
  function sugerirSucursal(items, zona) {
    const pref = (data.zonas.find(z => z.nombre === zona) || {}).sucursal;
    const rank = data.sucursales.map(s => {
      const ok = items.every(i => (producto(i.pid)?.stock[s.id] || 0) >= i.qty);
      const sobrante = items.reduce((t, i) => t + (producto(i.pid)?.stock[s.id] || 0), 0);
      return { id: s.id, ok, sobrante, pref: s.id === pref };
    });
    const best = rank.filter(r => r.ok).sort((a, b) => (b.pref - a.pref) || (b.sobrante - a.sobrante))[0];
    if (best) return { sucursalId: best.id, completa: true };
    const parcial = rank.sort((a, b) => (b.pref - a.pref) || (b.sobrante - a.sobrante))[0];
    return { sucursalId: parcial.id, completa: false };
  }

  function pushHist(o, estado) { (o.historial = o.historial || []).push({ estado, at: Date.now() }); }

  function createOrder({ user, items, entrega, zona, direccion, pago, nota, canal = 'web', cliente }) {
    const lines = items.map(i => ({ pid: i.pid, nombre: producto(i.pid).nombre, precio: producto(i.pid).precio, qty: i.qty }));
    const sug = sugerirSucursal(lines, zona);
    const o = {
      id: nextId(), creado: Date.now(), canal, userId: user?.id || null,
      cliente: cliente || { nombre: user.nombre, telefono: user.telefono, email: user.email },
      zona, direccion: direccion || '', entrega, pago, nota: nota || '',
      items: lines, total: lines.reduce((t, l) => t + l.precio * l.qty, 0),
      sucursalId: sug.sucursalId, stockCompleto: sug.completa,
      estado: 'nuevo', stockAplicado: false, historial: []
    };
    pushHist(o, 'nuevo');
    saveOrders([o, ...orders()]);
    return o;
  }

  // Ventas hechas en mostrador de una sucursal: salen entregadas y descuentan stock de inmediato.
  function createCounterSale({ sucursalId, items, pago, cliente }) {
    const o = createOrder({ items, entrega: 'mostrador', zona: sucursal(sucursalId).nombre, pago, canal: 'sucursal', cliente, user: null });
    o.sucursalId = sucursalId;
    updateOrder(o.id, ord => { ord.sucursalId = sucursalId; ord.items.forEach(i => addStock(i.pid, sucursalId, -i.qty)); ord.stockAplicado = true; ord.estado = 'entregado'; pushHist(ord, 'entregado'); });
    return o;
  }

  function updateOrder(id, fn) {
    const all = orders(); const o = all.find(x => x.id === id); if (!o) return null;
    fn(o); saveOrders(all); return o;
  }
  const releaseStock = o => { if (o.stockAplicado) { o.items.forEach(i => addStock(i.pid, o.sucursalId, i.qty)); o.stockAplicado = false; } };
  const takeStock = o => { if (!o.stockAplicado) { o.items.forEach(i => addStock(i.pid, o.sucursalId, -i.qty)); o.stockAplicado = true; } };

  function nextEstados(o) {
    const salida = o.entrega === 'delivery' ? 'en_camino' : 'listo_retiro';
    return ({ nuevo: ['confirmado'], confirmado: ['preparando'], preparando: [salida], en_camino: ['entregado'], listo_retiro: ['entregado'] })[o.estado] || [];
  }
  function setEstado(id, estado) {
    return updateOrder(id, o => {
      if (estado === 'confirmado') takeStock(o);
      if (estado === 'cancelado') releaseStock(o);
      o.estado = estado; pushHist(o, estado);
    });
  }
  // Cambiar de sucursal: si ya se descontó stock, se devuelve a la sede anterior y se toma de la nueva.
  function setSucursal(id, sid) {
    return updateOrder(id, o => {
      const tenia = o.stockAplicado; releaseStock(o); o.sucursalId = sid; if (tenia) takeStock(o);
      o.stockCompleto = o.items.every(i => (producto(i.pid)?.stock[sid] || 0) >= 0);
    });
  }

  function waLink(text, phone) { return `https://wa.me/${phone || data.whatsapp}?text=${encodeURIComponent(text)}`; }
  function orderWaText(o) {
    const s = sucursal(o.sucursalId);
    return [`Hola Technomar 👋 Soy ${o.cliente.nombre}. Hice el pedido ${o.id}:`,
      ...o.items.map(i => `• ${i.qty}× ${i.nombre} (${money(i.precio)})`),
      `Total: ${money(o.total)} · Pago: ${o.pago}`,
      o.entrega === 'delivery' ? `🛵 Delivery a ${o.zona}${o.direccion ? ' — ' + o.direccion : ''}` : `🏪 Retiro en ${s.nombre}`,
      `¿Me confirman disponibilidad?`].join('\n');
  }

  /* ---------- datos demo para que el panel no arranque vacío ---------- */
  function seed() {
    if (read(K.seeded, false) || orders().length) return;
    const now = Date.now(), H = 3600e3;
    const demo = [
      ['Mariana Rojas', '0414-5550101', 'Pampatar', 'delivery', 'redmi-note-15', 1, 'Cashea (0% inicial)', 'entregado', 's1', 30 * H, 'web'],
      ['Luis Marcano', '0424-5550102', 'Porlamar Centro', 'retiro', 'airpods-pro', 1, 'Zelle', 'entregado', 's2', 26 * H, 'web'],
      ['Mostrador', '', 'Sede', 'mostrador', 'forro-magsafe', 3, 'Efectivo USD', 'entregado', 's4', 20 * H, 'sucursal'],
      ['Andreína Salazar', '0412-5550103', 'Juan Griego', 'delivery', 'galaxy-s26', 1, 'Pago móvil', 'en_camino', 's5', 5 * H, 'web'],
      ['José Gil', '0416-5550104', 'Los Robles', 'delivery', 'ps5-slim', 1, 'Cashea (0% inicial)', 'preparando', 's3', 3 * H, 'web'],
      ['Valentina Díaz', '0414-5550105', 'Playa El Ángel', 'retiro', 'iphone-18-pro-max', 1, 'Zelle', 'nuevo', 's1', 0.4 * H, 'web']
    ];
    const list = demo.map(([n, t, zona, entrega, pid, qty, pago, estado, sid, ago, canal], i) => {
      const p = producto(pid);
      const o = {
        id: 'TM-' + String(i + 1).padStart(4, '0'), creado: now - ago, canal, userId: null, demo: true,
        cliente: { nombre: n, telefono: t, email: '' }, zona, direccion: entrega === 'delivery' ? 'Dirección de ejemplo' : '', entrega, pago, nota: '',
        items: [{ pid, nombre: p.nombre, precio: p.precio, qty }], total: p.precio * qty, sucursalId: sid, stockCompleto: true,
        estado, stockAplicado: !['nuevo', 'cancelado'].includes(estado),
        historial: [{ estado: 'nuevo', at: now - ago }, ...(estado !== 'nuevo' ? [{ estado, at: now - ago + 0.2 * H }] : [])]
      };
      return o;
    });
    write(K.orders, list.reverse()); write(K.seq, list.length); write(K.seeded, true);
  }
  function resetDemo() {
    Object.values(K).forEach(k => { if (k !== K.users) try { localStorage.removeItem(k); } catch { /* */ } });
  }

  return {
    K, ADMIN, ESTADOS, PAGOS, esc, money, load, get data() { return data; },
    sucursal, producto, stockTotal, disponibilidad, setStock, addStock,
    users, currentUser, register, login, logout, adminLogged, adminLogin, adminLogout,
    cart, cartSet, cartClear, cartLines, cartTotal, cartCount,
    orders, createOrder, createCounterSale, setEstado, setSucursal, updateOrder, nextEstados, sugerirSucursal,
    waLink, orderWaText, resetDemo
  };
})();
