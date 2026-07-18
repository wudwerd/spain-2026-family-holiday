# Spain ’26

A responsive family holiday guide for the 13-night route from Barcelona to Girona, the Costa Brava campsite and Falset in Priorat (20 August to 2 September 2026).

## Preview locally

```bash
cd /Users/chriswoodward/palafrugell-family-holiday
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173/`.

The photography is stored locally in `assets/images`. Google Fonts, Three.js, Leaflet and OpenStreetMap tiles load from the web. The confirmed travel dates and stay phases live directly in `index.html`; map stops and interactive behaviour live in `app.js`.

## Couple's Edition brochure

`couples/index.html` is the standalone "Catalonia 2026 — Couple's Edition" brochure (20 to 30 August): a fully self-hosted, responsive editorial page with its own images and fonts in `couples/assets`. Open it directly or serve the repo and visit `/couples/`.
