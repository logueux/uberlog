# UBERLOG

Demandes RAV, MEC et SAN des compagnies (Bleu, Furieux, Jonquille, Vert, Noir) au TC2. Application web installable sur iPhone et Android.

- `index.html` : l'application
- `carte.js` : choix des coordonnées MGRS (carte intégrée à appui long, ou AlpineQuest / Topo Maps+ puis « Coller »)
- `sw.js` : cache hors réseau (augmenter `VERSION` à chaque mise en ligne)
- `manifest.webmanifest`, `icones/` : installation sur l'écran d'accueil
- `firestore.rules` : règles de sécurité de la base Firebase (copie de référence, à recopier dans la console Firebase à chaque changement)

Compagnies : les 5 de base sont dans `index.html` ; l'administrateur en crée d'autres depuis la page QR (bouton « + Nouvelle compagnie » : nom, type, couleur). Elles sont rangées dans `postes/<CODE>/unites` et leur type donne le symbole OTAN.

Sections et groupes du TC2 (PELICAN, ALPHA, LIMA, KILO, KILO 1 à 5) : postes fixes (`SECTIONS` dans `index.html`), chacun avec son QR code. Le TC2 affecte les ordres du S4 à une section (champ `affecte` de la demande). Le TC2 et ses sections ont aussi un onglet Messagerie (`postes/<CODE>/messages`) et un onglet Ordres : une page de texte unique (`postes/<CODE>/pages/ordres`), modifiable par le TC2 et les chefs de section, lue par tous les profils du TC2.
