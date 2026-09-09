# TP 1 — Steam Guard: Teclado Mecánico Defectuoso (Bad UI)

**Autor:** Ing. Balthazar Martín

Una simulacion de la pantalla de inicio de sesión de Steam Guard que implementa una interfaz hostil, simulando desperfectos de hardware a nivel de software.

## Como se ejecuta?

Doble clic en `index.html`. Archivo autocontenido, sin dependencias.

## Que me propuse construir

El mandato era construir una *bad UI* técnica y operativa. En lugar de ir por el camino de la simulación visual (como el tablero de Galton del ejemplo de clase), opté por un enfoque puro de **arquitectura de estados y manipulación de eventos asíncronos** disfrazado con la estética de Steam.

Construí un teclado numérico que frustra al usuario simulando switches mecánicos rotos, justo cuando más urgencia tiene (iniciar sesión en su cuenta de juegos):
1.  **Actuacion pesada (Teclas 1, 4, 7):** Ignoran el evento `click`. Exigen evaluar el delta de tiempo entre `mousedown` y `mouseup`. Si se suelta antes de los 800ms, no registra. Si te pasas de los 1200ms, escribe doble.
2.  **Key Chatter / Rebote (Teclas 2, 5, 8):** Un clic normal tiene un 40% de probabilidad de disparar un input secundario diferido (`setTimeout`), simulando contactos sucios.
3.  **Falso contacto en el borrado:** El botón `DEL` ignora los clics simples; exige usar el evento `dblclick` (doble clic rápido) para funcionar, lo cual es totalmente antinatural en una pantalla tactil o en un teclado con ratón.

## Decisiones que tome yo

**Separacion de responsabilidades logicas:** Reemplacé el atributo estándar `onclick` en el HTML por un sistema de *EventListeners* tipificados mediante clases CSS (`.key-heavy`, `.key-chatter`). Esto me permitió inyectar máquinas de estado específicas a diferentes grupos de botones desde JavaScript manteniendo el HTML limpio.

**Contraste estético vs operativo:** Mantuve un diseño visual corporativo, oscuro y limpio (clon de Steam). El usuario asume que la interfaz es robusta, lo que magnifica la frustración cuando nota que los botones no responden a sus comandos habituales.

## Que salio bien en el proceso?

La especificación de requerimientos de eventos. Guiar a la IA para que evalue deltas de tiempo en lugar de clics normales fue fundamental. El modelo estructuro perfectamente la captura del `Date.now()` para la regla de los 800ms sin pisar variables globales entre teclas.