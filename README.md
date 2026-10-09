# technomar-ve

Landing / mini e-commerce para **TECHNOMAR MARGARITA** (prospección CrGen).

## La marca

- **Instagram:** [@technomar.ve](https://instagram.com/technomar.ve) — 48.9 mil seguidores, 477 publicaciones
- **Rubro:** TELEFONOS / GAMER / CARROS / SALUD / ACCESORIOS
- **Logo:** palmera verde sobre círculo blanco con anillo azul; texto TECHNOMAR (TECHNO en verde, MAR en azul) + MARGARITA debajo
- **Sucursales:** 5 en total (Porlamar 6301). Confirmadas en la bio de IG:
  - Rattan, Playa El Ángel (Mezzanina Supermercado)
  - C/ Mariño, Plaza Bolívar
  - C/ Igualdad entre Gómez y ... (ver bio completa en IG)
  - (2 más por confirmar con el cliente)
- **WhatsApp:** https://wa.me/4121952897
- **Tono actual en IG:** promociones agresivas de precio, 0% de inicial con Cashea, aniversario de sede, "No fuimos los primeros... PERO NOS LLEGÓ AL MEJOR PRECIO" (iPhone 18 Pro Max), sección de "PREGUNTAS CON EL JEFE"

## Objetivo del repo

Servir de base para construir con Claude una **landing page tipo entrada de e-commerce**: user friendly, super cool, emocional, centrada en **promociones**.

### La landing debe tener

1. **Hero** con la marca y una promo fuerte del momento (ej. 0% inicial con Cashea / mejor precio garantizado)
2. **Sección de promociones** destacadas (cards con precio, antes/después, CTA a WhatsApp)
3. **Categorías:** Teléfonos, Gamer, Carros, Salud, Accesorios
4. **Sedes** con direcciones y botón de WhatsApp por sede
5. **Prueba social:** 48.9k seguidores, clientes, aniversario
6. **CTA final** a WhatsApp (wa.me/4121952897)
7. **Emoción:** que se sienta caribe / Margarita / palmera — no una tienda genérica

### Pedidos (requerimiento clave del cliente)

- **Catálogo centralizado:** todos los productos en un solo lugar, aunque el stock esté repartido entre las 5 sucursales.
- **Notificación interna por pedido:** cuando un cliente hace un pedido, el equipo debe recibir un aviso interno que muestre:
  - **dónde hay disponibilidad** del producto (qué sucursal lo tiene),
  - **dónde está el cliente final** (para coordinar entrega/retiro desde la sucursal correcta).
- La landing debe contemplar este flujo desde el diseño (aunque la primera versión sea solo front).

### Notas

- Repo **público** a propósito: el dueño lo conecta a Claude para generar la landing.
- **No desplegar en Vercel** por ahora (decisión del dueño).
- Sitio estático (HTML/CSS/JS) — sin backends ni APIs.

---

## Cómo correrlo (v1)

Sitio 100% estático. El navegador bloquea `fetch` de JSON con doble clic, así que sírvelo localmente:

```sh
python3 -m http.server 8000   # y abre http://localhost:8000
```

- **Tienda:** `index.html` — catálogo, carrito, registro/login de usuario, checkout (delivery o retiro), ticket y "notificación interna" simulada.
- **Panel del equipo:** `admin.html` — demo: `admin@technomar.ve` / `technomar2026`.
  Resumen y ventas por sucursal, pedidos/tickets con flujo de estados (nuevo → confirmado → preparando → en camino / listo para retiro → entregado), cambio de sede, venta en mostrador, inventario por sede, clientes, ticket imprimible.
- **Datos:** `data/productos.json` (productos, stock por sede, sucursales, zonas→sede). Todo es **de ejemplo**.

## Reporte de validación v1

| Pedido | Estado |
|---|---|
| Hero, promos, categorías (filtran), catálogo con buscador, sedes, prueba social (chat), pagos, CTA final | ✅ hecho |
| Pedido con formulario + mensaje de WhatsApp armado | ✅ (carrito → checkout → botón WhatsApp) |
| Notificación interna con disponibilidad por sede y zona del cliente | ✅ simulada en pantalla y en el feed del panel (se actualiza entre pestañas) |
| Registro básico por usuario | ✅ nombre, teléfono, correo, clave, zona; "Mis pedidos" |
| Tickets, delivery/retiro, administración de ventas por sucursal | ✅ panel `admin.html`; el stock se descuenta al **confirmar** y se devuelve al cancelar |
| Móvil primero, botón flotante WhatsApp, barra inferior | ✅ |

**Mockeado / pendiente fase 2:** cuentas, pedidos y stock editado viven solo en `localStorage` del navegador (no se comparten entre dispositivos); la clave se guarda con hash SHA-256 sin sal por usuario y el login de admin es solo una puerta visual — **no es seguridad real**; no hay pagos reales, ni notificación real al equipo (WhatsApp/push), ni fotos reales de producto (se usan emojis; el JSON admite campo `img`).

**Por confirmar con el cliente:** direcciones de las sedes 3, 4 y 5, horarios, métodos de pago, precios/stock reales, y el número de WhatsApp (`wa.me/4121952897` sin código de país; se asumió `58`).
