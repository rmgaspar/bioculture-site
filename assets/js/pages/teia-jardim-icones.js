/* Ilustrações de «A teia do jardim»: uma por elo, desenhadas para o bioCultura (estilo plano, a cores).
   Cada uma é um SVG de 64×64 sem dependências; teia-jardim.js usa window.BioCulturaTeiaIcones[id]. */
(function () {
    "use strict";
    const svg = (body) => `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">${body}</svg>`;
    const L = 'stroke-linecap="round" stroke-linejoin="round"';

    const plantas = svg(`
        <ellipse cx="32" cy="57" rx="19" ry="4.5" fill="#7a5038"/>
        <path d="M32 57V28" stroke="#3f7a3c" stroke-width="3" ${L}/>
        <path d="M32 44C21 44 13 38 13 27c11 0 19 6 19 17z" fill="#6aa84f"/>
        <path d="M32 38c11 0 19-6 19-17-11 0-19 6-19 17z" fill="#4f8a4b"/>
        <path d="M32 44C21 44 13 38 13 27" fill="none" stroke="#8fc274" stroke-width="1.2" ${L}/>
        <g fill="#e98aa0"><circle cx="32" cy="12" r="4.4"/><circle cx="26.6" cy="16" r="4.4"/><circle cx="37.4" cy="16" r="4.4"/><circle cx="28.6" cy="22" r="4.4"/><circle cx="35.4" cy="22" r="4.4"/></g>
        <circle cx="32" cy="17.5" r="3.4" fill="#f2c230"/>`);

    const solo = svg(`
        <rect x="5" y="26" width="54" height="33" rx="7" fill="#6b4a33"/>
        <path d="M5 33c0-5 3-7 7-7h40c4 0 7 2 7 7z" fill="#7fb35c"/>
        <path d="M13 27c3-7 12-8 15-1-5 5-11 5-15 1z" fill="#d98a3d"/>
        <path d="M34 26c3-6 11-6 13-1-5 4-10 4-13 1z" fill="#b5532b"/>
        <path d="M44 27c3-4 9-4 11 0-4 3-8 3-11 0z" fill="#e0a550"/>
        <g fill="#a98467"><circle cx="14" cy="47" r="3"/><circle cx="42" cy="52" r="3.4"/><circle cx="52" cy="44" r="2.2"/><circle cx="24" cy="54" r="2"/></g>
        <path d="M30 34c0 8-5 9-7 16M30 34c1 8 6 8 9 15M30 41c-5 1-9-1-11-5" fill="none" stroke="#ead7b5" stroke-width="2" ${L}/>`);

    const pulgoes = svg(`
        <path d="M6 52c14-6 38-6 52 0" fill="none" stroke="#4f8a4b" stroke-width="5" ${L}/>
        <path d="M24 49c-3 8-12 8-16 6" fill="none" stroke="#6aa84f" stroke-width="3" ${L}/>
        <g stroke="#3f6b2a" stroke-width="2.2" fill="none" ${L}>
            <path d="M25 40l-9 9M32 43l-3 10M40 42l6 10M47 36l9 5M22 33l-11 1M46 26l8-4"/>
            <path d="M20 22l-6-9M26 19l-2-9"/>
        </g>
        <ellipse cx="35" cy="34" rx="15" ry="12.5" fill="#8fc65a"/>
        <ellipse cx="29" cy="29" rx="6" ry="3.2" fill="#c1e590" opacity=".85" transform="rotate(-20 29 29)"/>
        <circle cx="22" cy="26" r="7" fill="#7bb24a"/>
        <circle cx="20" cy="25" r="2" fill="#1e2b16"/><circle cx="19.5" cy="24.4" r=".7" fill="#fff"/>
        <path d="M45 41l6 3" stroke="#3f6b2a" stroke-width="3.4" ${L}/>`);

    const lagartas = svg(`
        <path d="M3 52c15-9 43-9 58 0-15 9-43 9-58 0z" fill="#4f8a4b"/>
        <path d="M6 52c14-5 38-5 52 0" fill="none" stroke="#7bbd6a" stroke-width="1.4" ${L}/>
        <g stroke="#6b9a2a" stroke-width="1.6" fill="#a8d44f">
            <circle cx="14" cy="41" r="7.5"/><circle cx="24" cy="36" r="8"/><circle cx="35" cy="35" r="8"/><circle cx="45" cy="38" r="7.5"/>
        </g>
        <g fill="#2f5a1a"><circle cx="14" cy="38" r="1.6"/><circle cx="24" cy="32.5" r="1.7"/><circle cx="35" cy="31.5" r="1.7"/><circle cx="45" cy="35" r="1.6"/></g>
        <circle cx="54" cy="38" r="8.5" fill="#e8ee6a" stroke="#b7bf3a" stroke-width="1.6"/>
        <circle cx="57" cy="36" r="2.2" fill="#1e2b16"/><circle cx="57.6" cy="35.4" r=".8" fill="#fff"/><path d="M57 42c2 .6 3.4 0 4-1" stroke="#7a5a1a" stroke-width="1.5" fill="none" ${L}/>
        <path d="M52 30l-3-6M56 30l3-6" stroke="#6b9a2a" stroke-width="1.6" ${L} fill="none"/>
        <g stroke="#3f6b2a" stroke-width="1.6" ${L}><path d="M14 48v4M24 44v6M35 43v6M45 45v5"/></g>`);

    const lesmas = svg(`
        <path d="M8 52H42c7 0 10-5 10-12V29" fill="none" stroke="#cfa77c" stroke-width="10" ${L}/>
        <path d="M8 52H42c7 0 10-5 10-12V29" fill="none" stroke="#e3c39d" stroke-width="3" ${L} transform="translate(0 -2)"/>
        <path d="M49 25l-5-11M55 25l5-9" stroke="#cfa77c" stroke-width="2.4" ${L} fill="none"/>
        <circle cx="44" cy="13" r="2.4" fill="#2b2b2b"/><circle cx="60" cy="15" r="2.4" fill="#2b2b2b"/>
        <circle cx="26" cy="35" r="16" fill="#c6803f"/>
        <path d="M26 35c0-3 3-5 6-3s1 8-5 9-12-3-11-10 6-13 14-12 15 8 14 16" fill="none" stroke="#8a4f1f" stroke-width="2.4" ${L}/>
        <ellipse cx="19" cy="27" rx="4" ry="2.4" fill="#e0a56c" opacity=".7" transform="rotate(-35 19 27)"/>`);

    const minhocas = svg(`
        <path d="M13 53c6-16 14 5 20-8s14 4 21-12" fill="none" stroke="#d98a8a" stroke-width="9" ${L}/>
        <path d="M13 53c6-16 14 5 20-8s14 4 21-12" fill="none" stroke="#bf6a6a" stroke-width="9" stroke-dasharray="1.2 5.4" ${L} opacity=".55"/>
        <path d="M30 47c3-4 6-3 9 0" fill="none" stroke="#efb4b4" stroke-width="9" ${L} opacity=".0"/>
        <circle cx="54" cy="33" r="1.5" fill="#3a1f1f"/>
        <path d="M5 57c0-5 8-7 14-6l26 0c8 0 15 2 14 7z" fill="#6b4a33"/>
        <g fill="#8a6246"><circle cx="14" cy="57" r="1.8"/><circle cx="34" cy="55" r="1.6"/><circle cx="50" cy="57" r="1.6"/></g>`);

    const joaninha = svg(`
        <g stroke="#2b2b2b" stroke-width="2.4" ${L} fill="none"><path d="M16 33l-9-4M15 42l-10 1M18 50l-8 6M48 33l9-4M49 42l10 1M46 50l8 6M26 14l-5-8M38 14l5-8"/></g>
        <circle cx="32" cy="38" r="19" fill="#d6452f"/>
        <path d="M21 22a12 9 0 0 1 22 0v3H21z" fill="#2b2b2b"/>
        <circle cx="27" cy="21" r="2" fill="#fff"/><circle cx="37" cy="21" r="2" fill="#fff"/>
        <path d="M32 26v31" stroke="#2b2b2b" stroke-width="2.2"/>
        <g fill="#2b2b2b"><circle cx="23" cy="37" r="3.8"/><circle cx="41" cy="37" r="3.8"/><circle cx="24" cy="49" r="3.2"/><circle cx="40" cy="49" r="3.2"/><circle cx="27" cy="30" r="2.2"/><circle cx="37" cy="30" r="2.2"/></g>
        <ellipse cx="23" cy="31" rx="4" ry="2.4" fill="#fff" opacity=".4" transform="rotate(-30 23 31)"/>`);

    const crisopa = svg(`
        <path d="M32 31C22 11 6 11 4 24c-1 11 15 14 28 7z" fill="#d6f0d0" fill-opacity=".75" stroke="#79b38a" stroke-width="1.4"/>
        <path d="M32 31C42 11 58 11 60 24c1 11-15 14-28 7z" fill="#d6f0d0" fill-opacity=".75" stroke="#79b38a" stroke-width="1.4"/>
        <g stroke="#79b38a" stroke-width="1" fill="none"><path d="M32 31L9 19M32 31L7 25M32 31L12 31M32 31L20 16M32 31L55 19M32 31L57 25M32 31L52 31M32 31L44 16"/></g>
        <ellipse cx="32" cy="42" rx="3.8" ry="15" fill="#8fc65a"/>
        <ellipse cx="32" cy="42" rx="1.4" ry="13" fill="#b5dc86" opacity=".8"/>
        <circle cx="32" cy="24" r="4.6" fill="#a8d878"/>
        <circle cx="29.4" cy="23" r="2" fill="#e6a82a"/><circle cx="34.6" cy="23" r="2" fill="#e6a82a"/>
        <path d="M30 20C26 10 20 6 13 7M34 20C38 10 44 6 51 7" fill="none" stroke="#5b8f4f" stroke-width="1.3" ${L}/>`);

    const tesourinha = svg(`
        <g stroke="#5b3318" stroke-width="2.2" ${L} fill="none"><path d="M24 28l-10-3M24 37l-11 2M25 45l-9 7M40 28l10-3M40 37l11 2M39 45l9 7M29 10l-6-6M35 10l6-6"/></g>
        <ellipse cx="32" cy="36" rx="9" ry="17" fill="#8a4f2a"/>
        <path d="M24.5 29h15M23.5 36h17M24.5 43h15" stroke="#5b3318" stroke-width="1.5"/>
        <ellipse cx="32" cy="16" rx="6.4" ry="5.6" fill="#a86a3a"/>
        <circle cx="29.5" cy="15" r="1.2" fill="#1e1209"/><circle cx="34.5" cy="15" r="1.2" fill="#1e1209"/>
        <path d="M28 51c-5 4-5 8-1 11M36 51c5 4 5 8 1 11" fill="none" stroke="#5b3318" stroke-width="3" ${L}/>`);

    const carabideos = svg(`
        <g stroke="#16293a" stroke-width="2.4" ${L} fill="none"><path d="M20 29l-13-6M19 39l-15 2M21 49l-10 11M44 29l13-6M45 39l15 2M43 49l10 11M27 13C21 7 17 4 12 6M37 13C43 7 47 4 52 6"/></g>
        <ellipse cx="32" cy="39" rx="14" ry="20" fill="#1f3b52"/>
        <ellipse cx="26" cy="32" rx="3.6" ry="10" fill="#6aa0c8" opacity=".55"/>
        <path d="M32 21v38" stroke="#0e2233" stroke-width="1.6"/>
        <path d="M25 23v33M39 23v33" stroke="#2c5575" stroke-width="1"/>
        <ellipse cx="32" cy="17" rx="7" ry="5.4" fill="#16293a"/>
        <path d="M28 13l-2-4M36 13l2-4" stroke="#16293a" stroke-width="2" ${L}/>
        <circle cx="29" cy="16" r="1.2" fill="#9ab"/><circle cx="35" cy="16" r="1.2" fill="#9ab"/>`);

    const aranha = svg(`
        <g stroke="#cfd8d1" stroke-width="1" fill="none"><path d="M32 2v60M2 32h60M10 10l44 44M54 10L10 54"/><circle cx="32" cy="32" r="9"/><circle cx="32" cy="32" r="17"/><circle cx="32" cy="32" r="25"/></g>
        <g stroke="#2b1a0b" stroke-width="2.2" ${L} fill="none"><path d="M26 25l-12-11M26 29l-19-3M26 34l-19 7M28 38l-12 15M38 25l12-11M38 29l19-3M38 34l19 7M36 38l12 15"/></g>
        <circle cx="32" cy="40" r="11" fill="#8a5a2b"/>
        <g fill="#f1e3c0"><circle cx="32" cy="35" r="1.8"/><circle cx="32" cy="40" r="1.8"/><circle cx="32" cy="45" r="1.8"/><circle cx="27.5" cy="40" r="1.8"/><circle cx="36.5" cy="40" r="1.8"/></g>
        <circle cx="32" cy="26" r="6.4" fill="#5b3a1c"/>
        <circle cx="29.6" cy="24.6" r="1.1" fill="#f1e3c0"/><circle cx="34.4" cy="24.6" r="1.1" fill="#f1e3c0"/>`);

    const sapo = svg(`
        <path d="M6 47c0-14 11-23 26-23s26 9 26 23c0 7-6 11-13 11H19c-7 0-13-4-13-11z" fill="#8a7352"/>
        <ellipse cx="32" cy="52" rx="15" ry="6" fill="#cdbb95"/>
        <circle cx="18" cy="26" r="8" fill="#8a7352"/><circle cx="46" cy="26" r="8" fill="#8a7352"/>
        <circle cx="18" cy="25" r="5.2" fill="#e0a526"/><circle cx="46" cy="25" r="5.2" fill="#e0a526"/>
        <ellipse cx="18" cy="25" rx="3.6" ry="1.3" fill="#1a1a1a"/><ellipse cx="46" cy="25" rx="3.6" ry="1.3" fill="#1a1a1a"/>
        <path d="M14 39c11 7 25 7 36 0" fill="none" stroke="#3b2f1c" stroke-width="2.2" ${L}/>
        <g fill="#6f5b3e"><circle cx="21" cy="45" r="1.8"/><circle cx="32" cy="43" r="1.8"/><circle cx="43" cy="45" r="1.8"/><circle cx="14" cy="42" r="1.5"/><circle cx="50" cy="42" r="1.5"/><circle cx="27" cy="47" r="1.4"/><circle cx="38" cy="47" r="1.4"/></g>
        <circle cx="29" cy="32" r=".9" fill="#3b2f1c"/><circle cx="35" cy="32" r=".9" fill="#3b2f1c"/>
        <path d="M14 58c-3 1-6 0-7-2M50 58c3 1 6 0 7-2" stroke="#6f5b3e" stroke-width="3" ${L} fill="none"/>`);

    const chapim = svg(`<g transform="translate(-2 0)">
        <path d="M5 56h54" stroke="#7a5038" stroke-width="3.4" ${L}/>
        <path d="M17 41L4 52l5 3 14-10z" fill="#4a7fb5"/>
        <ellipse cx="31" cy="38" rx="18" ry="14.5" fill="#f2c230"/>
        <path d="M13 36c4-11 20-15 31-8-2 13-11 22-26 20z" fill="#6f9bc7"/>
        <path d="M19 38c7-6 16-6 22-2-4 9-13 11-22 2z" fill="#3f78b5"/>
        <circle cx="45" cy="24" r="11" fill="#fff"/>
        <path d="M34 23a11 11 0 0 1 22 0c-7-4-15-4-22 0z" fill="#3f78b5"/>
        <path d="M35 27h22" stroke="#1d3557" stroke-width="2.2" ${L}/>
        <circle cx="48" cy="24.5" r="1.8" fill="#111"/>
        <path d="M55 26l7 2-7 2z" fill="#3a3a3a"/>
        <path d="M29 51v6M36 51v5" stroke="#5a5a5a" stroke-width="2.2" ${L}/></g>`);

    const melro = svg(`<g transform="translate(-4 0)">
        <path d="M5 56h54" stroke="#7a5038" stroke-width="3.4" ${L}/>
        <path d="M17 41L2 52l5 4 16-11z" fill="#1f1f1f"/>
        <ellipse cx="31" cy="38" rx="18" ry="14.5" fill="#2a2a2a"/>
        <path d="M14 38c5-10 20-13 30-7-2 12-11 20-25 18z" fill="#3a3a3a"/>
        <path d="M20 40c6-5 15-5 21-1-4 8-12 10-21 1z" fill="#1c1c1c"/>
        <circle cx="45" cy="24" r="10.5" fill="#2a2a2a"/>
        <circle cx="48" cy="23" r="3.8" fill="#f0a020"/><circle cx="48" cy="23" r="1.7" fill="#111"/>
        <path d="M54 24l8 2-8 3z" fill="#f0a020"/>
        <path d="M61 28c4 4 2 10-2 12" fill="none" stroke="#e07a8a" stroke-width="2.6" ${L}/>
        <path d="M29 51v6M36 51v5" stroke="#6a5a4a" stroke-width="2.2" ${L}/></g>`);

    const ourico = svg(`<g transform="translate(-4 0)">
        <path d="M5 46L9 31l7 6 3-16 8 9 4-14 7 12 6-12 3 14 8-6-1 14 6 2-2 8z" fill="#7a5038"/>
        <g stroke="#b99074" stroke-width="1.6" ${L} fill="none"><path d="M15 38l-2 8M24 31l-2 12M34 28l-1 14M43 29l1 13M51 32l1 11"/></g>
        <path d="M40 50c0-9 7-14 16-9l6 3c0 5-3 9-8 10z" fill="#e6cba8"/>
        <path d="M44 51c-1-5 1-8 6-9" fill="none" stroke="#cfa985" stroke-width="1.4"/>
        <circle cx="62" cy="45" r="2.6" fill="#2b2b2b"/>
        <circle cx="54" cy="43" r="1.8" fill="#111"/>
        <circle cx="46" cy="42" r="3.2" fill="#cfa985"/>
        <path d="M18 54v5M45 54v5" stroke="#cfa985" stroke-width="3.4" ${L}/></g>`);

    window.BioCulturaTeiaIcones = { plantas, solo, pulgoes, lagartas, lesmas, minhocas, joaninha, crisopa, tesourinha, carabideos, aranha, sapo, chapim, melro, ourico };
})();
