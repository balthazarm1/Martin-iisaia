---
paths:
  - "backend/**/*.py"
---

# Reglas de Desarrollo para la API (FastAPI)

- **Modelos y Esquemas:** Separa estrictamente los modelos de base de datos (SQLModel) de los esquemas de respuesta. Todos los endpoints deben definir un `response_model` explícito usando Pydantic. No devuelvas objetos de base de datos crudos.
- **Manejo de Errores:** Si un recurso no existe (ej. un ID de canción inválido), no devuelvas listas vacías. Levanta un `HTTPException` con status 404.
- **Rutas:** Utiliza `APIRouter` para separar los endpoints (ej. un router para canciones, otro para likes) en lugar de meter todo en `main.py`.
- **Inyección de Dependencias:** Usa dependencias (`Depends`) para obtener la sesión de la base de datos de SQLite en los endpoints, asegurando que la conexión se cierre correctamente al terminar la petición.