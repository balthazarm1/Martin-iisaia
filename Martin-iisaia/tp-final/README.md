# Trabajo Práctico Final — IndieStream

La aplicación completa: interfaz, servidor y datos que persisten. Se presenta y se defiende en la última clase.


## Cómo se ejecuta

Requisitos: [uv](https://docs.astral.sh/uv/) (instala Python 3.11+ si hace falta). No hay variables de entorno.

```bash
cd tp-final
uv sync
uv run fastapi dev backend/main.py
```

Abrir <http://localhost:8000>. La documentación interactiva de la API está en <http://localhost:8000/docs>.
La base `backend/music.db` se crea sola al arrancar, con 3 canciones de prueba. Para empezar de cero alcanza con borrarla.

## Arquitectura

Un solo proceso FastAPI sirve la API, los audios y el frontend, así que no hay CORS.

```text
Navegador ── GET /            → frontend/ (StaticFiles, index.html = Shell)
          ── GET /api/...     → routers (songs, likes) → SQLite (SQLModel)
          ── GET /static/...  → backend/static/audio/*.mp3|wav
```

**Datos**
- `Song`: `id`, `title`, `artist`, `audio_path` (solo la ruta, el archivo vive en disco), `duration_s`.
- `Like`: `id`, `song_id` (FK), `nickname`, `created_at`. Hay una restricción única sobre `(song_id, nickname)`.

**Contrato API**

| Method | Path | Body | Respuestas |
|---|---|---|---|
| GET | `/api/songs` | — | 200 `SongOut[]` |
| GET | `/api/songs/{id}` | — | 200 `SongOut` · 404 |
| POST | `/api/songs/{id}/like` | `{"nickname": "juan"}` | 201 `LikeOut` · 404 · 409 (like repetido) · 422 |

`SongOut = {id, title, artist, audio_url, likes_count}` y `LikeOut = {id, song_id, nickname, created_at, likes_count}`. Los errores siempre vienen como `{"detail": "..."}`.

**Frontend (Vanilla JS, ES Modules, sin build)**
- `index.html` es la Shell. El `<audio>` vive en la barra inferior y nunca se recrea.
- `js/player.js` es el único módulo que toca el `<audio>`. Avisa los cambios con el evento `player:change`.
- `js/views/catalog.js` renderiza el catálogo por DOM después del `fetch`. Muestra "Cargando...", tiene reintento y marca la tarjeta que está sonando.
- `js/api.js` normaliza los errores en `ApiError(status, message)`. `js/ui.js` tiene los helpers de DOM y el banner de errores.
- `js/search.js` es un módulo puro (sin DOM ni `fetch`) con la lógica de coincidencia del buscador. Está aislado a propósito: es el único punto que cambia si el filtrado se muda al backend.

## Verificación

### API

Con el servidor levantado, `GET /api/songs` devuelve las 3 canciones del seed con `likes_count: 0`; `GET /api/songs/999` devuelve 404; `POST /api/songs/1/like` con un nickname nuevo devuelve 201 y el total actualizado, repetido devuelve 409, y con `{"nickname": ""}` devuelve 422. Reiniciar el servidor no duplica el seed.

### Buscador del catálogo

Filtrado local: la barra filtra la lista que ya devolvió `GET /api/songs`, sin pedirle nada al servidor. Con el seed por defecto:

| # | Paso | Esperado |
|---|---|---|
| 1 | Tipear `tranvias` | Aparece *Garage Session #2* — acentos normalizados |
| 2 | Tipear `LUNA` | Aparece *Maqueta Nocturna* — mayúsculas ignoradas |
| 3 | Tipear `do` | Solo *Arpegio en Do* — subcadena, no prefijo |
| 4 | Tipear `zzz` | Mensaje de sin coincidencias y botón Limpiar |
| 5 | Reproducir track 1 y buscar `arpegio` | La música **no** se corta; la barra inferior sigue mostrando *Maqueta Nocturna* |
| 6 | Dar like, luego tipear y borrar | El botón sigue en *♥ Te gusta* deshabilitado y el contador conserva el valor nuevo |
| 7 | Apagar el servidor, pulsar Reintentar, volver a levantarlo | El texto tecleado sigue en el input |
| 8 | DevTools ▸ Network mientras se tipea | **Cero requests** y cero navegaciones de documento |
| 9 | Tipear rápido | El cursor nunca se pierde |

Limpiar la búsqueda: tecla <kbd>Esc</kbd> o la ✕ nativa del campo.

Tres espacios en blanco cuentan como búsqueda vacía: se muestran las 3 canciones, no el estado de sin coincidencias.

Nota: Los pasos de esta tabla fueron validados exitosamente de forma automatizada (E2E) delegando el control del navegador a un agente de IA mediante el protocolo Playwright MCP.

## Qué decidí yo

- **Shell con reproductor persistente.** La página nunca se recarga y la música no se corta.
- **Una sola vista (catálogo)** para el MVP.
- **Identidad liviana:** un nickname en `localStorage`, sin login. Se permite un like por canción y nickname, y el repetido devuelve 409.
- **Sin upload:** los audios se cargan con un seed idempotente y la DB solo guarda el path.
- **Arranque desde cero:** el MVP anterior (commit `8a69c08`) se descartó y quedó como referencia.

## Cómo gestioné el contexto

En lugar de depender únicamente de la memoria temporal del chat, el proyecto se desarrolló utilizando un flujo arquitectónico estricto basado en artefactos de disco.

Para evitar que el agente perdiera el hilo entre sesiones (especialmente durante cortes por límite de uso), documenté las decisiones y el progreso de forma iterativa:

1. **Especificaciones Previas:** Antes de codificar el buscador, se forzó al agente a generar documentos de diseño (`docs/superpowers/`) definiendo el comportamiento (filtrado en cliente sin *debounce*) y los módulos afectados (aislando `search.js` del DOM).
2. **Memoria Viva:** Se mantuvo un archivo `docs/memory.md` que servía como punto de restauración. Al iniciar una nueva sesión, el agente solo debía leer este archivo para entender el estado actual del MVP y qué faltaba por implementar.
3. **Validación E2E (MCP):** Para cerrar el proyecto sin saturar el contexto con HTML renderizado manualmente, se integró el protocolo MCP instalando un servidor local de Playwright. Esto permitió que el agente navegara, inyectara eventos y validara el DOM de forma autónoma, sin tener que "explicarle" el código de nuevo.

## Qué salió mal

El desarrollo de la *feature* del buscador presentó tres desvíos importantes que requirieron corrección estructural:

1. **Pérdida de foco en el input:** Al inicio, el renderizado del catálogo recreaba todo el DOM al filtrar, lo que provocaba que el usuario perdiera el cursor mientras tipeaba. Esto se corrigió separando la vista en un esqueleto estático y un contenedor (`<section class="catalog-grid">`) que se actualiza sin destruir el input.
2. **Estado local vs. DOM:** El estado de los "Likes" vivía únicamente en la vista HTML. Al filtrar y volver a renderizar las tarjetas, los botones de *like* volvían a su estado original deshabilitando los likes dados por el usuario. La solución fue promover `likedIds` a una variable de estado en memoria.
3. **El desafío del MCP y los binarios:** Al intentar correr la suite de Playwright MCP, la automatización falló porque Google Chrome no estaba instalado y `npx playwright install chrome` fue bloqueado por falta de permisos de administrador. Para no detener la validación, el agente logró readaptar su propia configuración, aisló un script temporal de prueba y ejecutó toda la validación *headless* utilizando el motor de Microsoft Edge ya disponible en el sistema.

---


