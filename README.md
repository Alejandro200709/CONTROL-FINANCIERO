# Mi Control Financiero — GitHub Pages

Versión preparada para publicarse directamente con GitHub Pages.

## Privacidad

El repositorio contiene únicamente el código de la aplicación.
Los importes personales se cargan en el primer inicio y se guardan en `localStorage`
del navegador del dispositivo. No hay salario, ahorro ni cuotas personales escritos
en el código fuente de esta versión.

## Publicar

1. Crear un repositorio en GitHub.
2. Subir todos los archivos de esta carpeta a la raíz.
3. En GitHub abrir: Settings → Pages.
4. En Build and deployment elegir: Deploy from a branch.
5. Branch: `main`.
6. Folder: `/ (root)`.
7. Guardar.
8. Abrir la URL que GitHub Pages muestre.

## iPhone

1. Abrir la URL de GitHub Pages con Safari.
2. Compartir.
3. Agregar a Inicio.
4. Activar “Abrir como app web”.
5. Agregar.

## Primer inicio

La app pedirá:
- ahorro acumulado inicial;
- cantidad de meses objetivo para el fondo de emergencia.

Después cargá desde la pestaña `Cargar`:
- salario;
- Gourmet;
- gastos fijos;
- gastos variables;
- ahorros;
- inversiones.

La meta del fondo de emergencia se calcula a partir de los gastos marcados como `Fijo`
que registres en el mes.

## Respaldo

Usá Más → Exportar respaldo para descargar periódicamente un archivo JSON.


## Lógica del ahorro líquido

La tarjeta **Ahorro acumulado** funciona como un saldo vivo:

- parte del ahorro inicial informado;
- los ingresos en efectivo posteriores a la fecha de corte **suman**;
- los gastos en efectivo posteriores a la fecha de corte **restan**;
- las inversiones posteriores a la fecha de corte **restan del ahorro líquido**;
- movimientos con cuenta `Gourmet` no modifican el ahorro líquido;
- los movimientos tipo `Ahorro` sirven para medir cuánto decidiste reservar, pero no se suman de nuevo al saldo líquido para evitar duplicaciones.

Ejemplo:
- saldo inicial: Gs. 3.000.000;
- cobrás Gs. 800.000 después de la fecha de corte → saldo: Gs. 3.800.000;
- gastás Gs. 120.000 → saldo: Gs. 3.680.000.

Los movimientos con fecha igual o anterior a la fecha de corte se consideran ya incluidos en el saldo inicial.
