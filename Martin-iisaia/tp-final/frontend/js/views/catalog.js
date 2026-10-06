// Vista de catálogo: lista de canciones con Reproducir y Like.

import { ApiError, getSongs, likeSong } from '../api.js';
import { focusNickname, getNickname } from '../nickname.js';
import { getCurrentSongId, isPlaying, playTrack } from '../player.js';
import { el, showError, withLoading } from '../ui.js';

const songsById = new Map();
let allSongs = [];
let gridEl = null;
let listenersReady = false;

function renderSongCard(song) {
    return el('article', { className: 'song-card', dataset: { songId: song.id } }, [
        el('div', { className: 'song-meta' }, [
            el('h3', { className: 'song-title', text: song.title }),
            el('p', { className: 'song-artist', text: song.artist }),
        ]),
        el('div', { className: 'song-actions' }, [
            el('button', { type: 'button', className: 'btn btn-play', text: '▶ Reproducir', dataset: { action: 'play', id: song.id } }),
            el('button', { type: 'button', className: 'btn btn-like', text: '♥ Like', dataset: { action: 'like', id: song.id } }),
            el('span', { className: 'like-count', text: String(song.likes_count) }),
        ]),
    ]);
}

function renderStatus(container, message, withRetry = false) {
    const children = [el('p', { text: message })];
    if (withRetry) {
        const retry = el('button', { type: 'button', className: 'btn', text: 'Reintentar' });
        retry.addEventListener('click', () => mountCatalog(container));
        children.push(retry);
    }
    container.replaceChildren(el('div', { className: 'status' }, children));
}

function renderSkeleton(container) {
    gridEl = el('section', { className: 'song-grid' });
    container.replaceChildren(
        el('h2', { className: 'view-title', text: 'Catálogo' }),
        gridEl,
    );
}

export function renderGrid() {
    gridEl.replaceChildren(...allSongs.map(renderSongCard));
    highlightPlaying(getCurrentSongId(), isPlaying());
}

function highlightPlaying(songId, playing) {
    document.querySelectorAll('.song-card').forEach((card) => {
        const active = Number(card.dataset.songId) === songId;
        card.classList.toggle('is-playing', active && playing);
        const btn = card.querySelector('[data-action="play"]');
        btn.textContent = active && playing ? '❚❚ Pausar' : '▶ Reproducir';
    });
}

function markLiked(button) {
    button.classList.add('is-liked');
    button.textContent = '♥ Te gusta';
    button.disabled = true;
}

async function handleLike(button, songId) {
    const nickname = getNickname();
    if (nickname.length < 2) {
        showError('Ingresá un nickname (mínimo 2 caracteres) para dar like');
        focusNickname();
        return;
    }
    try {
        const like = await withLoading(button, 'Cargando...', () => likeSong(songId, nickname));
        button.parentElement.querySelector('.like-count').textContent = String(like.likes_count);
        markLiked(button);
    } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
            markLiked(button);
            showError('Ya diste like a esta canción');
        } else {
            showError(`No se pudo registrar el like: ${err.message}`);
        }
    }
}

function onContainerClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const songId = Number(button.dataset.id);
    if (button.dataset.action === 'play') playTrack(songsById.get(songId));
    if (button.dataset.action === 'like') handleLike(button, songId);
}

function setupListeners(container) {
    if (listenersReady) return;
    container.addEventListener('click', onContainerClick);
    document.addEventListener('player:change', (e) => highlightPlaying(e.detail.songId, e.detail.playing));
    listenersReady = true;
}

export async function mountCatalog(container) {
    setupListeners(container);
    renderStatus(container, 'Cargando catálogo...');
    try {
        const songs = await getSongs();
        if (songs.length === 0) {
            renderStatus(container, 'Todavía no hay canciones');
            return;
        }
        allSongs = songs;
        songsById.clear();
        songs.forEach((song) => songsById.set(song.id, song));
        renderSkeleton(container);
        renderGrid();
    } catch (err) {
        renderStatus(container, `No se pudo cargar el catálogo: ${err.message}`, true);
    }
}
