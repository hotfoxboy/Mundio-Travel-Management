# Mundio Travel Management

Plateforme SaaS de gestion de voyages d'affaires pour entreprises.

**Stack** : React + Vite · Node/Express · Supabase (Postgres + Auth) · Tailwind CSS

> Développé par L.A Dream Travel — solution white-label pour clients corporate.

## Structure

```
mundio-corporate/
├── frontend/     → React app (déployer sur Vercel)
└── backend/      → Express API (déployer sur Railway)
```

## Setup rapide

### 1. Supabase (5 min)
1. Créer un compte sur https://supabase.com
2. Nouveau projet → noter `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`
3. SQL Editor → coller `backend/supabase/schema.sql` → Run

### 2. Backend (Railway)
```bash
cd backend
cp .env.example .env     # remplir les variables
npm install
npm run dev              # localhost:4000
```

### 3. Frontend (Vercel)
```bash
cd frontend
cp .env.example .env     # remplir VITE_API_URL et VITE_SUPABASE_*
npm install
npm run dev              # localhost:5173
```

### 4. Déploiement
- **Backend** : connecter `backend/` à Railway → auto-deploy sur push GitHub
- **Frontend** : connecter `frontend/` à Vercel → auto-deploy sur push GitHub
- Mettre à jour `VITE_API_URL` dans Vercel avec l'URL Railway

## Numérotation des demandes
Format : `MND-2025-0001` (généré automatiquement par Supabase)

## Rôles utilisateurs
| Rôle | Accès |
|------|-------|
| traveler | Créer et voir ses propres demandes |
| manager | Gérer l'équipe, voir toutes les demandes |
| approver | Approuver/refuser les demandes |
| admin | Accès total (équipe L.A Dream) |
