# Pour Moi — déploiement

Ce dépôt contient une application Node.js simple (frontend statique + backend Express) prête pour un déploiement sur Railway ou via Docker.

Prérequis locaux
- Node.js (>=16)
- Git (pour pousser sur GitHub)

Lancer localement
1. Installer les dépendances:

```bash
npm install
```

2. Créer un fichier `.env` si vous utilisez des API externes (ex: SerpAPI, Google):

```text
SERPAPI_KEY=
GOOGLE_API_KEY=
GOOGLE_CX=
PORT=3000
```

3. Démarrer le serveur en local:

```bash
npm start
# puis ouvrir http://localhost:3000
```

Déployer sur Railway (rapide)
1. Pousser le repo sur GitHub (exemple):

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-git-remote-url>
git push -u origin main
```

2. Sur https://railway.app : Create Project → Deploy from GitHub → choisissez votre dépôt.
3. Dans Project Settings → Variables, ajoutez vos clés sensibles (ne les mettez pas dans le repo):

- `SERPAPI_KEY` (optionnel)
- `GOOGLE_API_KEY` et `GOOGLE_CX` (optionnel)

4. Railway détecte Node.js et exécutera `npm start`. Sur échec, consultez les logs (Console → Logs).

Déployer avec Docker (optionnel)
1. Construire l'image (localement):

```bash
docker build -t pour-moi-search .
```

2. Lancer le conteneur:

```bash
docker run -p 3000:3000 --env PORT=3000 pour-moi-search
# ouvrir http://localhost:3000
```

Notes importantes
- Ne commitez jamais vos clés API dans le dépôt. Utilisez les variables d'environnement dans Railway.
- Si vous voulez des comptes persistants et sécurisés, remplacez le stockage `localStorage` actuel par une base de données et des routes d'authentification côté serveur.

Besoin d'aide ?
- Je peux vous guider pas à pas pour pousser le repo sur GitHub et connecter Railway (je peux fournir les commandes exactes et vérifier les erreurs si vous partagez les logs).
- Je peux aussi ajouter un workflow GitHub Actions pour CI/CD si vous le souhaitez.
