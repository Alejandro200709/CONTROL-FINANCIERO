# Mi Control Financiero — V4

PWA financiera optimizada para iPhone y GitHub Pages.

## Cambios principales
- Sin rangos ni límites artificiales en montos.
- Separadores de miles y decimales mientras cargás.
- Moneda principal configurable.
- PYG, USD, EUR, BRL y ARS por movimiento.
- Tipo de cambio para moneda extranjera.
- Paleta financiera azul carbón + verde esmeralda.
- Modo claro, oscuro y automático.
- Dashboard simplificado.
- Ingresos vs gastos de 6 meses.
- Gasto diario y categorías con barras claras.
- Carga rápida con detalles opcionales.
- Categoría, subcategoría y descripción.
- Gastos fijos y ahorro líquido automático conservados.
- Migración de datos locales de versiones anteriores.

## GitHub Pages
Reemplazá los archivos del repositorio. Conservá Pages en `main` y `/ (root)`.

## iPhone
Safari → Compartir → Agregar a Inicio → Abrir como app web.

## Privacidad
Los movimientos quedan en `localStorage` de Safari y no se publican en GitHub.
Usá Más → Exportar respaldo periódicamente.


## V4.1 — Corrección de caché

Esta revisión agrega versionado explícito a `styles.css`, `app.js` y `manifest.json`
para impedir que GitHub Pages, Safari o un service worker anterior mezclen HTML nuevo
con CSS/JavaScript antiguo.

Al actualizar desde una versión anterior:
1. Reemplazar todos los archivos del repositorio.
2. Esperar a que GitHub Pages finalice el despliegue.
3. Abrir la URL en Safari/Chrome y recargar.
4. La app instalada debería actualizarse al volver a abrirla.
