/**
 * API client wrapper for the music streaming platform.
 */

const API_BASE = '/api';

/**
 * Fetches all songs from the backend.
 * @returns {Promise<Array>} List of songs
 */
export async function fetchSongs() {
    const response = await fetch(`${API_BASE}/songs`);
    if (!response.ok) {
        throw new Error(`Error al cargar las canciones: ${response.statusText}`);
    }
    return await response.json();
}

/**
 * Sends a like for a specific song with a nickname.
 * @param {number} songId 
 * @param {string} nickname 
 * @returns {Promise<Object>} The registered Like details
 */
export async function likeSong(songId, nickname) {
    const response = await fetch(`${API_BASE}/songs/${songId}/like`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ player_nickname: nickname }),
    });
    if (!response.ok) {
        let errMsg = `Error al registrar el Me gusta: ${response.statusText}`;
        try {
            const errData = await response.json();
            if (errData && errData.detail) {
                errMsg = errData.detail;
            }
        } catch (_) {
            // Ignore parse failure and use default error message
        }
        throw new Error(errMsg);
    }
    return await response.json();
}
