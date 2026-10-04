import { fetchSongs, likeSong } from './api.js';
import { initPlayer, playSong, getCurrentSongId } from './player.js';

let songsList = [];

// Entry point of the application
document.addEventListener('DOMContentLoaded', () => {
    initPlayer();
    setupNicknameInput();
    loadCatalog();
    
    // Listen to player events to highlight the playing song
    window.addEventListener('songChanged', (e) => {
        highlightPlayingSong(e.detail.songId);
    });
});

/**
 * Restores and automatically saves the player's nickname to/from localStorage.
 */
function setupNicknameInput() {
    const input = document.getElementById('nickname-input');
    if (!input) return;
    
    // Load from localStorage if available
    const savedNickname = localStorage.getItem('player_nickname');
    if (savedNickname) {
        input.value = savedNickname;
    }
    
    // Save to localStorage on change
    input.addEventListener('input', () => {
        localStorage.setItem('player_nickname', input.value.trim());
    });
}

/**
 * Fetches songs list and triggers the UI render with appropriate loading/error state.
 */
async function loadCatalog() {
    const container = document.getElementById('songs-container');
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    
    if (!container || !loadingEl || !errorEl) return;
    
    loadingEl.classList.remove('hidden');
    errorEl.classList.add('hidden');
    container.innerHTML = '';
    
    try {
        songsList = await fetchSongs();
        loadingEl.classList.add('hidden');
        renderSongs(songsList, container);
        
        // Restore playing song highlight if something is playing
        const activeSongId = getCurrentSongId();
        if (activeSongId !== null) {
            highlightPlayingSong(activeSongId);
        }
    } catch (err) {
        loadingEl.classList.add('hidden');
        errorEl.textContent = err.message || 'Error al conectar con el servidor';
        errorEl.classList.remove('hidden');
    }
}

/**
 * Renders the songs list in the DOM container.
 * @param {Array} songs 
 * @param {HTMLElement} container 
 */
function renderSongs(songs, container) {
    if (songs.length === 0) {
        container.innerHTML = '<p class="empty-msg">No hay canciones disponibles.</p>';
        return;
    }
    
    songs.forEach(song => {
        const card = createSongCard(song);
        container.appendChild(card);
    });
}

/**
 * Creates and returns the DOM element card representing a song.
 * @param {Object} song 
 * @returns {HTMLDivElement}
 */
function createSongCard(song) {
    const card = document.createElement('div');
    card.className = 'song-card';
    card.dataset.id = song.id;
    
    card.innerHTML = `
        <div class="song-info">
            <span class="song-title">${escapeHTML(song.title)}</span>
            <span class="song-artist">${escapeHTML(song.artist)}</span>
        </div>
        <div class="song-actions">
            <button class="btn btn-play" data-id="${song.id}">▶ Reproducir</button>
            <button class="btn btn-like" data-id="${song.id}">
                ❤️ <span class="likes-count">${song.likes_count}</span> Me gusta
            </button>
        </div>
    `;
    
    // Play button handler
    card.querySelector('.btn-play').addEventListener('click', () => {
        playSong(song);
    });
    
    // Like button handler
    const likeBtn = card.querySelector('.btn-like');
    likeBtn.addEventListener('click', () => handleLike(song.id, likeBtn));
    
    return card;
}

/**
 * Performs a like operation, displaying loading feedback and locking the button.
 * @param {number} songId 
 * @param {HTMLButtonElement} buttonElement 
 */
async function handleLike(songId, buttonElement) {
    const nicknameInput = document.getElementById('nickname-input');
    const nickname = nicknameInput ? nicknameInput.value.trim() : '';
    
    if (!nickname) {
        alert('Por favor, ingresa un apodo/nickname arriba para poder dar "Me gusta".');
        nicknameInput?.focus();
        return;
    }
    
    // Disable button to prevent double-clicks
    buttonElement.disabled = true;
    const originalContent = buttonElement.innerHTML;
    buttonElement.innerHTML = '⏳ Votando...';
    
    try {
        await likeSong(songId, nickname);
        // Reload catalog to get updated likes counts without breaking play flow
        await loadCatalog();
    } catch (err) {
        alert(err.message);
        buttonElement.disabled = false;
        buttonElement.innerHTML = originalContent;
    }
}

/**
 * Highlights the card of the currently playing song in the UI list.
 * @param {number} songId 
 */
function highlightPlayingSong(songId) {
    document.querySelectorAll('.song-card').forEach(card => {
        if (parseInt(card.dataset.id, 10) === songId) {
            card.classList.add('playing');
        } else {
            card.classList.remove('playing');
        }
    });
}

/**
 * Safe helper to escape HTML characters.
 * @param {string} str 
 * @returns {string} Escaped string
 */
function escapeHTML(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
