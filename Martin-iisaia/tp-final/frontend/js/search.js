// Filtrado del catálogo. Módulo puro: sin DOM, sin fetch, sin imports.
// Es la única pieza que cambia cuando el filtrado pase al backend (?q=).

const DIACRITICOS = /\p{Diacritic}/gu;

/**
 * Lleva un texto a su forma comparable: sin espacios al borde, en minúsculas
 * y sin acentos. "Los Tranvías" -> "los tranvias".
 */
export function normalize(text) {
    return String(text ?? '')
        .trim()
        .toLocaleLowerCase('es')
        .normalize('NFD')
        .replace(DIACRITICOS, '');
}

/**
 * True si la consulta aparece en el título o en el artista.
 * Espera `normalizedQuery` YA normalizada: se normaliza una vez por búsqueda,
 * no una vez por canción.
 */
export function songMatches(song, normalizedQuery) {
    return normalize(song.title).includes(normalizedQuery)
        || normalize(song.artist).includes(normalizedQuery);
}

/**
 * Filtra el catálogo. Una query vacía o de solo espacios devuelve la lista
 * original tal cual, sin copiarla.
 */
export function filterSongs(songs, query) {
    const normalizada = normalize(query);
    if (normalizada === '') return songs;
    return songs.filter((song) => songMatches(song, normalizada));
}
