# Memoria del proyecto — IndieStream

_Última actualización: 2026-10-04 · branch `feat/indiestream`_

## 1. Qué se logró

Se completaron los pasos 0–9 de `docs/plan.md`.
- **Scaffolding.** Se borró el MVP viejo, se creó `pyproject.toml` con `uv` y se corrigió el frontmatter de `.claude/rules/*.md`.
- **Backend.** `config.py`, `db.py`, `models.py`, `schemas.py`, `seed.py`, `routers/songs.py`, `routers/likes.py` y `main.py`.
- **Frontend.** `index.html` (la Shell), `css/styles.css` y los módulos `js/main.js`, `api.js`, `ui.js`, `nickname.js`, `player.js` y `views/catalog.js`.
- **Verificación de la API con curl.** Pasaron 200, 404, 201, 409, 422 y el 404 sobre el like. El seed es idempotente y los audios se sirven con el MIME correcto.
- **Verificación visual.** Una captura con Edge headless muestra el catálogo renderizado.
- **Guardrails.** Ningún archivo pasa de 136 líneas ni ninguna función de 25.

## 2. Decisiones técnicas

- Las rutas son absolutas con `pathlib` (`backend/config.py`), así el servidor no depende del cwd.
- La DB guarda `audio_path` y la API lo expone como `audio_url`.
- El like duplicado se detecta con `UniqueConstraint` + `IntegrityError` y devuelve 409. El nickname se normaliza con `strip()` y regex `^[\w\- ]+$`.
- `POST /like` devuelve `likes_count` para que el frontend no tenga que volver a pedir el catálogo.
- En el frontend, todo texto del servidor se inserta con `textContent` (helper `el()`), nunca con `innerHTML`.
- El catálogo usa delegación de eventos (`data-action`/`data-id`). `player.js` emite `player:change` y el catálogo resalta la tarjeta activa.
- Audios: solo `track1.mp3` y `track2.wav` del commit viejo eran reales; los demás eran placeholders de texto. `track3.wav` es un arpegio sintético generado con la stdlib de Python.

## 3. Próximo paso lógico

- Probar a mano en el navegador: reproducir, dar like sin cortar el audio, like repetido y servidor apagado → Reintentar.
- Completar en el README las secciones "Cómo gestioné el contexto" y "Qué salió mal".
- Pushear `feat/indiestream` y abrir el PR a `main`.
- Posibles mejoras después: más vistas (artista, búsqueda) o tests automáticos con `TestClient`.
