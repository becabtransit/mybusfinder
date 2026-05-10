/**
 * Dynamic Sheet MBF3X+
 * ─────────────────────────────────────────────────────────────────────────────
 *  fonctionnalités interactives pour la bottom sheet (peut évoluer) :
 *
 *  1. MODE "JE MONTE" - recherche d'arrêt + guidance jusqu'au bus
 *  2. MODE COCKPIT - bascule automatique quand une popup véhicule s'ouvre
 *  3. ARRÊT LE PLUS PROCHE - géoloc + passages dans les ~300m
 *  4. HISTORIQUE - 5 derniers véhicules/lignes consultés, persistant
 *
 * Intégration :
 *   • Ajouter <script src="bottom-sheet-features.js"></script> APRÈS logic.js
 *   • Ajouter les sections HTML dans #bs-content (voir commentaires ci-dessous)
 *   • Les styles sont injectés automatiquement
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function () {
    'use strict';

    /* UTILITAIRES INTERNES */

    /** Lecture des stopIds triés par distance d'un point GPS */
    function _stopsNear(lat, lon, radiusM = 300) {
        const nearby = [];
        Object.entries(stopNameMap).forEach(([stopId, name]) => {
            // stopnamemap ne contient pas les coords > on cherche dans
            // les entités GTFS stops si elles ont été enrichies
            // fallback j'itere les markers actifs dont le stopId correspond
        });

        const seen = new Set();
        markerPool.active.forEach(marker => {
            const tripId = marker.vehicleData?.trip?.tripId;
            const stops = tripUpdates[tripId]?.nextStops || [];
            stops.forEach(s => {
                const sid = s.stopId.replace('0:', '');
                if (seen.has(sid)) return;
                seen.add(sid);
                const mPos = marker.getLatLng();
                const d = _distM(lat, lon, mPos.lat, mPos.lng);
                if (d <= radiusM) {
                    nearby.push({ stopId: sid, name: stopNameMap[sid] || sid, dist: Math.round(d), marker });
                }
            });
        });
        return nearby.sort((a, b) => a.dist - b.dist);
    }

    function _distM(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function _timeLabel(epochSec) {
        const diff = Math.round((epochSec - Date.now() / 1000) / 60);
        if (diff <= 0) return t('imminent') || 'imminent';
        return `${diff} min`;
    }

    function _safe(fn) { try { fn(); } catch (e) { console.warn('[BSF]', e); } }

    /* styles */

    function _injectStyles() {
        if (document.getElementById('bsf-styles')) return;
        const s = document.createElement('style');
        s.id = 'bsf-styles';
        s.textContent = `
/* ── Section tabs ── */
.bsf-tabs {
    display: flex;
    gap: 6px;
    padding: 0 37px 12px;
    overflow-x: auto;
    scrollbar-width: none;
}
.bsf-tabs::-webkit-scrollbar { display: none; }
.bsf-tab {
    flex-shrink: 0;
    padding: 7px 14px;
    border-radius: 20px;
    border: 1px solid rgba(255,255,255,0.18);
    background: rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.75);
    font-family: 'League Spartan', sans-serif;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.25,1.5,0.5,1);
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 6px;
}
.bsf-tab.active {
    background: rgba(255,255,255,0.22);
    border-color: rgba(255,255,255,0.45);
    color: #fff;
    font-weight: 700;
}
.bsf-tab:active { transform: scale(0.95); }

/* ── Panels ── */
.bsf-panel {
    display: none;
    padding: 0 37px 8px;
    animation: bsfPanelIn 0.38s cubic-bezier(0.25,1.5,0.5,1) both;
}
.bsf-panel.visible { display: block; }
@keyframes bsfPanelIn {
    from { opacity:0; transform: translateY(10px) scale(0.97); filter:blur(4px); }
    to   { opacity:1; transform: translateY(0) scale(1); filter:blur(0); }
}

/* ── Cockpit ── */
#bsf-cockpit-panel {
    display: none;
    position: relative;
    padding: 0 37px 14px;
    animation: bsfCockpitIn 0.5s cubic-bezier(0.25,1.5,0.5,1) both;
}
#bsf-cockpit-panel.visible { display: block; }
@keyframes bsfCockpitIn {
    from { opacity:0; transform:translateY(16px) scale(0.96); filter:blur(8px); }
    to   { opacity:1; transform:translateY(0) scale(1); filter:blur(0); }
}
.bsf-cockpit-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
}
.bsf-cockpit-badge {
    padding: 4px 12px;
    border-radius: 20px;
    font-family: 'League Spartan', sans-serif;
    font-size: 15px;
    font-weight: 700;
}
.bsf-cockpit-dest {
    font-family: 'League Spartan', sans-serif;
    font-size: 13px;
    opacity: 0.75;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
}
.bsf-cockpit-close {
    background: rgba(255,255,255,0.12);
    border: none;
    border-radius: 50%;
    width: 28px; height: 28px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    color: white;
    font-size: 14px;
    transition: background 0.2s;
    flex-shrink: 0;
}
.bsf-cockpit-close:active { background: rgba(255,255,255,0.28); }

.bsf-cockpit-eta {
    display: flex;
    gap: 10px;
    margin-bottom: 12px;
    flex-wrap: wrap;
}
.bsf-cockpit-kpi {
    flex: 1;
    min-width: 80px;
    background: rgba(255,255,255,0.09);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 14px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 3px;
}
.bsf-cockpit-kpi-val {
    font-family: 'League Spartan', sans-serif;
    font-size: 22px;
    font-weight: 700;
    line-height: 1;
    color: #fff;
}
.bsf-cockpit-kpi-lbl {
    font-family: 'League Spartan', sans-serif;
    font-size: 10px;
    opacity: 0.55;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.bsf-cockpit-stops {
    display: flex;
    flex-direction: column;
    gap: 0;
}
.bsf-cockpit-stop-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 0;
    border-bottom: 1px solid rgba(255,255,255,0.07);
    font-family: 'League Spartan', sans-serif;
    animation: bsfStopIn 0.35s cubic-bezier(0.25,1.5,0.5,1) both;
}
@keyframes bsfStopIn {
    from { opacity:0; transform:translateX(-8px); }
    to   { opacity:1; transform:translateX(0); }
}
.bsf-cockpit-stop-row:last-child { border-bottom: none; }
.bsf-cockpit-stop-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
}
.bsf-cockpit-stop-name {
    flex: 1;
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.bsf-cockpit-stop-time {
    font-size: 12px;
    font-weight: 600;
    opacity: 0.8;
    white-space: nowrap;
}
.bsf-cockpit-parc {
    font-size: 11px;
    opacity: 0.45;
    background: rgba(255,255,255,0.08);
    padding: 2px 7px;
    border-radius: 6px;
    white-space: nowrap;
}

/* ── Arrêt proche ── */
.bsf-nearby-btn {
    width: 100%;
    padding: 13px 16px;
    border-radius: 16px;
    background: rgba(255,255,255,0.10);
    border: 1px solid rgba(255,255,255,0.18);
    color: white;
    font-family: 'League Spartan', sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 10px;
    justify-content: center;
    transition: all 0.25s cubic-bezier(0.25,1.5,0.5,1);
    margin-bottom: 12px;
}
.bsf-nearby-btn:active { transform: scale(0.97); }
.bsf-nearby-btn:hover { background: rgba(255,255,255,0.16); }
.bsf-nearby-btn svg { flex-shrink: 0; }

.bsf-nearby-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 12px;
    background: rgba(255,255,255,0.07);
    border-radius: 14px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: background 0.2s;
    border: 1px solid rgba(255,255,255,0.10);
    font-family: 'League Spartan', sans-serif;
}
.bsf-nearby-item:hover { background: rgba(255,255,255,0.12); }
.bsf-nearby-item:active { transform: scale(0.98); }
.bsf-nearby-dist {
    font-size: 11px;
    opacity: 0.5;
    white-space: nowrap;
    margin-top: 2px;
}
.bsf-nearby-name {
    font-size: 14px;
    font-weight: 600;
    flex: 1;
}
.bsf-nearby-times {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-top: 5px;
}
.bsf-nearby-pill {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 10px;
    background: rgba(255,255,255,0.13);
    border: 1px solid rgba(255,255,255,0.15);
    white-space: nowrap;
}

/* ── Je monte ── */
.bsf-board-search {
    position: relative;
    margin-bottom: 10px;
}
.bsf-board-input {
    width: 100%;
    padding: 11px 14px 11px 38px;
    background: rgba(255,255,255,0.12);
    border: 1px solid rgba(255,255,255,0.22);
    border-radius: 14px;
    color: white;
    font-family: 'League Spartan', sans-serif;
    font-size: 14px;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.2s, background 0.2s;
}
.bsf-board-input:focus {
    background: rgba(255,255,255,0.17);
    border-color: rgba(255,255,255,0.45);
}
.bsf-board-input::placeholder { color: rgba(255,255,255,0.45); }
.bsf-board-icon {
    position: absolute;
    left: 11px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    opacity: 0.55;
}
.bsf-board-results {
    display: flex;
    flex-direction: column;
    gap: 8px;
}
.bsf-board-stop-row {
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 14px;
    padding: 10px 12px;
    cursor: pointer;
    font-family: 'League Spartan', sans-serif;
    transition: background 0.2s, transform 0.15s;
}
.bsf-board-stop-row:active { transform: scale(0.97); }
.bsf-board-stop-row:hover { background: rgba(255,255,255,0.14); }
.bsf-board-stop-name { font-size: 14px; font-weight: 600; margin-bottom: 6px; }
.bsf-board-buses {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}
.bsf-board-bus-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.15s;
    border: 1px solid rgba(255,255,255,0.2);
}
.bsf-board-bus-chip:active { transform: scale(0.92); opacity: 0.8; }

/* ── Historique ── */
.bsf-hist-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 14px;
    cursor: pointer;
    font-family: 'League Spartan', sans-serif;
    transition: background 0.2s, transform 0.15s;
    animation: bsfHistIn 0.4s cubic-bezier(0.25,1.5,0.5,1) both;
}
.bsf-hist-item:hover { background: rgba(255,255,255,0.13); }
.bsf-hist-item:active { transform: scale(0.97); }
@keyframes bsfHistIn {
    from { opacity:0; transform:translateX(10px); }
    to   { opacity:1; transform:translateX(0); }
}
.bsf-hist-badge {
    padding: 3px 10px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 700;
    flex-shrink: 0;
}
.bsf-hist-info { flex: 1; min-width: 0; }
.bsf-hist-label { font-size: 13px; font-weight: 600; }
.bsf-hist-sub { font-size: 11px; opacity: 0.5; margin-top: 1px; }
.bsf-hist-time { font-size: 10px; opacity: 0.35; flex-shrink: 0; }
.bsf-hist-empty {
    text-align: center;
    font-family: 'League Spartan', sans-serif;
    font-size: 13px;
    opacity: 0.4;
    padding: 16px 0;
}

/* ── Cockpit pulse ── */
@keyframes bsfPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.55; }
}
.bsf-live-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: #15d85d;
    animation: bsfPulse 1.8s ease-in-out infinite;
    flex-shrink: 0;
}

/* ── Drag tab highlight ── */
#bottom-sheet.bsf-cockpit-mode {
    border-top: 2px solid rgba(255,255,255,0.25);
}
        `;
        document.head.appendChild(s);
    }

    /*bs-content */

    function _injectHTML() {
        const content = document.getElementById('bs-content');
        if (!content || document.getElementById('bsf-tabs')) return;

        const cockpit = document.createElement('div');
        cockpit.id = 'bsf-cockpit-panel';
        cockpit.innerHTML = `
            <div class="bsf-cockpit-header">
                <div class="bsf-live-dot"></div>
                <div class="bsf-cockpit-badge" id="bsf-ck-badge">-</div>
                <div class="bsf-cockpit-dest" id="bsf-ck-dest">-</div>
                <div class="bsf-cockpit-parc" id="bsf-ck-parc">-</div>
                <button class="bsf-cockpit-close" id="bsf-ck-close" title="Fermer le cockpit">✕</button>
            </div>
            <div class="bsf-cockpit-eta" id="bsf-ck-kpis"></div>
            <div class="bsf-cockpit-stops" id="bsf-ck-stops"></div>
        `;
        content.parentNode.insertBefore(cockpit, content);

        const tabs = document.createElement('div');
        tabs.className = 'bsf-tabs';
        tabs.id = 'bsf-tabs';
        tabs.innerHTML = `
            <button class="bsf-tab active" data-panel="bsf-favs-panel">
                ⭐ Favoris
            </button>
            <button class="bsf-tab" data-panel="bsf-board-panel">
                🎯 Je monte
            </button>
            <button class="bsf-tab" data-panel="bsf-nearby-panel">
                📍 Autour de moi
            </button>
            <button class="bsf-tab" data-panel="bsf-hist-panel">
                🔁 Historique
            </button>
        `;
        content.prepend(tabs);


        const favPanel = document.createElement('div');
        favPanel.className = 'bsf-panel visible';
        favPanel.id = 'bsf-favs-panel';
        const existingFavSection = document.getElementById('bs-favorites-section');
        if (existingFavSection) {
            favPanel.appendChild(existingFavSection);
        }
        content.insertBefore(favPanel, content.children[1]);

        const boardPanel = document.createElement('div');
        boardPanel.className = 'bsf-panel';
        boardPanel.id = 'bsf-board-panel';
        boardPanel.innerHTML = `
            <div class="bsf-board-search">
                <svg class="bsf-board-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"
                     stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
                <input id="bsf-board-input" class="bsf-board-input"
                       type="text" autocomplete="off" spellcheck="false"
                       placeholder="Nom de votre arrêt…" />
            </div>
            <div id="bsf-board-results" class="bsf-board-results"></div>
        `;
        content.insertBefore(boardPanel, content.children[2]);

        const nearbyPanel = document.createElement('div');
        nearbyPanel.className = 'bsf-panel';
        nearbyPanel.id = 'bsf-nearby-panel';
        nearbyPanel.innerHTML = `
            <button class="bsf-nearby-btn ripple-container" id="bsf-nearby-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                     stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="10" r="3"/>
                    <path d="M12 2a8 8 0 0 1 8 8c0 5.25-8 13-8 13S4 15.25 4 10a8 8 0 0 1 8-8z"/>
                </svg>
                Détecter ma position
            </button>
            <div id="bsf-nearby-results"></div>
        `;
        content.insertBefore(nearbyPanel, content.children[3]);

        const histPanel = document.createElement('div');
        histPanel.className = 'bsf-panel';
        histPanel.id = 'bsf-hist-panel';
        histPanel.innerHTML = `<div id="bsf-hist-list"></div>`;
        content.insertBefore(histPanel, content.children[4]);

        const existingSearch = document.getElementById('bs-search-wrapper');
        if (existingSearch) {
            favPanel.insertBefore(existingSearch, favPanel.firstChild);
        }
    }

    /*TABS - navigation entre panels */

    function _initTabs() {
        const tabsEl = document.getElementById('bsf-tabs');
        if (!tabsEl) return;

        tabsEl.addEventListener('click', e => {
            const tab = e.target.closest('.bsf-tab');
            if (!tab) return;
            const panelId = tab.dataset.panel;

            tabsEl.querySelectorAll('.bsf-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            document.querySelectorAll('.bsf-panel').forEach(p => p.classList.remove('visible'));
            const panel = document.getElementById(panelId);
            if (panel) panel.classList.add('visible');

            _safe(() => safeVibrate?.([15]));
            _safe(() => soundsUX?.('MBF_Menu_LineSelect'));

            if (panelId === 'bsf-hist-panel') _renderHistory();
            if (panelId === 'bsf-nearby-panel') {
                document.getElementById('bsf-nearby-btn').style.display = 'flex';
            }
        });
    }

    /* MODE "JE MONTE" */

    function _initBoardMode() {
        const input = document.getElementById('bsf-board-input');
        const results = document.getElementById('bsf-board-results');
        if (!input || !results) return;

        let debounceTimer;
        input.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => _searchStops(input.value.trim(), results), 180);
        });
    }

    function _searchStops(query, container) {
        container.innerHTML = '';
        if (!query || query.length < 2) return;

        const q = query.toLowerCase();

        const matches = Object.entries(stopNameMap)
            .filter(([, name]) => name.toLowerCase().includes(q))
            .slice(0, 8);

        if (!matches.length) {
            container.innerHTML = `<div class="bsf-hist-empty">Aucun arrêt trouvé</div>`;
            return;
        }

        matches.forEach(([stopId, stopName]) => {
            const buses = [];
            markerPool.active.forEach(marker => {
                const tripId = marker.vehicleData?.trip?.tripId;
                const stops = tripUpdates[tripId]?.nextStops || [];
                const hit = stops.find(s => s.stopId.replace('0:', '') === stopId.replace('0:', ''));
                if (!hit) return;

                const depTime = hit.departureTime || hit.arrivalTime;
                let label = _timeLabel_fromStr(depTime);
                const color = lineColors[marker.line] || '#555';
                const name = lineName[marker.line] || marker.line;
                const textC = _textColorSimple(color);

                buses.push({ marker, color, name, label, textC });
            });

            if (!buses.length) return; // N'afficher que les arrêts avec du trafic en cours

            const row = document.createElement('div');
            row.className = 'bsf-board-stop-row ripple-container';

            const chipsHTML = buses.slice(0, 6).map(b => `
                <span class="bsf-board-bus-chip"
                      style="background:${b.color}; color:${b.textC};"
                      data-vehicle-id="${b.marker.id}">
                    ${b.name} · ${b.label}
                </span>`).join('');

            row.innerHTML = `
                <div class="bsf-board-stop-name">${stopName}</div>
                <div class="bsf-board-buses">${chipsHTML}</div>
            `;

            row.querySelectorAll('.bsf-board-bus-chip').forEach(chip => {
                chip.addEventListener('click', e => {
                    e.stopPropagation();
                    const vid = chip.dataset.vehicleId;
                    const marker = markerPool.active.get(vid);
                    if (!marker) return;
                    _safe(() => safeVibrate?.([50, 30, 50], true));
                    _safe(() => soundsUX?.('MBF_Menu_VehicleSelect'));
                    map.setView(marker.getLatLng(), 16);
                    marker.openPopup();
                    BottomSheet.collapse();
                });
            });

            container.appendChild(row);
        });

        if (!container.children.length) {
            container.innerHTML = `<div class="bsf-hist-empty">Aucun passage en cours pour ces arrêts</div>`;
        }
    }

    function _timeLabel_fromStr(timeStr) {
        if (!timeStr) return '-';
        if (typeof timeStr === 'string' && timeStr.includes(':')) {
            const parts = timeStr.split(':').map(Number);
            const now = new Date();
            const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
            let t = parts[0] * 3600 + parts[1] * 60 + (parts[2] || 0);
            let diff = Math.round((t - nowSec) / 60);
            if (diff < 0) diff += 24 * 60;
            if (diff <= 0) return 'imminent';
            return `${diff} min`;
        }
        if (typeof timeStr === 'number' && timeStr > 86400) {
            return _timeLabel(timeStr);
        }
        return '-';
    }

    /*COCKPIT (contextuel popup ouverte) */

    let _cockpitInterval = null;
    let _cockpitMarkerId = null;

    function _showCockpit(marker) {
        const panel = document.getElementById('bsf-cockpit-panel');
        if (!panel) return;

        _cockpitMarkerId = marker.id;
        _cockpitUpdate(marker);

        panel.classList.add('visible');
        BottomSheet.expand();

        _cockpitInterval = setInterval(() => {
            const m = markerPool.active.get(_cockpitMarkerId);
            if (m) _cockpitUpdate(m);
        }, 5000);
    }

    function _hideCockpit() {
        const panel = document.getElementById('bsf-cockpit-panel');
        if (panel) panel.classList.remove('visible');
        if (_cockpitInterval) { clearInterval(_cockpitInterval); _cockpitInterval = null; }
        _cockpitMarkerId = null;
        document.getElementById('bottom-sheet')?.classList.remove('bsf-cockpit-mode');
    }

    function _cockpitUpdate(marker) {
        const sheet = document.getElementById('bottom-sheet');
        sheet?.classList.add('bsf-cockpit-mode');

        const line = marker.line;
        const color = lineColors[line] || '#555';
        const textC = _textColorSimple(color);
        const lineLbl = lineName[line] || line;
        const dest = marker.destination || '-';
        const tripId = marker.vehicleData?.trip?.tripId;
        const nextStops = tripUpdates[tripId]?.nextStops || [];
        const parc = String(marker.vehicleData?.vehicle?.label || marker.vehicleData?.vehicle?.id || '?').padStart(3, '0');

        const firstStop = nextStops.find(s => (s.delay ?? 0) >= -60);
        const delayMin = firstStop?.computedDelay != null
            ? Math.round(firstStop.computedDelay / 60) : null;

        const delayColor = delayMin === null ? '#aaa'
            : Math.abs(delayMin) <= 1 ? '#15d85d'
            : delayMin > 5 ? '#ff453a' : '#ff9f0a';
        const delayLabel = delayMin === null ? '-'
            : Math.abs(delayMin) <= 1 ? 'À l\'heure'
            : delayMin > 0 ? `+${delayMin} min` : `${delayMin} min`;

        const speed = marker.vehicleData?.position?.speed;
        const speedLabel = speed != null ? `${Math.round(speed)} km/h` : '-';

        const stopsLeft = nextStops.filter(s => (s.delay ?? 0) >= -60).length;

        document.getElementById('bsf-ck-badge').textContent = `Ligne ${lineLbl}`;
        document.getElementById('bsf-ck-badge').style.background = color;
        document.getElementById('bsf-ck-badge').style.color = textC;
        document.getElementById('bsf-ck-dest').textContent = `➜ ${dest}`;
        document.getElementById('bsf-ck-parc').textContent = `#${parc}`;

        document.getElementById('bsf-ck-kpis').innerHTML = `
            <div class="bsf-cockpit-kpi">
                <div class="bsf-cockpit-kpi-val" style="color:${delayColor};">${delayLabel}</div>
                <div class="bsf-cockpit-kpi-lbl">Retard</div>
            </div>
            <div class="bsf-cockpit-kpi">
                <div class="bsf-cockpit-kpi-val">${speedLabel}</div>
                <div class="bsf-cockpit-kpi-lbl">Vitesse</div>
            </div>
            <div class="bsf-cockpit-kpi">
                <div class="bsf-cockpit-kpi-val">${stopsLeft}</div>
                <div class="bsf-cockpit-kpi-lbl">Arrêts restants</div>
            </div>
        `;

        const stopsEl = document.getElementById('bsf-ck-stops');
        const filtered = nextStops.filter(s => (s.delay ?? 0) >= -60).slice(0, 5);
        stopsEl.innerHTML = filtered.length
            ? filtered.map((s, i) => {
                const name = stopNameMap[s.stopId.replace('0:', '')] || s.stopId;
                const timeStr = _timeLabel_fromStr(s.departureTime || s.arrivalTime);
                const isFirst = i === 0;
                return `
                <div class="bsf-cockpit-stop-row" style="animation-delay:${i * 40}ms">
                    <div class="bsf-cockpit-stop-dot"
                         style="background:${isFirst ? color : 'rgba(255,255,255,0.25)'};"></div>
                    <div class="bsf-cockpit-stop-name"
                         style="opacity:${isFirst ? 1 : 0.65}; font-weight:${isFirst ? 700 : 400};">
                        ${name}
                    </div>
                    <div class="bsf-cockpit-stop-time">${timeStr}</div>
                </div>`;
            }).join('')
            : `<div class="bsf-hist-empty">Aucune donnée de passage</div>`;
    }

    function _initCockpit() {
        document.addEventListener('leaflet-popup-open', e => {
            const marker = e.detail?.marker;
            if (marker) _showCockpit(marker);
        });

        // hook sur les popups leaflet via l'instance de map
        const tryHook = () => {
            if (!window.mapInstance) { setTimeout(tryHook, 500); return; }
            mapInstance.on('popupopen', e => {
                // retrouver le marker correspondant
                const latlng = e.popup.getLatLng();
                let found = null;
                markerPool.active.forEach(m => {
                    if (m.getLatLng().equals(latlng, 0.0001)) found = m;
                });
                if (!found) {
                    markerPool.active.forEach(m => {
                        if (!found && m.isPopupOpen()) found = m;
                    });
                }
                if (found) {
                    _showCockpit(found);
                    _addHistory(found);
                }
            });
            mapInstance.on('popupclose', () => {
                setTimeout(_hideCockpit, 300);
            });
        };
        tryHook();

        document.getElementById('bsf-ck-close')?.addEventListener('click', () => {
            _hideCockpit();
            _safe(() => mapInstance?.closePopup());
        });
    }

    /*ARRÊT LE PLUS PROCHE */

    function _initNearby() {
        const btn = document.getElementById('bsf-nearby-btn');
        const results = document.getElementById('bsf-nearby-results');
        if (!btn || !results) return;

        btn.addEventListener('click', () => {
            btn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                     stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                     style="animation:bsfPulse 1s infinite;">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                </svg>
                Localisation en cours…
            `;
            btn.style.opacity = '0.7';
            btn.disabled = true;

            navigator.geolocation.getCurrentPosition(
                pos => _renderNearby(pos.coords.latitude, pos.coords.longitude, results, btn),
                () => {
                    btn.innerHTML = '⚠️ Géolocalisation refusée';
                    btn.style.opacity = '1';
                    btn.disabled = false;
                },
                { enableHighAccuracy: true, timeout: 8000 }
            );
        });
    }

    function _renderNearby(lat, lon, container, btn) {
        btn.style.display = 'none';
        container.innerHTML = '';

        //grouper les passages par arrêt
        const stopPassages = new Map(); // stopId > { name, dist, buses[] }

        markerPool.active.forEach(marker => {
            const tripId = marker.vehicleData?.trip?.tripId;
            const stops = tripUpdates[tripId]?.nextStops || [];
            stops.slice(0, 8).forEach(s => {
                const sid = s.stopId.replace('0:', '');
                const name = stopNameMap[sid] || sid;
                const mPos = marker.getLatLng();
                const dist = Math.round(_distM(lat, lon, mPos.lat, mPos.lng));
                if (dist > 500) return;

                if (!stopPassages.has(sid)) stopPassages.set(sid, { name, dist, buses: [] });
                stopPassages.get(sid).buses.push({
                    marker,
                    time: _timeLabel_fromStr(s.departureTime || s.arrivalTime),
                    color: lineColors[marker.line] || '#555',
                    lineName: lineName[marker.line] || marker.line
                });
            });
        });

        if (!stopPassages.size) {
            container.innerHTML = `<div class="bsf-hist-empty">Aucun bus dans un rayon de 500m</div>`;
            //reafficher le bouton
            btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 1 8 8c0 5.25-8 13-8 13S4 15.25 4 10a8 8 0 0 1 8-8z"/></svg> Réessayer`;
            btn.style.display = 'flex';
            btn.style.opacity = '1';
            btn.disabled = false;
            return;
        }

        const sorted = [...stopPassages.entries()].sort((a, b) => a[1].dist - b[1].dist);

        sorted.slice(0, 6).forEach(([stopId, data]) => {
            const item = document.createElement('div');
            item.className = 'bsf-nearby-item ripple-container';

            const pillsHTML = data.buses.slice(0, 5).map(b => `
                <span class="bsf-nearby-pill"
                      style="background:${b.color}33; border-color:${b.color}55; color:white;"
                      data-vehicle-id="${b.marker.id}">
                    ${b.lineName} · ${b.time}
                </span>`).join('');

            item.innerHTML = `
                <div style="flex:1; min-width:0;">
                    <div class="bsf-nearby-name">${data.name}</div>
                    <div class="bsf-nearby-dist">${data.dist} m</div>
                    <div class="bsf-nearby-times">${pillsHTML}</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                     stroke="rgba(255,255,255,0.4)" stroke-width="2"
                     stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                </svg>
            `;

            item.querySelectorAll('.bsf-nearby-pill').forEach(pill => {
                pill.addEventListener('click', e => {
                    e.stopPropagation();
                    const vid = pill.dataset.vehicleId;
                    const marker = markerPool.active.get(vid);
                    if (!marker) return;
                    _safe(() => safeVibrate?.([40], true));
                    map.setView(marker.getLatLng(), 16);
                    marker.openPopup();
                    BottomSheet.collapse();
                });
            });

            container.appendChild(item);
        });

        const mapBtn = document.createElement('button');
        mapBtn.className = 'bsf-nearby-btn ripple-container';
        mapBtn.style.marginTop = '8px';
        mapBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                 stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>
            Centrer la carte ici
        `;
        mapBtn.addEventListener('click', () => {
            map.setView([lat, lon], 16);
            BottomSheet.collapse();
        });
        container.appendChild(mapBtn);
    }

    /*FEATURE 4 - HISTORIQUE*/

    const HIST_KEY = 'bsf_nav_history';
    const HIST_MAX = 8;

    function _addHistory(marker) {
        const line = marker.line;
        const vid = String(marker.vehicleData?.vehicle?.label || marker.vehicleData?.vehicle?.id || marker.id);
        const dest = marker.destination || '?';
        const color = lineColors[line] || '#555';
        const lname = lineName[line] || line;

        const entry = {
            vehicleId: marker.id,
            line, vid, dest, color, lname,
            ts: Date.now()
        };

        let hist = _getHistory();
        hist = hist.filter(h => h.vehicleId !== marker.id);
        hist.unshift(entry);
        if (hist.length > HIST_MAX) hist = hist.slice(0, HIST_MAX);

        try { localStorage.setItem(HIST_KEY, JSON.stringify(hist)); } catch (_) {}
    }

    function _getHistory() {
        try {
            return JSON.parse(localStorage.getItem(HIST_KEY) || '[]');
        } catch (_) { return []; }
    }

    function _renderHistory() {
        const list = document.getElementById('bsf-hist-list');
        if (!list) return;
        list.innerHTML = '';

        const hist = _getHistory();
        if (!hist.length) {
            list.innerHTML = `<div class="bsf-hist-empty">
                Aucun historique - ouvrez un bus pour commencer
            </div>`;
            return;
        }

        hist.forEach((entry, i) => {
            const textC = _textColorSimple(entry.color);
            const elapsed = _elapsed(entry.ts);

            const item = document.createElement('div');
            item.className = 'bsf-hist-item ripple-container';
            item.style.animationDelay = `${i * 40}ms`;

            item.innerHTML = `
                <span class="bsf-hist-badge"
                      style="background:${entry.color}; color:${textC};">
                    ${entry.lname}
                </span>
                <div class="bsf-hist-info">
                    <div class="bsf-hist-label">#${entry.vid.padStart(3,'0')}</div>
                    <div class="bsf-hist-sub">➜ ${entry.dest}</div>
                </div>
                <div class="bsf-hist-time">${elapsed}</div>
            `;

            item.addEventListener('click', () => {
                _safe(() => safeVibrate?.([30], true));
                _safe(() => soundsUX?.('MBF_Menu_VehicleSelect'));

                const marker = markerPool.active.get(entry.vehicleId);
                if (marker) {
                    map.setView(marker.getLatLng(), 16);
                    marker.openPopup();
                    BottomSheet.collapse();
                } else {
                    // Véhicule plus visible > signaler
                    _safe(() => typeof toastBottomRight !== 'undefined' &&
                        toastBottomRight.info?.('Ce véhicule n\'est plus en service ou hors de la vue.'));
                    item.style.opacity = '0.4';
                    item.style.pointerEvents = 'none';
                }
            });

            list.appendChild(item);
        });

        // bouton vider
        const clear = document.createElement('button');
        clear.className = 'bsf-nearby-btn';
        clear.style.cssText = 'margin-top:12px; opacity:0.5; font-size:12px;';
        clear.textContent = '🗑️ Vider l\'historique';
        clear.addEventListener('click', () => {
            localStorage.removeItem(HIST_KEY);
            _renderHistory();
        });
        list.appendChild(clear);
    }

    function _elapsed(ts) {
        const sec = Math.round((Date.now() - ts) / 1000);
        if (sec < 60) return 'à l\'instant';
        const min = Math.round(sec / 60);
        if (min < 60) return `il y a ${min} min`;
        const h = Math.round(min / 60);
        if (h < 24) return `il y a ${h}h`;
        return `il y a ${Math.round(h / 24)}j`;
    }

    /*UTILITAIRES COULEUR */

    function _textColorSimple(hex) {
        if (!hex) return '#fff';
        const c = hex.replace('#', '');
        if (c.length < 6) return '#fff';
        const r = parseInt(c.slice(0, 2), 16);
        const g = parseInt(c.slice(2, 4), 16);
        const b = parseInt(c.slice(4, 6), 16);
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        return lum > 140 ? '#1a1a1a' : '#ffffff';
    }

    /* INIT GLOBAL*/

    function _init() {
        _injectStyles();
        _injectHTML();
        _initTabs();
        _initCockpit();
        _initNearby();
        _initBoardMode();
    }

    // attendre que le dom soit pret et que dynamic sheet soit initialiser
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(_init, 400));
    } else {
        setTimeout(_init, 400);
    }

    // Exposer pour debug
    window.BSF = { addHistory: _addHistory, showCockpit: _showCockpit, hideCockpit: _hideCockpit };

})();
