# Instrucciones del Proyecto: Clon Streaming Música (MVP)

## Folder map
El proyecto se divide en dos componentes principales:
*   `backend/`: Contiene la API RESTful (FastAPI) y la configuración de la base de datos (SQLite).
*   `frontend/`: Contiene la interfaz de usuario (HTML/CSS/JS Vanilla). No se utilizan frameworks de frontend ni pasos de build.
*   `docs/`: Documentación del proyecto y el archivo `plan.md`.

## Inicialización de Contexto Obligatoria (Standard Operating Procedure)
Antes de empezar a planificar, responder o escribir código en cualquier sesión nueva, DEBES usar tu herramienta de lectura para ingerir el contexto completo del proyecto. 
Es obligatorio que leas estos archivos:
1. Las reglas de backend: `.claude/rules/api.md`
2. Las reglas de frontend: `.claude/rules/frontend.md`
3. El plan arquitectónico: `docs/plan.md`
4. La bitácora de estado: `docs/memory.md`

Bajo ninguna circunstancia asumas que ya conoces estas reglas. Léelas explícitamente en cada nueva tarea antes de proceder.

## Convenciones de Backend (FastAPI)
*   **Lenguaje:** Python 3.11+. 
*   **Base de datos:** SQLite con SQLModel. El archivo de la DB se llamará `music.db` y debe ubicarse relativo al paquete (sin usar `.env` por el momento).
*   **Arquitectura de red:** El archivo `backend/main.py` debe montar los archivos estáticos del frontend (`StaticFiles`) en la raíz `/` *después* de incluir los routers de la API en el path `/api`. Esto permite que un solo proceso sirva la API y el Frontend sin problemas de CORS.
*   **Validación:** Uso estricto de Pydantic y Type hints obligatorios en todas las funciones.

## Convenciones de Frontend (Vanilla JS)
*   **Arquitectura:** Interfaz basada en una "Shell" simple. El reproductor (etiqueta `<audio>`) debe ser persistente y no cortarse. Las actualizaciones de catálogo o vistas se hacen dinámicamente inyectando HTML o actualizando el DOM mediante llamadas `fetch` a la `/api`.
*   **Librerías:** Prohibido el uso de React, Vue o similares. Todo debe ser Vanilla JS con ES Modules.
*   **Gestión de Audio:** Los archivos `.mp3` no se guardan en la base de datos. Se sirven estáticamente desde el backend, y la base de datos solo almacena el *path* (la ruta) hacia ese archivo.

## Gestión de Memoria (Memory.md)
* Al comenzar cualquier tarea nueva, debes leer obligatoriamente el archivo `docs/memory.md` para entender el contexto actual del proyecto y dónde nos quedamos.
* Al finalizar un hito importante, antes de pedirme aprobación para terminar, debes sobreescribir `docs/memory.md` resumiendo: 1) Qué se logró, 2) Qué decisiones técnicas tomamos, y 3) Cuál es el próximo paso lógico según el `plan.md`.

## Límites Generales (Guardrails)
*   Ningún archivo debe superar las 300 líneas.
*   Ninguna función debe superar las 50 líneas. Si una función crece más de eso, se deben extraer funciones auxiliares (helpers).
*   Todo proceso asíncrono (como cargar la lista de canciones o guardar un "like") debe tener un estado de "Cargando..." visible y manejo de errores explícito en la UI.