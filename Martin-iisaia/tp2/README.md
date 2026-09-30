# TP 2 — API de Playlists y Canciones

Este repositorio contiene un `openapi.yaml` que describe una API orientada a recursos, inspirada en plataformas como Spotify. La API gestiona Playlists y las Canciones que pertenecen a ellas. Consta de cinco endpoints repartidos en tres paths.

## Cómo visualizarlo

Para leer el contrato y probar la interfaz interactiva, copia el contenido de `openapi.yaml` y pégalo en [editor.swagger.io](https://editor.swagger.io). 

## Qué me propuse construir

Elegí el dominio de "Playlists y Canciones" porque refleja una relación de pertenencia muy clara y común en el mundo real. En el contexto de esta API (que gestiona el armado de listas), una canción agregada debe pertenecer a una lista. Esto justifica arquitectónicamente el anidamiento de los endpoints.

## Decisiones que tomé

*   **Jerarquía de rutas:** Opté por anidar `/songs` dentro de `/playlists/{playlistId}` en lugar de usar una ruta plana como `/songs?playlist=X`. La razón es que, desde la perspectiva de crear y gestionar listas de reproducción, las canciones están subordinadas a la lista a la que se agregan. Si elimino una playlist, las canciones asociadas (en esa lista específica) también desaparecen.
*   **Separación de schemas (Entrada vs. Salida):** Creé schemas distintos (`Song` vs `SongInput` y `Playlist` vs `PlaylistInput`). Esto es fundamental porque el cliente no debe (ni puede) enviar un `id` o un `playlist_id` al momento de hacer un `POST`; esos datos los gestiona y devuelve el backend.
*   **Uso del código 204 para DELETE:** Cuando se elimina una canción de la lista, el servidor devuelve un `204 No Content`. Si el recurso ya no existe, devolver un `200` con el JSON de la canción borrada sería incoherente.
*   **Manejo de errores lógicos (404 y 400):** Si se intenta consultar las canciones de una playlist que no existe, se devuelve `404 Not Found` en lugar de una lista vacía `[]`, porque una lista vacía implicaría falsamente que la playlist sí existe.

## Qué salió mal y cómo lo corregí

Durante el diseño inicial, modelé el recurso `Song` con el campo `playlist_id`. Por inercia, la inteligencia artificial incluyó ese mismo campo en el `SongInput`. Esto provocaba una contradicción de diseño: para agregar una canción, el cliente debía pasar el ID de la playlist en la URL (ej. `/playlists/5/songs`) y también en el cuerpo de la solicitud JSON. 

¿Qué pasaría si la URL dice playlist 5 pero el body dice playlist 8? Para evitar delegarle esa resolución al backend de manera silenciosa y propensa a errores, corregí el contrato en el último prompt, eliminando `playlist_id` de `SongInput`. La regla aplicada fue: **lo que ya identifica el path, no viaja en el body.**
