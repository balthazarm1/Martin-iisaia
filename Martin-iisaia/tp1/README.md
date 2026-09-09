# TP 1 — Captcha de máquina de Galton

**Autor:** Ing. Balthazar Martín

Un formulario de recuperación de cuenta de Steam donde, justo antes de enviarte el mail, te interrumpe una "Verificación biométrica" basada en una máquina de Galton. Funciona bien y es intencionalmente frustrante.

## Como se ejecuta

Doble click en `index.html`, es un solo archivo sin dependencias externas.

## Que me propuse construir

Una *bad UI* que interrumpa una tarea de urgencia (recuperar una cuenta de juegos) y que frustre por diseño matemático. Para hacerlo más "cruel" le di al usuario una falsa sensacion de control pero dejé que la distribución binomial haga el trabajo de amontonar las probabilidades en el centro.

## Decisiones arquitectonicas

**SVG como sistema de coordenadas.** La restricción era no usar `<canvas>` para que el estado no quedara oculto. En lugar de ensuciar el DOM posicionando muchos `<div>` con CSS absoluto, force al modelo a utilizar un sistema geométrico vectorial (SVG). De esta forma, el codigo es mas limpio y se puede abrir el inspector para ver commo los atributos `cx` y `cy` de la bola cambian en tiempo real.

**Agencia ilusoria (Slider).** A diferencia de un Galton estático, le agregué un `<input type="range">` que permite elegir desde dónde soltar la bola (izquierda, centro, derecha). Le da al usuario la ilusión de que puede apuntar a los bordes (donde la probabilidad es de apenas 6.25%), pero la máquina igual tiende a centrar la bola 

**El error no perdona.** Si fallás las 3 letras objetivo, no hay botón para "Borrar último". El sistema asume que falló la biometría, borra tu progreso y cambia el objetivo. Te castiga reiniciando el ciclo.

## Qué salio bien en el proceso

La especificación de requerimientos. En lugar de pedir "dibujá un tablero", le exigí al modelo "precisión matemática y limpieza de código" para evitar que usara `divs`. El modelo dedujo correctamente que la mejor arquitectura para eso era SVG.

Las reglas defensivas funcionaron bien: al especificar en el prompt que el slider de posición debía deshabilitarse mientras el estado `cayendo` fuera *true*, evité un bug crítico donde el usuario podría desfasar el cálculo lógico de las coordenadas visuales en pleno vuelo.