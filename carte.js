"use strict";
// UBERLOG : choix des coordonnées (MGRS) sur carte, ou par AlpineQuest / Topo Maps+ puis collage.
// Module autonome : window.Carto. Se branche sur tout champ <input data-coord>.
(function () {
  // ---------- MGRS (WGS84) ----------
  const a = 6378137, f = 1 / 298.257223563, e2 = f * (2 - f), ep2 = e2 / (1 - e2), k0 = 0.9996;
  const BANDES = "CDEFGHJKLMNPQRSTUVWX";
  const COLS = ["ABCDEFGH", "JKLMNPQR", "STUVWXYZ"], LIGNES = "ABCDEFGHJKLMNPQRSTUV";
  const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;

  function fuseau(lat, lon) {
    let z = Math.floor((lon + 180) / 6) + 1;
    if (lat >= 56 && lat < 64 && lon >= 3 && lon < 12) z = 32;
    if (lat >= 72 && lat < 84) { if (lon >= 0 && lon < 9) z = 31; else if (lon >= 9 && lon < 21) z = 33; else if (lon >= 21 && lon < 33) z = 35; else if (lon >= 33 && lon < 42) z = 37; }
    return Math.min(z, 60);
  }
  function arc(phi) {
    return a * ((1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 ** 3 / 256) * phi - (3 * e2 / 8 + 3 * e2 * e2 / 32 + 45 * e2 ** 3 / 1024) * Math.sin(2 * phi)
      + (15 * e2 * e2 / 256 + 45 * e2 ** 3 / 1024) * Math.sin(4 * phi) - (35 * e2 ** 3 / 3072) * Math.sin(6 * phi));
  }
  function versUtm(lat, lon, zone) {
    zone = zone || fuseau(lat, lon);
    const phi = rad(lat), l0 = rad((zone - 1) * 6 - 180 + 3);
    const N = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2), T = Math.tan(phi) ** 2, C = ep2 * Math.cos(phi) ** 2, A = Math.cos(phi) * (rad(lon) - l0);
    const E = k0 * N * (A + (1 - T + C) * A ** 3 / 6 + (5 - 18 * T + T * T + 72 * C - 58 * ep2) * A ** 5 / 120) + 500000;
    let No = k0 * (arc(phi) + N * Math.tan(phi) * (A * A / 2 + (5 - T + 9 * C + 4 * C * C) * A ** 4 / 24 + (61 - 58 * T + T * T + 600 * C - 330 * ep2) * A ** 6 / 720));
    if (lat < 0) No += 10000000;
    return { zone, E, N: No, sud: lat < 0 };
  }
  function depuisUtm(zone, E, No, sud) {
    const x = E - 500000, y = sud ? No - 10000000 : No;
    const M = y / k0, mu = M / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 ** 3 / 256));
    const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
    const p1 = mu + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu) + (21 * e1 * e1 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu)
      + (151 * e1 ** 3 / 96) * Math.sin(6 * mu) + (1097 * e1 ** 4 / 512) * Math.sin(8 * mu);
    const N1 = a / Math.sqrt(1 - e2 * Math.sin(p1) ** 2), T1 = Math.tan(p1) ** 2, C1 = ep2 * Math.cos(p1) ** 2;
    const R1 = a * (1 - e2) / (1 - e2 * Math.sin(p1) ** 2) ** 1.5, D = x / (N1 * k0);
    const lat = p1 - (N1 * Math.tan(p1) / R1) * (D * D / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * D ** 4 / 24
      + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) * D ** 6 / 720);
    const lon = (D - (1 + 2 * T1 + C1) * D ** 3 / 6 + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) * D ** 5 / 120) / Math.cos(p1);
    return { lat: deg(lat), lon: (zone - 1) * 6 - 180 + 3 + deg(lon) };
  }
  // lat/lon → « 31U DQ 1234 5678 » (chiffres par axe : 4 = 10 m, 5 = 1 m)
  function versMgrs(lat, lon, chiffres = 4) {
    if (lat < -80 || lat > 84) return "";
    const u = versUtm(lat, lon), z = u.zone;
    const bande = BANDES[Math.min(Math.floor((lat + 80) / 8), 19)];
    const jeu = (z - 1) % 3, col = COLS[jeu][Math.floor(u.E / 100000) - 1];
    const ligne = LIGNES[(Math.floor(u.N / 100000) + (z % 2 === 0 ? 5 : 0)) % 20];
    const tr = v => String(Math.floor((v % 100000) / 10 ** (5 - chiffres))).padStart(chiffres, "0");
    return `${z}${bande} ${col}${ligne} ${tr(u.E)} ${tr(u.N)}`;
  }
  // « 31UDQ12345678 », « 31U DQ 1234 5678 »… → centre du carré désigné
  function depuisMgrs(txt) {
    const m = String(txt).toUpperCase().replace(/\s+/g, "").match(/^(\d{1,2})([C-HJ-NP-X])([A-HJ-NP-Z])([A-HJ-NP-V])(\d{0,10})$/);
    if (!m || m[5].length % 2) return null;
    const z = +m[1]; if (z < 1 || z > 60) return null;
    const bande = m[2], n = m[5].length / 2, pas = 10 ** (5 - n);
    const ci = COLS[(z - 1) % 3].indexOf(m[3]), li = LIGNES.indexOf(m[4]);
    if (ci < 0 || li < 0) return null;
    const E = (ci + 1) * 100000 + (n ? +m[5].slice(0, n) * pas : 0) + pas / 2;
    const nBase = ((li - (z % 2 === 0 ? 5 : 0)) % 20 + 20) % 20 * 100000 + (n ? +m[5].slice(n) * pas : 0) + pas / 2;
    const bi = BANDES.indexOf(bande), latMin = -80 + bi * 8, latMax = bande === "X" ? 84 : latMin + 8, sud = bi < 10;
    let mieux = null;
    for (let k = 0; k < 6; k++) {
      const p = depuisUtm(z, E, nBase + k * 2000000, sud);
      if (!isFinite(p.lat) || Math.abs(p.lon - ((z - 1) * 6 - 177)) > 9) continue;
      const ecart = Math.max(0, latMin - p.lat, p.lat - latMax);
      if (!mieux || ecart < mieux.ecart) mieux = { ...p, ecart };
    }
    return mieux && mieux.ecart < 1 ? { lat: mieux.lat, lon: mieux.lon, precision: pas } : null;
  }
  // Lit à peu près tout ce qu'une appli carto copie ou partage : MGRS, UTM, degrés décimaux, DMS, geo:, liens Google / Apple / OSM
  function lire(txt) {
    if (!txt) return null;
    const s = String(txt).trim();
    const mg = s.toUpperCase().match(/\b(\d{1,2}\s?[C-HJ-NP-X]\s?[A-HJ-NP-Z][A-HJ-NP-V](?:\s?\d+){0,2})\b/);
    if (mg) { const p = depuisMgrs(mg[1]); if (p) return p; }
    const utm = s.toUpperCase().match(/\b(\d{1,2})\s?([C-HJ-NP-X])\s+(\d{6}(?:[.,]\d+)?)\s*(?:M?E)?\s+(\d{7}(?:[.,]\d+)?)\b/);
    if (utm) { const p = depuisUtm(+utm[1], +utm[3].replace(",", "."), +utm[4].replace(",", "."), BANDES.indexOf(utm[2]) < 10); if (ok(p)) return p; }
    const dms = [...s.matchAll(/([NSEWO])?\s*(\d{1,3})\s*[°º]\s*(\d{1,2})\s*['′’]\s*(?:(\d{1,2}(?:[.,]\d+)?)\s*(?:["″”]|''))?\s*([NSEWO](?!\s*\d))?/gi)];
    if (dms.length >= 2) {
      const v = dms.slice(0, 2).map(x => { const h = ((x[1] || "") + (x[5] || "")).toUpperCase(); let d = +x[2] + +x[3] / 60 + (x[4] ? +x[4].replace(",", ".") / 3600 : 0); if (/[SWO]/.test(h)) d = -d; return { d, h }; });
      const p = /[EWO]/.test(v[0].h) ? { lat: v[1].d, lon: v[0].d } : { lat: v[0].d, lon: v[1].d };
      if (ok(p)) return p;
    }
    const s2 = s.includes(".") ? s : s.replace(/(\d),(\d)/g, "$1.$2");
    const dec = s2.match(/([NS])?\s*(-?\d{1,2}\.\d+)\s*°?\s*([NS])?\s*[,; ]\s*([EWO])?\s*(-?\d{1,3}\.\d+)\s*°?\s*([EWO])?/i);
    if (dec) {
      const p = { lat: +dec[2] * (/S/i.test((dec[1] || "") + (dec[3] || "")) ? -1 : 1), lon: +dec[5] * (/[WO]/i.test((dec[4] || "") + (dec[6] || "")) ? -1 : 1) };
      if (ok(p)) return p;
    }
    return null;
  }
  const ok = p => p && isFinite(p.lat) && isFinite(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180;

  // ---------- Interface ----------
  const $ = (s, r = document) => r.querySelector(s);
  const memo = {
    lire(k, d) { try { const v = localStorage.getItem("uberlog." + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    ecrire(k, v) { try { localStorage.setItem("uberlog." + k, JSON.stringify(v)); } catch {} },
  };
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const OUTILS = {
    carte: { nom: "Carte UBERLOG", detail: "Appui long sur le point" },
    alpinequest: { nom: "AlpineQuest", detail: ios ? "Android uniquement" : "Copier la position, revenir, coller" },
    topomaps: { nom: "Topo Maps+", detail: ios ? "Copier la position, revenir, coller" : "iPhone / iPad uniquement" },
  };
  const outil = () => memo.lire("outil.carto", "");
  const LEAFLET = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/";
  const FONDS = {
    plan: { nom: "Plan IGN", url: "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png", max: 19, attr: "© IGN" },
    photo: { nom: "Photo", url: "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/jpeg", max: 19, attr: "© IGN" },
    topo: { nom: "Topo", url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", max: 17, attr: "© OpenTopoMap, © OpenStreetMap" },
  };

  let champ = null, carte = null, fond = null, repere = null, moi = null, chargement = null, retourExterne = false;
  const Carto = { ouverte: false, versMgrs, depuisMgrs, lire };

  const css = document.createElement("style");
  css.textContent = `
  #carto, #carto * { box-sizing: border-box; }
  #carto { position: fixed; inset: 0; z-index: 50; background: var(--fond, #101409); display: flex; flex-direction: column; }
  #carto .c-barre { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; background: var(--kaki-fonce, #2b3419); border-bottom: 2px solid var(--kaki, #a7b86a);
    padding: calc(6px + env(safe-area-inset-top, 0px)) max(10px, env(safe-area-inset-right, 0px)) 6px max(10px, env(safe-area-inset-left, 0px)); }
  #carto .c-barre button { padding: 8px 10px; min-height: 40px; font-size: 13px; }
  #carto .c-barre .c-titre { font: 700 15px/1 var(--f-titre, sans-serif); letter-spacing: .1em; text-transform: uppercase; color: var(--kaki, #a7b86a); margin-right: auto; }
  #carto .c-fond { flex: 1; min-height: 0; position: relative; }
  #c-map { position: absolute; inset: 0; background: #20261a; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
  #carto .c-pied { background: var(--carte, #1a2012); border-top: 1px solid var(--bord, #343d26); display: grid; gap: 8px;
    padding: 10px max(12px, env(safe-area-inset-right, 0px)) calc(10px + env(safe-area-inset-bottom, 0px)) max(12px, env(safe-area-inset-left, 0px)); }
  #carto .c-lecture { font: 600 18px/1.2 var(--f-code, monospace); text-align: center; letter-spacing: .04em; }
  #carto .c-lecture small { display: block; font: 500 13px/1.3 var(--f-titre, sans-serif); color: var(--doux, #9aa38a); letter-spacing: .02em; }
  #carto .c-lecture.fait { color: var(--vert, #4fc163); }
  #carto .c-ligne { display: flex; gap: 8px; } #carto .c-ligne button { flex: 1; }
  #carto .c-panneau { padding: 16px max(16px, env(safe-area-inset-right, 0px)) 16px max(16px, env(safe-area-inset-left, 0px)); display: grid; gap: 10px; align-content: start; overflow: auto; max-width: 560px; width: 100%; margin: 0 auto; }
  #carto .c-panneau h3 { font: 700 13px/1 var(--f-titre, sans-serif); letter-spacing: .16em; text-transform: uppercase; color: var(--doux, #9aa38a); margin: 6px 0 0; }
  #carto .c-panneau button, #carto .c-lien { text-align: left; display: grid; gap: 3px; }
  #carto .c-lien { font: 700 15px/1.1 var(--f-titre, sans-serif); letter-spacing: .06em; text-transform: uppercase; text-decoration: none; border-radius: 6px; padding: 12px 14px; background: var(--kaki, #a7b86a); color: #11160a; }
  #carto .c-panneau button small { font: 500 13px/1.2 var(--f-titre, sans-serif); text-transform: none; letter-spacing: .02em; color: var(--doux, #9aa38a); }
  #carto .c-lien small { font: 500 13px/1.2 var(--f-titre, sans-serif); text-transform: none; letter-spacing: .02em; }
  #carto .c-panneau button.plein small { color: #2b3419; }
  #carto .c-panneau button.choisi { border-color: var(--kaki, #a7b86a); box-shadow: inset 0 0 0 1px var(--kaki, #a7b86a); }
  #carto .c-panneau p { margin: 0; color: var(--doux, #9aa38a); font-size: 15px; }
  #carto .c-panneau ol { margin: 0; padding-left: 20px; display: grid; gap: 4px; }
  #carto .c-erreur { color: var(--rouge, #ef4b3f); min-height: 1.2em; margin: 0; font-weight: 700; }
  .c-croix { position: absolute; left: 50%; top: 50%; width: 34px; height: 34px; margin: -17px 0 0 -17px; pointer-events: none; z-index: 500; opacity: .8; }
  .c-croix::before, .c-croix::after { content: ""; position: absolute; background: #ff3b30; box-shadow: 0 0 0 1px rgba(0,0,0,.6); }
  .c-croix::before { left: 16px; top: 0; width: 2px; height: 34px; } .c-croix::after { top: 16px; left: 0; height: 2px; width: 34px; }
  .c-anneau { position: absolute; left: 0; top: 0; width: 64px; height: 64px; margin: -32px 0 0 -32px; border: 3px solid var(--kaki, #a7b86a); border-radius: 50%; pointer-events: none; z-index: 600; opacity: 0; }
  .c-anneau.actif { opacity: 1; transition: transform .55s linear, opacity .1s; transform: scale(.35); }
  .c-pt { width: 22px; height: 22px; margin: -11px 0 0 -11px; border-radius: 50%; background: #ff3b30; border: 3px solid #fff; box-shadow: 0 0 0 2px #000; }
  .c-moi { width: 16px; height: 16px; margin: -8px 0 0 -8px; border-radius: 50%; background: #2f8cff; border: 3px solid #fff; box-shadow: 0 0 0 2px rgba(0,0,0,.5); }
  .leaflet-container { font: 500 12px/1.2 var(--f-titre, sans-serif); }
  .leaflet-control-attribution { background: rgba(16,20,9,.7) !important; color: #9aa38a !important; } .leaflet-control-attribution a { color: #c9cfbb !important; }
  input[data-coord] { cursor: pointer; }`;
  document.head.appendChild(css);

  function chargerLeaflet() {
    if (window.L) return Promise.resolve();
    if (chargement) return chargement;
    chargement = new Promise((ok, ko) => {
      const l = document.createElement("link"); l.rel = "stylesheet"; l.href = LEAFLET + "leaflet.css"; document.head.appendChild(l);
      const s = document.createElement("script"); s.src = LEAFLET + "leaflet.js"; s.onload = ok; s.onerror = () => { chargement = null; ko(); }; document.head.appendChild(s);
    });
    return chargement;
  }

  function coque(titre, contenu) {
    fermer(true);
    const d = document.createElement("div"); d.id = "carto"; d.setAttribute("role", "dialog"); d.setAttribute("aria-label", titre);
    d.innerHTML = contenu; document.body.appendChild(d); document.documentElement.style.overflow = "hidden";
    Carto.ouverte = true; return d;
  }
  function fermer(silencieux) {
    if (carte) { try { memo.ecrire("carto.vue", { c: carte.getCenter(), z: carte.getZoom() }); carte.remove(); } catch {} carte = null; fond = null; repere = null; moi = null; }
    $("#carto")?.remove(); document.documentElement.style.overflow = ""; Carto.ouverte = false; retourExterne = false;
    if (!silencieux) champ?.blur();
  }
  function enregistrer(mgrs) {
    if (champ && !document.contains(champ) && champ.id) champ = document.getElementById(champ.id) || champ;
    if (!champ) return;
    champ.value = mgrs; champ.dispatchEvent(new Event("input", { bubbles: true })); champ.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function vibrer(ms) { try { navigator.vibrate?.(ms); } catch {} }

  // Choix de l'outil (demandé une fois, modifiable depuis la carte)
  function ecranChoix(suite) {
    const d = coque("Outil de coordonnées", `
      <div class="c-barre"><span class="c-titre">Outil coordonnées</span><button type="button" data-c="fermer">Retour</button></div>
      <div class="c-panneau">
        <p>Avec quoi choisir les coordonnées ? Le choix reste en mémoire sur cet appareil.</p>
        ${Object.entries(OUTILS).map(([k, o]) => `<button type="button" data-outil="${k}" class="${outil() === k ? "choisi" : ""}">${o.nom}<small>${o.detail}</small></button>`).join("")}
      </div>`);
    d.onclick = e => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.c === "fermer") return fermer();
      if (b.dataset.outil) { memo.ecrire("outil.carto", b.dataset.outil); (suite || ouvrirSelonOutil)(); }
    };
  }

  function ouvrirSelonOutil() {
    const o = outil();
    if (!o) return ecranChoix();
    if (o === "carte") return ouvrirCarte();
    return ecranExterne(o);
  }

  // ---------- Option 2 : appli externe puis collage ----------
  function ecranExterne(o) {
    const nom = OUTILS[o].nom, actuel = depuisMgrs(champ?.value || "");
    const indispo = (o === "alpinequest" && ios) || (o === "topomaps" && !ios);
    const geo = actuel ? `geo:${actuel.lat.toFixed(6)},${actuel.lon.toFixed(6)}?z=15` : "geo:0,0?z=3";
    const lancer = o === "alpinequest" && !ios
      ? `<a href="${geo}" class="c-lien plein">1 · Ouvrir ${nom}<small>${actuel ? "Centré sur le point actuel" : "Si Android demande quelle appli : AlpineQuest"}</small></a>`
      : `<button type="button" disabled>1 · Ouvrir ${nom}<small>${indispo ? `${nom} n'existe pas sur cet appareil` : "Depuis l'écran d'accueil (iOS ne permet pas de l'ouvrir d'ici)"}</small></button>`;
    const d = coque("Coordonnées par " + nom, `
      <div class="c-barre"><span class="c-titre">${nom}</span><button type="button" data-c="outil">Outil</button><button type="button" data-c="fermer">Retour</button></div>
      <div class="c-panneau">
        ${lancer}
        <ol>
          <li>Appui long sur le point voulu.</li>
          <li>${o === "alpinequest" ? "Toucher les coordonnées affichées puis « Copier » (format MGRS de préférence)." : "Toucher le repère, puis « Partager » ou « Copier » les coordonnées."}</li>
          <li>Revenir dans UBERLOG.</li>
        </ol>
        <button type="button" class="plein" data-c="coller" id="c-coller">2 · Coller les coordonnées<small>MGRS, UTM, degrés ou lien de carte acceptés</small></button>
        <p class="c-erreur" id="c-err" role="alert"></p>
        <h3>Autre moyen</h3>
        <div class="c-ligne"><button type="button" data-c="carte">Carte UBERLOG</button><button type="button" data-c="clavier">Clavier</button></div>
      </div>`);
    const lien = d.querySelector(".c-lien");
    if (lien) lien.onclick = () => { retourExterne = true; };
    d.onclick = async e => {
      const b = e.target.closest("button"); if (!b) return;
      const c = b.dataset.c;
      if (c === "fermer") return fermer();
      if (c === "outil") return ecranChoix();
      if (c === "carte") return ouvrirCarte();
      if (c === "clavier") return clavier();
      if (c === "coller") return coller();
    };
  }
  async function coller() {
    const err = $("#c-err"); if (err) err.textContent = "";
    let t = "";
    try { t = await navigator.clipboard.readText(); }
    catch { if (err) err.textContent = "Collage refusé. Autoriser « Coller », ou utiliser le clavier."; return; }
    const p = lire(t);
    if (!p) { if (err) err.textContent = t ? `Coordonnées non reconnues : « ${t.slice(0, 60)} »` : "Presse-papiers vide."; return; }
    const m = versMgrs(p.lat, p.lon); if (!m) { if (err) err.textContent = "Hors zone MGRS."; return; }
    enregistrer(m); vibrer(40); fermer();
  }
  function clavier() {
    const c = champ; fermer(true);
    if (!c) return;
    c.dataset.clavier = "1"; c.removeAttribute("readonly"); c.removeAttribute("inputmode"); c.focus();
    c.addEventListener("blur", () => { delete c.dataset.clavier; c.setAttribute("readonly", ""); }, { once: true });
  }
  // Retour dans l'appli après AlpineQuest : propose de coller tout de suite
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && Carto.ouverte && $("#c-coller")) $("#c-coller").focus();
  });

  // ---------- Option 1 : carte intégrée, appui long = enregistrement ----------
  async function ouvrirCarte() {
    const d = coque("Carte", `
      <div class="c-barre"><span class="c-titre">Carte</span>
        <button type="button" data-c="fond" id="c-bfond">Plan IGN</button><button type="button" data-c="moi">◎ Moi</button><button type="button" data-c="fermer">Retour</button></div>
      <div class="c-fond"><div id="c-map"></div><div class="c-croix" aria-hidden="true"></div><div class="c-anneau" id="c-anneau" aria-hidden="true"></div></div>
      <div class="c-pied">
        <div class="c-lecture" id="c-lecture">…<small>Appui long sur le point pour l'enregistrer</small></div>
        <div class="c-ligne"><button type="button" data-c="centre">Prendre la croix</button><button type="button" data-c="outil">Outil</button><button type="button" data-c="clavier">Clavier</button></div>
      </div>`);
    d.onclick = e => {
      const b = e.target.closest("button"); if (!b) return;
      const c = b.dataset.c;
      if (c === "fermer") return fermer();
      if (c === "outil") return ecranChoix();
      if (c === "clavier") return clavier();
      if (!carte) return;
      if (c === "fond") { const ks = Object.keys(FONDS); choisirFond(ks[(ks.indexOf(memo.lire("carto.fond", "plan")) + 1) % ks.length]); }
      if (c === "moi") localiser(true);
      if (c === "centre") { const p = carte.getCenter(); poser(p.lat, p.lng); }
    };
    try { await chargerLeaflet(); }
    catch { $("#c-lecture").innerHTML = `Carte indisponible hors réseau<small>Utiliser « Clavier » ou un autre outil</small>`; return; }
    if (!document.body.contains(d)) return;
    carte = L.map("c-map", { zoomControl: false, attributionControl: true, tap: false, doubleClickZoom: true, worldCopyJump: true });
    L.control.scale({ imperial: false, position: "bottomleft" }).addTo(carte);
    choisirFond(memo.lire("carto.fond", "plan"));
    const actuel = depuisMgrs(champ?.value || ""), vue = memo.lire("carto.vue", null);
    if (actuel) { carte.setView([actuel.lat, actuel.lon], 15); marquer(actuel.lat, actuel.lon); }
    else if (vue) carte.setView([vue.c.lat, vue.c.lng], vue.z);
    else carte.setView([46.6, 2.4], 6);
    if (!actuel) localiser(!vue);
    carte.on("move", lecture); lecture();
    appuiLong($("#c-map"));
  }
  function choisirFond(k) {
    const F = FONDS[k] || FONDS.plan; memo.ecrire("carto.fond", k in FONDS ? k : "plan");
    if (fond) carte.removeLayer(fond);
    fond = L.tileLayer(F.url, { maxZoom: F.max, maxNativeZoom: F.max, attribution: F.attr, subdomains: "abc", crossOrigin: true }).addTo(carte);
    if (carte.getZoom() > F.max) carte.setZoom(F.max);
    carte.setMaxZoom(F.max + 1);
    const b = $("#c-bfond"); if (b) b.textContent = F.nom;
  }
  function lecture() {
    const el = $("#c-lecture"); if (!el || !carte || el.classList.contains("fait")) return;
    const c = carte.getCenter();
    el.innerHTML = `${versMgrs(c.lat, ((c.lng + 540) % 360) - 180) || "—"}<small>Croix au centre · appui long sur le point pour l'enregistrer</small>`;
  }
  function localiser(centrer) {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(p => {
      if (!carte) return; const ll = [p.coords.latitude, p.coords.longitude];
      if (moi) moi.setLatLng(ll); else moi = L.marker(ll, { icon: L.divIcon({ className: "", html: '<div class="c-moi"></div>', iconSize: [0, 0] }), interactive: false }).addTo(carte);
      if (centrer) carte.setView(ll, Math.max(carte.getZoom(), 14));
    }, () => {}, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  }
  function marquer(lat, lon) {
    const ic = L.divIcon({ className: "", html: '<div class="c-pt"></div>', iconSize: [0, 0] });
    if (repere) repere.setLatLng([lat, lon]); else repere = L.marker([lat, lon], { icon: ic, interactive: false }).addTo(carte);
  }
  function poser(lat, lon) {
    lon = ((lon + 540) % 360) - 180;
    const m = versMgrs(lat, lon); if (!m) return;
    marquer(lat, lon); enregistrer(m); vibrer([30, 40, 60]);
    const el = $("#c-lecture"); if (el) { el.classList.add("fait"); el.innerHTML = `✓ ${m}<small>Coordonnées enregistrées</small>`; }
    setTimeout(() => { if ($("#carto")) fermer(); }, 900);
  }
  // Appui long maison (identique sur iOS et Android) : 600 ms sans bouger, un seul doigt
  function appuiLong(el) {
    let t = null, x0 = 0, y0 = 0, doigts = 0;
    const anneau = $("#c-anneau");
    const stop = () => { clearTimeout(t); t = null; anneau?.classList.remove("actif"); };
    el.addEventListener("pointerdown", e => {
      doigts++; if (doigts > 1 || (e.pointerType === "mouse" && e.button !== 0)) return stop();
      x0 = e.clientX; y0 = e.clientY; stop();
      const r = el.getBoundingClientRect();
      if (anneau) { anneau.style.left = (x0 - r.left) + "px"; anneau.style.top = (y0 - r.top) + "px"; void anneau.offsetWidth; anneau.classList.add("actif"); }
      t = setTimeout(() => { t = null; anneau?.classList.remove("actif"); if (!carte) return;
        const ll = carte.containerPointToLatLng([x0 - r.left, y0 - r.top]); poser(ll.lat, ll.lng); }, 600);
    });
    el.addEventListener("pointermove", e => { if (t && Math.hypot(e.clientX - x0, e.clientY - y0) > 10) stop(); });
    const fin = () => { doigts = Math.max(0, doigts - 1); stop(); };
    el.addEventListener("pointerup", fin); el.addEventListener("pointercancel", fin); el.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") fin(); });
    el.addEventListener("contextmenu", e => e.preventDefault());
  }

  // ---------- Branchement sur les champs ----------
  // Tout <input data-coord> : toucher le champ ouvre l'outil choisi (le clavier reste accessible depuis l'outil)
  function preparer(r = document) {
    r.querySelectorAll("input[data-coord]:not([data-carto])").forEach(i => { i.dataset.carto = "1"; i.setAttribute("readonly", ""); });
  }
  new MutationObserver(() => preparer()).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("click", e => {
    const i = e.target.closest?.("input[data-coord]"); if (!i || i.dataset.clavier) return;
    e.preventDefault(); champ = i; ouvrirSelonOutil();
  });
  addEventListener("keydown", e => { if (e.key === "Escape" && Carto.ouverte) fermer(); });
  preparer();

  Carto.ouvrir = i => { champ = i; ouvrirSelonOutil(); };
  Carto.choisirOutil = () => ecranChoix(() => fermer());
  window.Carto = Carto;
})();
