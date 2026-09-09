
# Prompts — TP 1

El registro del proceso de construccion. Todo el desarrollo se hizo en una sola conversacion, enfocando el esfuerzo en la arquitectura (SVG) y las reglas defensivas de estado

---

## 1 — Prompt inicial: Estructura, Escenario y Arquitectura

```text
Construi un captcha de verificacion basado en una maquina de Galton. 

Estructura:
Envolve el captcha en una pagina de "Recuperación de cuenta de Steam". 
- <header> con el título "Steam - Recuperación de cuenta".
- <main> dividido en dos pasos controlados por un estado `paso` ("formulario" y "captcha").
- Paso "formulario": Pide nombre de cuenta y mail, con un boton "Buscar cuenta". Al hacer click, pasa al paso "captcha".
- Paso "captcha": Muestra un texto con un objetivo de 3 letras al azar. Abajo, el tablero de Galton: un triángulo de pegs de 4 filas (1, 2, 3 y 4 pegs) y, debajo, una fila de 5 canaletas fijas (letras A a E). Debajo de cada letra, escribí su probabilidad en porcentaje (6.25%, 25%, 37.5%, 25%, 6.25%).
- <footer> (solo visible en el captcha): Muestra las letras ingresadas hasta el momento y un <button> "Soltar bola". 

Estilo:
- Estetica clon de Steam: fondo dark mode (#1b2838), texto gris claro (#c7d5e0), botones color azul Steam (#66c0f4) sin bordes, tipografía sans-serif limpia. 
- Los pegs son círculos pequeños grises. La bola es un círculo de color verde brillante (como el de los descuentos de Steam).

Comportamiento:
- Estado: objetivo (3 letras), ingresados (array de letras, máximo 3), cayendo (booleano).
- Click en "Soltar bola": si cayendo es false, arranca la caída. La bola aparece en el peg superior y baja fila por fila. En cada fila decide 50/50 izquierda o derecha. Cada paso dura 200ms. Cae en la canaleta correspondiente y suma la letra a "ingresados". Mientras cae, los clicks se bloquean.
- Si ingresados llega a 3 letras: compara con el objetivo. Si falla, el tablero se limpia, el objetivo cambia y arranca de cero (sin botón de borrar). Si acierta, muestra un mensaje de "Enlace de recuperación enviado".

Constraints:
- Un solo archivo HTML con CSS y JS integrados. Vanilla JS, sin dependencias.
- Prohibido usar <canvas>. Necesito que las coordenadas de la bola y el estado general sean 100% auditables en tiempo real desde el inspector del DOM.
- Considerá que el tablero es un sistema geométrico. Utilizá la tecnología nativa web que te permita dibujar y animar estas formas con la mayor precisión matemática y limpieza de codigo posible, evitando enmascarar la lógica detrás de un HTML lleno de etiquetas redundantes.

```

**Qué intentaba lograr:** Establecer el esqueleto completo en una sola pasada. Al forzar la restricción de "precisión matemática y limpieza" junto con la prohibición de `<canvas>`, estaba empujando a la IA a que tomara la decisión arquitectónica de usar SVG por su cuenta, sin pedírselo explícitamente.

**Qué devolvió:** El codigo funcionó al primera. El modelo implementó todo el tablero dentro de una etiqueta `<svg>`, separando impecablemente la lógica de estado en JS de la representación geométrica de los vectores.

---

## 2 — Iterar sobre el estado: La agencia del usuario

```text
Agregale al captcha un control para cambiar el punto de inicio de la bola, dandole agencia al usuario antes de soltarla.

Estructura y Comportamiento:
- Añadi un estado `posicionInicio` que arranque en el centro (valor 0).
- Arriba del tablero SVG, agregá un `<input type="range">` que tenga 3 posiciones discretas (por ejemplo: -1 izquierda, 0 centro, 1 derecha).
- Al mover el slider, la posicion visual de la bola en reposo (su coordenada `cx` en el SVG) debe desplazarse instantáneamente para alinearse con ese nuevo punto de partida.
- Al hacer clic en "Soltar bola", la lógica de caida y el cálculo de colisiones deben arrancar desde esa `posicionInicio`, respetando la distribucion hacia abajo.

Regla defensiva:
- Mientras el estado `cayendo` sea true, el slider DEBE estar deshabilitado (`disabled`). Esto es para evitar que el usuario cambie el punto de origen con la bola en el aire, lo que desfasaría el cálculo lógico de la posición visual en el SVG.

```

**Qué intentaba lograr:** Darle al usuario la falsa sensación de que puede engañar a la máquina apuntando a los bordes.

**Por qué está escrito así:** Si le pedía "agregá un control para mover la bola" de forma genérica, el modelo podía inventar cualquier cosa. Al hablarle directamente del atributo `cx` del SVG y del estado `posicionInicio`, me asegure de que integrara el control a la arquitectura matematica que ya estaba funcionando. La regla defensiva final fue vital para que no se rompiera la sincronización del estado durante la animación.

**Qué devolvió:** El slider integrado correctamente, actualizando la posición de la bola en reposo y bloqueándose correctamente al iniciar la caida.

