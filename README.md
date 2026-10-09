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

Sitio 100% estático. Publicado en GitHub Pages: https://chrisbracco.github.io/technomar-ve/ (panel: `/admin.html`).
En local, sírvelo con `python3 -m http.server 8000` (con doble clic el navegador bloquea la lectura del JSON).

- **Tienda (`index.html`):** contenido real de grupotechnomar.com — logo, fotos de las 5 sedes, 171 productos con fotos, variantes y colores, Krece/Cashea, servicio técnico, aliado HANK, iPhone Duo. Más: carrito multi-producto, registro/login, checkout con delivery o retiro, ticket y aviso interno por pedido.
- **Precios en 4 modalidades** (como el sitio actual): divisas, Bs a tasa BCV (precio × 1,22 × tasa), Cashea (`precioCashea` del catálogo) y Krece (precio × 1,22), con inicial y cuotas por nivel.
- **Panel (`admin.html`)** — demo `admin@technomar.ve` / `technomar2026`: resumen por sede y forma de pago, pedidos con flujo de estados y cambio de sede, venta en sede, inventario 171 × 5 sedes con buscador, clientes, **tasa BCV del día** editable, ticket imprimible.
- **Datos:** `data/productos.json` (catálogo, sedes, zonas → sede, niveles de financiamiento). Imágenes optimizadas a WebP en `assets/img/` y fuente Poppins local en `assets/fonts/` (sin servicios externos).

## Pendiente / a confirmar con el cliente

- **Stock por sede es de DEMO** (el sitio actual no lo publica). Fase 2: backend con stock real, cuentas, pedidos y avisos compartidos entre dispositivos. Hoy todo vive en el navegador de cada quien.
- Login del panel y claves de clientes **no son seguridad real** (solo front).
- **Precio del iPhone 18 Pro Max inconsistente** en el sitio actual: afiche $1.800, texto $1.843, catálogo $1.811 / $1.664 (Negro). Aquí se usa el catálogo.
- **Horarios distintos** entre los afiches de sede y el texto del sitio (ej. Rattan 9:30–6:30 vs 9:00–6:00). Aquí se usa el texto del sitio.
- Niveles de Cashea/Krece y factor 1,22 tomados del código del sitio actual: validar vigentes.
- Mapeo zona → sede sugerida es aproximado. Costo de delivery por zona no definido.
- 6 productos sin foto en el sitio original (se muestra ícono de categoría).
