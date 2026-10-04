// Entrypoint de la Shell: inicializa el reproductor y monta la vista.

import { initNickname } from './nickname.js';
import { initPlayer } from './player.js';
import { initErrorBanner } from './ui.js';
import { mountCatalog } from './views/catalog.js';

initErrorBanner();
initPlayer();
initNickname();
mountCatalog(document.getElementById('view'));
