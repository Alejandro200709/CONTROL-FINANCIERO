# Mi Control Financiero — PWA

Aplicación web móvil para registrar ingresos, gastos diarios, ahorro, inversiones y deudas.

## Qué incluye

- Dashboard mensual
- Carga diaria rápida
- Campo “¿En qué fue?” y detalle del gasto
- Filtros y búsqueda
- Resumen por día
- Gráficos de categorías y gasto diario
- Fondo de emergencia
- Control de Gourmet Card
- Deudas activas
- Modo claro, oscuro y automático
- PWA instalable en iPhone
- Exportación / importación de respaldo JSON
- Funciona offline después de la primera carga

## Probar en tu PC

La PWA necesita servirse por HTTP/HTTPS para que el service worker funcione.

Con VS Code podés usar Live Server, o desde la terminal:

```bash
python -m http.server 5500
```

Luego abrí:

http://localhost:5500

## Subir a GitHub

1. Crear un repositorio nuevo.
2. Subir todos los archivos de esta carpeta a la raíz del repositorio.
3. No hace falta compilar nada: es HTML/CSS/JS puro.

## Publicar en Netlify

Opción simple:
1. Entrar a Netlify.
2. Agregar un nuevo sitio desde Git.
3. Conectar GitHub.
4. Elegir el repositorio.
5. Build command: dejar vacío.
6. Publish directory: `.`
7. Deploy.

También podés arrastrar la carpeta completa a Netlify Drop.

## Instalar en iPhone

Una vez publicada por HTTPS:
1. Abrí la URL en Safari.
2. Tocá Compartir.
3. Elegí “Agregar a pantalla de inicio”.
4. Abrila desde el nuevo ícono.

## Importante sobre los datos

Esta versión guarda los datos con `localStorage` en el navegador del dispositivo.
Eso significa que iPhone y PC NO se sincronizan todavía.

Usá “Exportar respaldo” periódicamente.

La siguiente evolución recomendada es conectar una base de datos (por ejemplo, Supabase)
para compartir la misma información entre iPhone y PC con inicio de sesión.
