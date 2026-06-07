# MDT 

**Terminal de données mobiles** pour les services de police et le gouvernement - BCSO, LSPD et GOUV.

---

## Fonctionnalités

| Module | Description |
|--------|-------------|
| **Authentification** | Connexion, inscription, gestion des comptes et des rôles |
| **Recensement** | Fiches individuelles, CNI, permis, photos |
| **Rapports police** | Arrestations, contraventions, plaintes, incidents, rapports rookie / First Lincoln |
| **Recherche** | Recherche par nom, détails, historique des arrestations |
| **Communication radio** | Procédures, schémas, droit Miranda, triangulation |
| **Fichiers & assets** | Explorateur de dossiers (assets, data), visualisation des images |
| **Calculateur de peine** | Calcul des peines et amendes, export PDF |
| **Gestion** | Gestion des utilisateurs, des infractions et du MDT (accès restreint) |
| **Discord** | Bot pour commandes et envoi d’images vers un salon dédié |

---

## Structure du projet

```
mdt/
├── assets/              # Images (logos, CNI, etc.)
├── css/
│   └── styles.css       # Styles globaux
├── js/
│   ├── script.js       # Logique frontend
│   └── bot.js          # Bot Discord
├── data/                # Données + images uploadées
│   └── images/
├── index.html           # Page principale (MDT)
├── login.html           # Connexion
├── register.html        # Inscription
├── view-report.html     # Consultation des rapports
├── server.js            # API Express + base MySQL
├── package.json
└── README.md
```

---

## Prérequis

- **Node.js** (v16 ou plus)
- **MySQL** (base `mdt`)
- **Discord** (optionnel) : bot + salon pour les images

---

## Installation

```bash
# Cloner ou télécharger le projet, puis :
cd mdt
npm install
```

Configurer la base de données dans `server.js` (ou via variables d’environnement si vous les ajoutez) :

- `host`, `user`, `password`, `database` pour MySQL
- Token du bot Discord et ID du salon images si vous utilisez le bot

---

## Lancement

```bash
# Démarrer le serveur web (API + pages)
npm start
```

Ouvrir **http://localhost:3000** dans le navigateur.

```bash
# Lancer le bot Discord (dans un autre terminal)
npm run bot
```

---

## Scripts npm

| Commande | Effet |
|----------|--------|
| `npm start` | Démarre le serveur Express sur le port 3000 |
| `npm run dev` | Idem que `start` |
| `npm run bot` | Démarre le bot Discord |

---

## Stack technique

- **Backend** : Node.js, Express, MySQL2, Multer, bcrypt, express-session
- **Frontend** : HTML, CSS, JavaScript
- **Intégration** : Discord.js (bot + envoi d’images)

---

## Départements et thèmes

L’interface s’adapte au département connecté :

- **BCSO** — Blaine County Sheriff Office (orange)
- **LSPD** — Los Santos Police Department (bleu)
- **GOUV** — Gouvernement (gris)

---

## Licence

Copyright (c) 2026 Adept

All rights reserved.

This software and associated files are the property of "Adept". published, or used without explicit written permission.
Unauthorized use, reproduction, or distribution is strictly prohibited.
