// Wrappers de fetch hacia /api con errores normalizados.

export class ApiError extends Error {
    constructor(status, message) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

async function parseDetail(res) {
    try {
        const body = await res.json();
        if (typeof body.detail === 'string') return body.detail;
        if (Array.isArray(body.detail)) return body.detail.map((d) => d.msg).join('; ');
    } catch {
        // Cuerpo no JSON: usamos el texto genérico.
    }
    return `Error ${res.status}`;
}

async function request(path, options = {}) {
    let res;
    try {
        res = await fetch(`/api${path}`, {
            headers: { 'Content-Type': 'application/json' },
            ...options,
        });
    } catch {
        throw new ApiError(0, 'No se pudo conectar con el servidor');
    }
    if (!res.ok) throw new ApiError(res.status, await parseDetail(res));
    return res.json();
}

export function getSongs() {
    return request('/songs');
}

export function likeSong(songId, nickname) {
    return request(`/songs/${songId}/like`, {
        method: 'POST',
        body: JSON.stringify({ nickname }),
    });
}
