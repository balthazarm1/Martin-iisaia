
# Prompts — TP 1

Desarrollo iterativo centrado en la manipulación de eventos del DOM y el manejo asincrono para generar una Bad UI basada en fallas de hardware.

---

## 1 — Prompt inicial: Estructura base y Estética Steam

```text
Construi una interfaz hostil disfrazada de verificacion de Steam Guard.

Estructura:
- Un contenedor central con el título "Steam Guard" y estética dark mode de la app.
- Un texto mostrando un "Código Objetivo" de 4 dígitos (ej: 1528).
- Un display oscuro donde se van a ver puntos ("•") a medida que se ingresen los números.
- Un grid de botones tipo teclado numérico (1-9, DEL, 0, OK).

Estilo:
- Estética clon de Steam: fondo dark mode (#1b2838), contenedores (#171a21), texto gris claro (#c7d5e0), botón OK con el degradado azul clásico de Steam (#66c0f4). 
- Tiene que parecer la interfaz real de inicio de sesión, contrastando con el comportamiento roto que tendrá después.

Comportamiento Base:
- Estado `ingresado` (string, max 4 caracteres).
- Todos los números agregan un dígito al display.
- El botón OK compara el ingresado con el objetivo. Si falla, borra todo y tira un error en rojo. Si acierta, da éxito en verde Steam (#a4d007).

Constraints:
- Un solo archivo HTML. Vanilla JS puro. 
- No uses `onclick` en el HTML. Todo el manejo de eventos debe hacerse desde JS seleccionando los elementos del DOM.

```

**Que intentaba lograr:** Armar el esqueleto visual perfecto y el loop de validación basico. Queria asegurarme de que el modelo planteara un HTML limpio, forzandolo a vincular la lógica de JS a posteriori mediante `addEventListener` para facilitar la manipulacion compleja del próximo paso.

---

## 2 — Prompt Avanzado: Las máquinas de estado hostiles

```text
Ahora vamos a romper el teclado modificando los event listeners de JS. Asignale clases específicas a los botones en el HTML para aplicarles las siguientes fallas mecánicas de hardware:

1. Teclas Pesadas (1, 4, 7):
No pueden usar el evento 'click'. Escuchá `mousedown` y `mouseup`. Calculá el tiempo presionado. Si es menor a 800ms, ignorá el evento. Si está entre 800ms y 1200ms, ingresá un dígito. Si es mayor a 1200ms, ingresá el dígito dos veces seguidas.

2. Teclas con Rebote sucio (2, 5, 8):
Al hacer 'click' normal, sumá el digito. Pero agregá un 40% de probabilidad matemática de que, 50ms despues, se dispare un segundo ingreso del mismo dígito, usando setTimeout.

3. Borrado con Falso Contacto (DEL):
Quitale la funcionalidad al evento 'click' normal (solo hacé que el display titile sutilmente bajando la opacidad para amagar). El borrado REAL del último carácter solo debe ocurrir si el usuario acciona el evento `dblclick` nativo del DOM.

```

**Que intentaba lograr:** La verdadera *bad UI*. En lugar de pelear con CSS o mover bolas en pantalla, le pedí al modelo que alterara las bases de interacción del navegador rompiendo los eventos asíncronos.

**Que devolvio:** La lógica asíncrona correcta. Manejo los deltas de `Date.now()` para los tiempos de pulsación sin bloqueos de interfaz y utilizo el `setTimeout` correctamente para simular el rebote del 40%. La interfaz de Steam qued bien por fuera, pero intencionalmente muy malo de operar.

## 3 — Review y Test: Correccion de bug visual

```text
La lógica de los eventos funciona bien, pero en la fase de testeo noté un bug visual grave: al exigir un doble clic rápido en el botón DEL, el navegador selecciona automáticamente el texto del botón y arruina la estética. 

Agregá la propiedad de CSS `user-select: none;` a todos los botones para neutralizar este comportamiento nativo del navegador.