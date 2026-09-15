# Rencontre — Carnet de prospects IA

Application web React et TypeScript pour enregistrer et qualifier rapidement les interlocuteurs rencontrés sur un salon. Interface en français, adaptée aux ordinateurs, tablettes et téléphones.

## Démarrage

Prérequis : Node.js 22.13 ou supérieur et npm. Pour lancer les tests unitaires TypeScript sans transpilation, utiliser Node.js 22.18 ou supérieur.

```bash
npm ci
npm run dev
```

Ouvrir l’adresse indiquée par le serveur (par défaut http://localhost:3000).

## Utilisation

- **Nouveau prospect** : prénom, nom, fonction, société, email, téléphone. Un prénom, un nom ou une société suffit ; les autres renseignements sont facultatifs.
- **Besoins IA** : cases à cocher multiples et notes libres.
- **Qualification** : priorité, maturité, échéance du projet et budget.
- **Suivi** : statut, prochaine action et date de relance. La date de relance est un repère visuel ; aucun email ni rappel automatique n’est envoyé.
- **Enregistrer et suivant** : enregistrer puis ouvrir un formulaire vierge pour le visiteur suivant.
- **Rechercher** : nom, société, fonction, email, téléphone, besoins, notes principales et prochaine action. Recherche insensible à la casse et aux accents, avec plusieurs mots et filtres cumulables. Pagination de 30 fiches.
- **Fiche détaillée** : cliquer sur un interlocuteur pour consulter, modifier ou supprimer sa fiche. La suppression demande une confirmation et supprime aussi ses passages.
- **Nouveau passage** : ajouter un échange horodaté avec une note distincte. Modifier une fiche ne crée pas de passage supplémentaire.
- **Exporter** : CSV des résultats filtrés, sur toutes les pages, compatible Excel (UTF-8 avec BOM, séparateur point-virgule, protection contre les formules).
- **Raccourcis** : Cmd/Ctrl + K pour rechercher ; Cmd/Ctrl + Entrée pour enregistrer une fiche ; Échap pour fermer une fenêtre.

Les horodatages sont produits par le serveur en UTC et affichés dans le fuseau du navigateur. Le compteur du jour suit les journées du navigateur. Une confirmation prévient la fermeture d’un formulaire modifié ; une erreur réseau conserve la saisie tant que le formulaire reste ouvert.

## Architecture

- React 19 + TypeScript, routage compatible Next.js via vinext/Vite.
- API côté serveur dans `app/api/`.
- SQLite via Cloudflare D1, avec requêtes préparées et transactions pour les passages.
- `prospects` : coordonnées, qualification et notes ; `visits` : historique horodaté, lié avec suppression en cascade.
- Schéma Drizzle dans `db/schema.ts`, migration SQL versionnée dans `drizzle/`.
- Initialisation locale automatique du même schéma dans `db/index.ts`.
- En local, la base SQLite persiste dans `.wrangler/` : ne pas supprimer ce dossier si vous souhaitez conserver vos données. En hébergement Sites, D1 fournit la base persistante indépendante des navigateurs.
- Aucune donnée de prospect n’est stockée dans localStorage. Aucun contact fictif n’est ajouté.

La recherche utilise un champ normalisé avec `LIKE` ; les index portent sur les dates, statuts et priorités. Cette approche vise un carnet de salon. Un moteur de recherche plein texte pourra remplacer la recherche actuelle pour de très grands volumes.

## Vérifications

```bash
npm test           # validation, recherche normalisée, export CSV
npm run typecheck  # TypeScript
npm run lint       # règles de code et d’accessibilité
npm run test:api   # serveur local lancé : CRUD, filtres, passages, export
npm run build      # version de production Cloudflare Worker
```

Le test API crée uniquement une fiche de test temporaire et la supprime, y compris en cas d’échec. `TEST_BASE_URL` permet de choisir un serveur local différent.

## Hébergement et accès

Le projet est préparé pour un hébergement **privé Sites**. La configuration `.openai/hosting.json` déclare la liaison SQLite D1 `DB`. Les migrations sont intégrées à la livraison.

Le serveur local est destiné au développement, sans connexion utilisateur. L’accès à la version hébergée est contrôlé par Sites. Ne pas exposer le serveur local directement sur Internet. L’application utilise un carnet partagé pour les utilisateurs autorisés du site ; elle n’ajoute pas de comptes ou de rôles internes.

Les données locales et la base hébergée sont séparées : un déploiement ne transfère pas les prospects saisis localement. L’export CSV permet leur récupération. L’usage local ne nécessite pas Internet une fois les dépendances installées ; la version hébergée nécessite une connexion et ne comprend pas de synchronisation hors ligne.

## Visuel de partage

`public/og.png` a été généré avec ImageGen (outil intégré). Brief : carte paysage aux couleurs de l’interface, blanc cassé, bleu cobalt et bleu marine, avec les textes « rencontre. », « Vos rencontres, bien en tête. », « Votre carnet de prospects IA » et deux cartes de contact.
