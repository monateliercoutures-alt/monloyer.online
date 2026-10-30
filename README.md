# monloyer.online

**Logiciel de gestion locative (SaaS) pour propriétaires, agences immobilières et résidences en Côte d'Ivoire et en Afrique de l'Ouest.**

Baux, échéanciers, encaissements Mobile Money, quittances PDF, relances WhatsApp/SMS/e-mail, relevés de gérance, espaces propriétaire et locataire — interface 100 % française, mobile-first, thème clair/sombre, montants en **FCFA**, fuseau **Africa/Abidjan**.

---

## 1. Fonctionnalités du MVP

| Module | Contenu |
| --- | --- |
| **Authentification** | E-mail + mot de passe (bcrypt), connexion par téléphone (code OTP à 6 chiffres), sessions httpOnly en base (jeton haché), invitations par lien pour collaborateurs / propriétaires / locataires |
| **Rôles** | `SUPER_ADMIN`, `ADMIN_AGENCE`, `AGENT`, `PROPRIETAIRE`, `LOCATAIRE`, `COMPTABLE` — matrice de permissions vérifiée côté serveur |
| **Propriétaires** | CRUD, mandat de gestion (type, dates), commission (% ou montant fixe), coordonnées de reversement, fiche avec biens et contrats |
| **Biens & logements** | CRUD biens (appartement, villa, studio, chambre, boutique, bureau, immeuble), statuts (libre / occupé / en travaux), photos, logements multiples (immeuble), **import Excel/CSV** |
| **Locataires** | CRUD, pièce d'identité, profession, garant, contacts d'urgence, historique de paiements et de quittances |
| **Contrats** | Assistant en 3 étapes, génération de l'échéancier, PDF du bail, alerte d'expiration, résiliation avec préavis et motif |
| **Loyers** | Échéancier automatique, statuts (à venir / partiel / payé / en retard), pénalités de retard paramétrables |
| **Paiements** | Saisie manuelle (espèces, virement, Mobile Money, chèque), paiements partiels, justificatif, annulation avec motif (jamais de suppression) |
| **Quittances** | Numérotation séquentielle par organisation (`QUI-2026-0001`), PDF avec logo et cachet, téléchargement, envoi WhatsApp / e-mail |
| **Relances** | Décalages paramétrables (J-3, J0, J+3, J+7, J+15), canaux WhatsApp/SMS/e-mail, modèle avec variables `{nom}`, `{montant}`, `{date}`…, envoi en un clic + cron quotidien |
| **Tableau de bord** | Attendu vs encaissé, impayés, taux d'occupation, biens vacants, contrats à échéance, tendance 6 mois |
| **Relevé de gérance** | Par propriétaire et par mois : loyers encaissés, commission, charges, net à reverser — export PDF |
| **Espaces** | Locataire (contrat, quittances, solde) et propriétaire (biens, loyers, relevés) |
| **Paramètres** | Logo, couleur, taux de commission, pénalités, délais de relance, modèle de message, numérotation des quittances, équipe & invitations |
| **Journal d'activité** | Qui a fait quoi, quand (créations, paiements, annulations, envois) |

### Règles métier implémentées

