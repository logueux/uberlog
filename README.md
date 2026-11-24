# UBERLOG

Demandes RAV, MEC et SAN des compagnies (Bleu, Furieux, Jonquille, Vert, Noir) au TC2. Application web installable sur iPhone et Android.

- `index.html` : l'application
- `carte.js` : choix des coordonnées MGRS (carte intégrée à appui long, ou AlpineQuest / Topo Maps+ puis « Coller »)
- `sw.js` : cache hors réseau (augmenter `VERSION` à chaque mise en ligne)
- `manifest.webmanifest`, `icones/` : installation sur l'écran d'accueil
- `firestore.rules` : règles de sécurité de la base Firebase (copie de référence, à recopier dans la console Firebase à chaque changement)

Compagnies : les 5 de base sont dans `index.html` ; l'administrateur en crée d'autres depuis la page QR (bouton « + Nouvelle compagnie » : nom, type, couleur). Elles sont rangées dans `postes/<CODE>/unites` et leur type donne le symbole OTAN.

Sections et groupes du TC2 (PELICAN, ALPHA, LIMA, KILO, KILO 1 à 5) : postes fixes (`SECTIONS` dans `index.html`), chacun avec son QR code. Le TC2 affecte les ordres du S4 à une section (champ `affecte` de la demande). Le TC2 et ses sections ont aussi un onglet Messagerie (`postes/<CODE>/messages`) et un onglet Ordres : une page de texte unique (`postes/<CODE>/pages/ordres`), modifiable par le TC2 et les chefs de section, lue par tous les profils du TC2.

Carte de situation (bouton CARTE en haut, LISTE pour revenir ; la carte reste l'écran d'ouverture si on la laisse affichée) : positions des TC1 et du TC2, et demandes en cours sur leur plot (couleur = état, pointillés orange = convoi en route depuis le TC2). Toucher un plot affiche la demande. « Placer » : le S4 et le TC2 placent le TC2 et tous les TC1, une compagnie place son TC1 (appui long sur la carte, ou la croix puis « Ici »).

Cloisonnement des compagnies : chaque compagnie a sa propre clé secrète (`postes/<CODE>/cles/<cie>`, créée automatiquement par le S4 / TC2) et son espace `cies/<CLÉ>` : fiche (nom, type, couleur, position TC1, copie de la position TC2) et demandes. Son QR code (`?c=<CLÉ>`) ne contient pas le code du réseau : la base ne lui ouvre que son espace. Le S4, le TC2 et les sections gardent le code du réseau (`?k=<CODE>`) et voient tout. Un appareil de compagnie qui a encore l'ancien QR passe tout seul sur sa clé et oublie le code ; les anciennes demandes (`postes/<CODE>/demandes`) sont recopiées dans l'espace de chaque compagnie par le S4 / TC2.

