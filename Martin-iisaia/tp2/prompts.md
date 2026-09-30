# Prompts — TP 2

El registro del proceso, en orden. Tres prompts en una sola conversación simulando la interacción con la IA.

---

## 1 — Prompt inicial

```
Necesito un openapi.yaml (3.1) para una API de playlists y canciones, estilo Spotify.

recursos:
  Playlist  { id, name, description? }
  Song      { id, title, artist, duration_ms?, playlist_id }

endpoints:
  GET    /playlists                      → 200 lista
  POST   /playlists                      → 201 / 400 si falta name
  GET    /playlists/{playlistId}/songs   → 200 lista / 404 si la playlist no existe
  POST   /playlists/{playlistId}/songs   → 201 / 400 si falta title o artist / 404 si la playlist no existe

Regla clave: Los schemas de entrada y de salida deben ser distintos. El schema de salida incluye el 'id' generado por el servidor, pero el de entrada no debe pedirlo.
```

**Qué buscaba:** Definir la estructura base de los cuatro endpoints iniciales y forzar la separación de schemas (Input vs Output) para evitar que el cliente deba enviar IDs autogenerados.

---

## 2 — Agregar el borrado de canciones

```
Agregá un endpoint DELETE /playlists/{playlistId}/songs/{songId}. Debe devolver un código 204 sin cuerpo si se borró con éxito, y 404 si la canción o la playlist no existen. No modifiques el resto del archivo.
```

**Qué buscaba:** Añadir la funcionalidad de eliminar un recurso dependiente. Pedí específicamente el `204` para asegurar que el servidor no devuelva un objeto que acaba de ser eliminado de la base de datos, manteniendo la coherencia semántica.

---

## 3 — Corregir la redundancia en el body

```
En el schema SongInput sacá el campo 'playlist_id'. El ID de la playlist ya viaja en el path de la URL (/playlists/{playlistId}/songs), por lo tanto no tiene sentido que el usuario lo vuelva a enviar en el body del JSON.
```

**Qué buscaba:** Enmendar un error de diseño (que dejé pasar en el prompt 1). Al igual que en el caso de proyectos y tareas, pedir el `playlist_id` en el body cuando ya está en la URL genera ambigüedad. Este prompt limpia el schema de entrada.