- Un logement ne peut avoir **qu'un seul bail actif** (contrôle transactionnel) ; à la signature le logement passe à *occupé*, à la résiliation il repasse à *libre*.
- Un **paiement partiel** conserve le solde dû sur l'échéance ; la quittance mentionne le montant réellement encaissé et le reste dû.
- **Commission** = pourcentage ou montant fixe du mandat propriétaire (barème de l'agence en repli).
- **Numérotation** séquentielle et atomique des quittances par organisation.
- **Aucune suppression définitive de paiement** : annulation avec motif, horodatage et trace au journal (la quittance liée est retirée et l'échéance recalculée).
- **Pénalités** : % du loyer par mois de retard commencé, après un délai de tolérance paramétrable.

---

## 2. Stack technique

- **Next.js 15 (App Router) + TypeScript strict** — React 19
- **Tailwind CSS v4 + composants shadcn/ui** (Radix UI) + **Lucide Icons**
- **PostgreSQL (Neon)** avec **Prisma 6** et le driver adapter `@prisma/adapter-pg`
- **Zod** sur toutes les routes API et tous les formulaires
- **pdf-lib** pour les PDF (quittances, contrats, relevés) — aucune dépendance native
- **Déploiement Vercel** + cron quotidien des relances
- Postgres local **PGlite** (WASM) pour la démonstration hors ligne (`npm run db:local`)

---

## 3. Démarrage rapide

### 3.1 Mode démonstration local (sans Neon ni Postgres installé)

```bash
npm install
cp .env.example .env
# .env → DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5433/postgres?schema=public"
npm run db:local      # démarre Postgres (WASM), applique la migration et le seed
npm run dev           # http://localhost:3000
```

`npm run db:local` laisse le terminal occupé (base de données). Lancez `npm run dev` dans un second terminal.
Pour repartir de zéro : `npm run db:local:reset`.

### 3.2 Avec Neon (recommandé en production)

1. Créez un projet sur [console.neon.tech](https://console.neon.tech) et copiez la *connection string* (pooled, `sslmode=require`).
2. Renseignez `DATABASE_URL` dans `.env`.
3. Appliquez le schéma et chargez les données de démonstration :

```bash
npx prisma generate          # génère le client
npx prisma migrate deploy    # applique prisma/migrations
npm run db:seed              # jeu de données réaliste (optionnel)
npm run dev
```

### 3.3 Comptes de démonstration

| Rôle | E-mail | Mot de passe |
| --- | --- | --- |
| Administrateur d'agence | `admin@monloyer.ci` | `Demo1234!` |
| Agent | `agent@monloyer.ci` | `Demo1234!` |
| Comptable | `comptable@monloyer.ci` | `Demo1234!` |
| Propriétaire | `proprietaire@monloyer.ci` | `Demo1234!` |
| Locataire | `locataire@monloyer.ci` | `Demo1234!` |

Connexion par téléphone : utilisez l'un des numéros du seed (ex. `07 08 11 22 33`) ; en local, le code OTP s'affiche dans la réponse API et dans les logs serveur (`OTP_DEBUG_CODE=true`).

---

## 4. Variables d'environnement

| Variable | Obligatoire | Description |
| --- | --- | --- |
| `DATABASE_URL` | oui | Chaîne de connexion PostgreSQL (Neon en production) |
| `NEXT_PUBLIC_APP_URL` | oui | URL publique (liens d'invitation) |
| `CRON_SECRET` | oui en prod | Protège `/api/cron/relances` (Vercel Cron envoie `Authorization: Bearer $CRON_SECRET`) |
| `OTP_DEBUG_CODE` | non | `true` en local : renvoie le code OTP dans la réponse API |
| `SMS_PROVIDER_API_KEY` | non | Emplacement prévu pour un fournisseur SMS/WhatsApp |

---

## 5. Déploiement sur Vercel

1. Poussez le dépôt sur GitHub, puis **Import Project** sur Vercel.
2. Renseignez les variables d'environnement (`DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`).
3. Le build exécute `prisma generate` (via `postinstall`). Appliquez les migrations une fois :
   `npx prisma migrate deploy` (ou depuis un job/CI).
4. `vercel.json` déclare le cron quotidien `/api/cron/relances` (06:00 UTC) : il recalcule les pénalités et génère les relances dues.

> Le client Prisma est généré avec le **query compiler WASM** (`previewFeatures = ["driverAdapters", "queryCompiler"]`) : pas de binaire Rust à embarquer, compatible avec le runtime Node de Vercel.

---

## 6. Architecture du code

```
src/
├── app/
│   ├── (auth)/                 # connexion, inscription, invitation
│   ├── (app)/                  # espace connecté (sidebar desktop + barre mobile)
│   │   ├── tableau-de-bord/    # KPI agence
│   │   ├── proprietaires/      # liste + fiche
│   │   ├── biens/              # liste, fiche, import Excel/CSV
│   │   ├── locataires/         # liste + dossier
│   │   ├── contrats/           # liste, assistant 3 étapes, fiche
│   │   ├── loyers/             # échéancier
│   │   ├── paiements/          # encaissements
│   │   ├── quittances/         # PDF + envoi WhatsApp/e-mail
│   │   ├── relances/           # file d'envoi
│   │   ├── depenses/
│   │   ├── releves/            # relevé de gérance + export PDF
│   │   ├── parametres/         # agence, finances, relances, numérotation, équipe
│   │   ├── journal/            # journal d'activité
│   │   └── mon-espace/         # portails locataire & propriétaire
│   └── api/                    # routes REST (Zod + permissions)
├── components/
│   ├── ui/                     # primitives shadcn/ui, tableau générique, badges
│   ├── layout/                 # sidebar, navigation mobile, menu utilisateur
│   ├── forms/                  # formulaires (propriétaire, bien, bail, paiement…)
│   └── tables/
├── lib/                        # formatage FCFA, règles de loyer, validations Zod, permissions
└── server/
    ├── db.ts                   # client Prisma (driver adapter pg)
    ├── session.ts              # sessions httpOnly + garde-fous serveur
    ├── http.ts                 # erreurs API normalisées
    ├── pdf.ts                  # moteur PDF (en-tête, tableaux, cachet)
    └── services/               # logique métier (multi-tenant)
prisma/
├── schema.prisma               # 17 modèles, 16 énumérations
├── migrations/                 # migration initiale SQL
└── seed.ts                     # données de démonstration (quartiers d'Abidjan)
scripts/
├── dev-db.mjs                  # Postgres local PGlite + migration + seed
└── offline-prisma-generate.mjs # génération du client sans accès au CDN Prisma (CI verrouillée)
```

### Multi-tenant & sécurité

- Chaque table métier porte un `organizationId` ; **toutes** les requêtes serveur filtrent sur l'organisation issue de la session (aucun `organizationId` n'est accepté depuis le client).
- Les permissions sont vérifiées **côté serveur** (`requirePermission`, `requireApiUser(permission)`), pas seulement dans l'interface.
- Sessions : jeton aléatoire 256 bits, stocké **haché** (SHA-256) en base, cookie `httpOnly` + `secure` en production, révocation à la déconnexion, expiration 30 jours.
- Mots de passe : bcrypt (10 rounds). OTP : code à 6 chiffres haché, 10 minutes, 5 tentatives max, 3 demandes / 10 minutes.
- Journal d'activité horodaté pour les actions sensibles (paiements, annulations, résiliations, envois).

---

## 7. API principale

| Méthode | Route | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | Création d'une organisation + administrateur |
| POST | `/api/auth/login` · `/api/auth/logout` | Connexion / déconnexion |
| POST | `/api/auth/otp/request` · `/api/auth/otp/verify` | Connexion par téléphone |
| POST | `/api/invitations/accept` | Acceptation d'une invitation |
| GET/POST | `/api/owners`, `/api/properties`, `/api/tenants`, `/api/leases`, `/api/payments`, `/api/expenses`, `/api/reminders` | CRUD métier |
| POST | `/api/properties/import` | Import Excel/CSV |
| POST | `/api/leases/[id]/terminate` | Résiliation avec préavis |
| POST | `/api/payments/[id]/cancel` | Annulation motivée |
| PATCH | `/api/settings` · `/api/team/members/[id]` | Paramètres et équipe |
| GET | `/api/pdf/quittance/[id]` · `/api/pdf/contrat/[id]` · `/api/pdf/releve?ownerId&month` | Documents PDF |
| GET | `/api/cron/relances` | Cron quotidien (protégé par `CRON_SECRET`) |

---

## 8. Limites connues du MVP & pistes

- **Stockage des fichiers** : photos et justificatifs sont stockés en base64 dans le MVP ; passer à Vercel Blob / S3 en production.
- **Envoi réel des relances** : WhatsApp/SMS sont ouverts via `wa.me` / `sms:` (ou e-mail via `mailto:`), avec traçage de l'envoi. Brancher Twilio / Orange SMS API dans `requestPhoneOtp` et `markReminderSent`.
- **Paiement en ligne** : non inclus (saisie manuelle + Mobile Money référence).
- **Tests** : les parcours critiques ont été vérifiés manuellement ; ajouter Vitest/Playwright avant mise en production.
- **Comptabilité avancée** : rapprochement bancaire, multi-devises, TVA sur commissions.
