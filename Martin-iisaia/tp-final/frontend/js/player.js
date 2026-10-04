// Player State
let currentSong = null;
let audioElement = null;
let playPauseBtn = null;
let trackTitleElement = null;
let trackArtistElement = null;

/**
 * Initializes the audio player elements and sets up event listeners.
 */
export function initPlayer() {
    audioElement = document.getElementById('audio-player');
    playPauseBtn = document.getElementById('play-pause-btn');
    trackTitleElement = document.getElementById('current-track-title');
    trackArtistElement = document.getElementById('current-track-artist');

    if (!audioElement || !playPauseBtn) return;

    // Listen to native events to sync custom controls (play/pause button icon)
    audioElement.addEventListener('play', updatePlayPauseButton);
    audioElement.addEventListener('pause', updatePlayPauseButton);
    audioElement.addEventListener('ended', handleTrackEnded);

    playPauseBtn.addEventListener('click', togglePlay);
}

/**
 * Sets a song as active, updates the UI, and starts audio playback.
 * @param {Object} song 
 */
export function playSong(song) {
    if (!audioElement) return;

    currentSong = song;
    audioElement.src = song.audio_url;
    audioElement.play()
        .catch(err => {
            console.error("Error al reproducir audio:", err);
            alert(`No se pudo reproducir el audio: ${err.message || err}\n\n(Abre la consola F12 para ver el detalle completo)`);
        });

    if (trackTitleElement) {
        trackTitleElement.textContent = song.title;
    }
    if (trackArtistElement) {
        trackArtistElement.textContent = song.artist;
    }
    
    // Dispatch a custom event to notify other components (e.g., to highlight the active song)
    dispatchSongChangedEvent(song.id);
}

/**
 * Toggles play/pause state.
 */

/**
 * Returns the ID of the currently playing song, if any.
 * @returns {number|null}
 */
export function getCurrentSongId() {
    return currentSong?.id || null;
}

function togglePlay() {
    if (!audioElement) return;
    if (audioElement.paused) {
        audioElement.play().catch(err => console.error("Error al reproducir:", err));
    } else {
        audioElement.pause();
    }
}

/**
 * Updates the icon and tooltip of the play/pause button based on player state.
 */
function updatePlayPauseButton() {
    if (!playPauseBtn || !audioElement) return;
    if (audioElement.paused) {
        playPauseBtn.textContent = '▶';
        playPauseBtn.title = 'Reproducir';
    } else {
        playPauseBtn.textContent = '⏸';
        playPauseBtn.title = 'Pausar';
    }
}

/**
 * Triggers an event when the current track finishes playing.
 */
function handleTrackEnded() {
    const event = new CustomEvent('trackEnded', { detail: { songId: currentSong?.id } });
    window.dispatchEvent(event);
}

/**
 * Dispatches a notification that the active song has changed.
 * @param {number} songId 
 */
function dispatchSongChangedEvent(songId) {
    const event = new CustomEvent('songChanged', { detail: { songId } });
    window.dispatchEvent(event);
}
