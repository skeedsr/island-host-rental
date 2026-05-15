# 🚀 Guida Deploy su Railway

## Prerequisiti
- Account GitHub (dove hai pushato il codice)
- Account Railway (gratuito: https://railway.app)

## Step 1: Creare Account Railway
1. Vai su https://railway.app
2. Clicca "Sign Up" (puoi usare GitHub)
3. Connetti il tuo account GitHub

## Step 2: Creare Nuovo Progetto
1. Nel dashboard Railway, clicca "New Project"
2. Seleziona "Deploy from GitHub repo"
3. Seleziona il tuo repo `Island-Host-Suite`

## Step 3: Configurare il Servizio
Railway autodetecterà che è un progetto Node.js e creerà il servizio.

### Environment Variables Necessarie:

Vai su "Variables" e aggiungi:

```
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<database>
PORT=3000
NODE_ENV=production
SESSION_SECRET=your-secret-key-here
```

## Step 4: Aggiungere Database PostgreSQL
1. Nel dashboard del progetto, clicca "+ Add Service"
2. Seleziona "Database" → "PostgreSQL"
3. Aspetta che si crei

Railway aggiungerà automaticamente `DATABASE_URL` con la connessione.

## Step 5: Run Migrations (se necessario)
Se hai migrazioni Drizzle:
```bash
pnpm run db:push
```

Puoi eseguirlo dalle Railway "Deployments" cliccando sul servizio e usando il terminale.

## Step 6: Deploy
Il deploy partirà automaticamente quando fai il push a GitHub.

Puoi monitare il log in tempo reale nel dashboard Railway.

---

## 📊 Costi Stimati
- **Free Tier**: $5 credit/mese
- **Tipico**: ~$2-5/mese per hosting + database
- **Scalato**: ~$20-50/mese con traffico alto

---

## 🔧 Troubleshooting

### Build fails
Controlla che `pnpm install` funzioni localmente:
```bash
cd Island-Host-Suite
pnpm install
```

### Database connection error
Verifica che `DATABASE_URL` sia corretta nel Railway dashboard.

### Frontend non carica
Il frontend deve essere buildato e servito dal backend Express in produzione.

---

## 📝 Comandi Locali

```bash
# Installa dipendenze
pnpm install

# Sviluppo
pnpm run dev

# Build
pnpm run build

# Start produzione
pnpm run start

# Push schema database (Drizzle)
pnpm --filter @workspace/db run push
```

---

**Pronto? Comincia dal Step 1!** 🎯
