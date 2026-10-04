paths:
  - "frontend/**/*.js"
  - "frontend/**/*.html"

# Reglas de Desarrollo para el Frontend (Vanilla JS)

- **Arquitectura sin recargas:** Para garantizar que el reproductor de música no se interrumpa, está **estrictamente prohibido** recargar la página completa (`location.reload()` o enlaces `<a href="...">` tradicionales que cambien el documento). 
- **Navegación y Datos:** Toda la actualización de vistas (ej. ver el catálogo de canciones) debe hacerse manipulando el DOM dinámicamente tras hacer peticiones `fetch` asíncronas a la `/api`.
- **Reproductor de Audio:** Utiliza únicamente la API nativa de la etiqueta `<audio>` de HTML5 para controlar la reproducción (play, pause, source). No instales librerías de terceros para el audio.
- **Experiencia de Usuario (UX):** Todo botón que desencadene una acción asíncrona (como dar un "Like" o cargar el catálogo) debe reflejar un estado visual de "Cargando..." y manejar los errores de red mostrando un mensaje claro en la pantalla mediante un `try/catch`.