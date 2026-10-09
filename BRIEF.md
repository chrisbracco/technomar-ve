# BRIEF — Landing / mini e-commerce TECHNOMAR MARGARITA

> Pégale esto a Claude tal cual, con el repo `chrisbracco/technomar-ve` conectado
> y la carpeta `assets/` adjunta (logo-referencia.jpg, perfil-ig-referencia.jpg).

---

## 1. Contexto de la marca (literal)

**TECHNOMAR MARGARITA** — tienda venezolana en Porlamar, Nueva Esparta.

- **Instagram:** @technomar.ve — 48.9 mil seguidores, 477 publicaciones, 62 seguidos
- **Bio literal:** "TELEFONOS/GAMER/CARROS/SALUD/ACCESORIOS" — "Creador(a) digital"
- **Sedes (5 sucursales, Porlamar 6301):**
  - Rattan, Playa El Ángel (Mezzanina Supermercado)
  - C/ Mariño, Plaza Bolívar
  - C/ Igualdad entre Gómez y ... (completar con el cliente; hay 2 sedes más por confirmar)
- **WhatsApp:** https://wa.me/4121952897
- **Logo:** palmera verde sobre círculo blanco con anillo azul; texto "TECHNOMAR"
  ("TECHNO" en verde, "MAR" en azul) y "MARGARITA" debajo en azul con letras espaciadas.
  Ver `assets/logo-referencia.jpg`.
- **Tono actual en Instagram** (ver `assets/perfil-ig-referencia.jpg`):
  - "0% DE INICIAL" con Cashea
  - "Estamos de Aniversario — Sede Centro Plaza"
  - "No Fuimos Los Primeros... PERO NOS LLEGÓ AL MEJOR PRECIO — IPHONE 18 PRO MAX"
  - "SECCIÓN DE PREGUNTAS CON EL JEFE"
  - Destacados: CLIENTES, UBICACIÓN, CONTACTO, MÉTODOS DE PAGO

## 2. Objetivo

Construir la **página de entrada tipo e-commerce** de Technomar: user friendly,
súper cool y emocional, centrada en **promociones**. Es la carta de presentación
para prospectar al cliente — tiene que verse tan bien que quiera comprarla.

## 3. Secciones funcionales (qué debe tener la página)

1. **Hero** — marca + la promo más fuerte del momento (ej. "0% de inicial con
   Cashea" o "el mejor precio garantizado"). CTA principal a WhatsApp.
2. **Promociones destacadas** — cards de productos en oferta con foto, precio
   antes/después, etiqueta de descuento y botón "Pedir por WhatsApp".
3. **Categorías** — Teléfonos, Gamer, Carros, Salud, Accesorios. Cada una con
   su bloque visual; al tocarla filtra el catálogo.
4. **Catálogo centralizado** — todos los productos en un solo lugar (grilla con
   buscador), aunque el stock físico esté repartido entre las 5 sucursales.
5. **Flujo de pedido (v1 simulado)** — botón "Pedir" en cada producto que abre
   un mini-formulario (producto, cantidad, nombre, zona del cliente) y genera el
   mensaje de WhatsApp ya armado. ADEMÁS: simular en pantalla la **notificación
   interna** que recibiría el equipo — un panel/aviso que muestre **en qué
   sucursal hay disponibilidad del producto** y **dónde está el cliente final**,
   para coordinar entrega o retiro. En esta v1 todo es front (datos mock en un
   JSON local); el backend real viene en fase 2.
6. **Sedes** — las 5 sucursales con dirección y botón de WhatsApp / "cómo llegar".
7. **Prueba social** — 48.9k seguidores, fotos de clientes, aniversario,
   "preguntas con el jefe".
8. **Métodos de pago** — Cashea (0% inicial), y los que indique el cliente.
9. **CTA final + footer** — WhatsApp grande, Instagram, horarios.

## 4. Diseño

- **Paleta del logo:** verde palmera + azul (anillo) sobre blanco; fondo claro,
  acentos caribeños. Nada de tienda genérica oscura.
- **Emoción:** que se sienta Margarita — playa, palmera, cercanía. Tono joven,
  directo, de oferta real ("al mejor precio").
- **Mobile-first:** la mayoría entra desde Instagram en el teléfono.
- Tipografía moderna y legible; animaciones suaves, sin exceso.

## 5. Reglas técnicas (obligatorias)

- Sitio **100% estático**: HTML + CSS + JS. **PROHIBIDO** crear o usar APIs,
  backends, keys o servicios externos.
- Datos de productos y stock en un **JSON local** (`data/productos.json`) fácil
  de editar.
- **NO desplegar en Vercel** ni configurar dominios. Solo código en el repo.
- Imágenes de referencia en `assets/` — úsalas como guía visual, no las
  publiques tal cual si se ven pixeladas; reinterpreta el logo con CSS/SVG si
  hace falta.

## 6. Al terminar

Entrégame un **reporte de validación**: lista de qué pedí vs qué hiciste,
sección por sección, y qué quedó pendiente o mockeado para fase 2. Sin
inventar funciones que no existen en el código.
