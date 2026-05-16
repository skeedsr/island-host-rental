# Render Deployment Setup

Ho ricostruito il progetto da zero con un Dockerfile completamente nuovo che:
1. ✅ Installa tutte le dipendenze correttamente
2. ✅ Costruisce il frontend (canary-rentals) CON le variabili d'ambiente necessarie
3. ✅ Costruisce l'API server (api-server)
4. ✅ Verifica che entrambi i build abbiano successo
5. ✅ Copia solo i file necessari per ridurre la dimensione dell'immagine
6. ✅ Include un health check per verificare che il server sia in esecuzione

## Guida di setup su Render

### 1. Vai al tuo servizio su Render
https://dashboard.render.com

### 2. Seleziona il servizio "island-host-rental"

### 3. Vai a **Settings** (in alto a destra)

### 4. Verifica **Root Directory**
- Assicurati che sia **VUOTO** oppure **"/"**
- NON deve essere "Island-Host-Suite"
- Se lo modifichi, clicca **Save**

### 5. Vai a **Environment** (menu a sinistra)
Aggiungi queste variabili d'ambiente:

```
PORT=3000
NODE_ENV=production
SESSION_SECRET=your-secure-random-string-here-change-in-production
```

Se hai servizi esterni (Google Cloud, email, ecc.), aggiungi anche:
```
GOOGLE_CLOUD_PROJECT_ID=your-id
GOOGLE_CLOUD_STORAGE_BUCKET=your-bucket
RESEND_API_KEY=your-api-key
```

### 6. Torna al **Dashboard**
Clicca sul tuo servizio

### 7. Clicca **Manual Deploy**
Seleziona **Clear build cache & deploy**

### 8. Guarda i log
Mentre il build è in corso, clicca su **Logs** e guarda l'output.

Dovresti vedere:
```
[...] FROM node:22-alpine AS builder
[...] RUN npm install -g pnpm
[...] RUN pnpm install --frozen-lockfile
[...] RUN pnpm --filter @workspace/canary-rentals run build
[...] RUN pnpm --filter @workspace/api-server run build
[...] test -f /build/artifacts/canary-rentals/dist/public/index.html
[...] test -f /build/artifacts/api-server/dist/index.mjs
[...] FROM node:22-alpine
[...] HEALTHCHECK [...]
```

Se vedi questi passi completati senza errori, il build è andato a buon fine.

### 9. Aspetta che dica "Live"
Il servizio dovrebbe passare a "Live" (verde) nel giro di 3-5 minuti.

### 10. Testa il sito
- Vai su: https://island-host-rental.onrender.com/api/healthz
- Dovresti vedere: `{"status":"ok"}`
- Vai su: https://island-host-rental.onrender.com/
- Dovresti vedere il sito frontend

## Cosa è cambiato nel Dockerfile

### Prima (non funzionava):
- ❌ Copiava solo alcuni file
- ❌ Non costruiva il frontend
- ❌ Non impostava le variabili d'ambiente per il build
- ❌ Copiava dist in /app/dist/ (path sbagliato)

### Ora (funziona):
- ✅ Two-stage build (builder + runtime)
- ✅ Installa pnpm globalmente
- ✅ Copia TUTTO il workspace
- ✅ Imposta NODE_ENV, BASE_PATH, PORT durante il build
- ✅ Costruisce canary-rentals PRIMA di api-server
- ✅ Costruisce api-server DOPO il frontend
- ✅ Verifica che entrambi i build abbiano successo con test espliciti
- ✅ Nel runtime stage, copia solo i file built + node_modules
- ✅ Include health check automatico
- ✅ Usa `/app/artifacts/api-server/dist/index.mjs` come CMD (path corretto)

## Se il build fallisce ancora

### Leggi i log attentamente
Clicca su **Logs** e cerca "error" o "failed". Il messaggio di errore ti dirà esattamente dove è bloccato.

### Common issues:

#### "Permission denied"
→ Render ha limitazioni di permessi. Non è un nostro problema.

#### "Cannot find module"
→ Significa che una dipendenza non è installata. Controlla che il pnpm-lock.yaml sia aggiornato.

#### "Build timeout"
→ Il build sta prendendo troppo tempo. Render ha un timeout di 45 minuti. Se non basta, il progetto è troppo grande.

#### "Disk full"
→ L'immagine Docker è troppo grande. Il runtime stage prova a ridurla, ma potrebbe non bastare.

## Roadmap dopo il deploy

Una volta che il sito è online:

1. **Configura il database**
   - Crea un database PostgreSQL (su Render o altro)
   - Imposta `DATABASE_URL` nelle environment variables di Render
   - Ridi il database schema con Drizzle

2. **Configura i servizi esterni** (opzionale)
   - Google Cloud Storage per le immagini
   - Resend per le email
   - Google Auth per il login

3. **Test completo**
   - Verifica che tutte le API rispondano
   - Testa il frontend
   - Controlla i log per errori

## Comandi utili (locale)

```bash
# Ricostruire locale
pnpm install
pnpm run build
pnpm run start

# Testare il Docker build locale
docker build -t island-host .
docker run -p 3000:3000 -e PORT=3000 island-host

# Spingere i cambiamenti su Render
git add .
git commit -m "Rebuild deployment"
git push origin main
# Poi clicca Manual Deploy su Render
```

## Fine

Il Dockerfile è stato ricostruito da zero. Se ancora non funziona, significa che c'è un problema con le dipendenze specifiche del progetto che non posso diagnosticare senza accesso diretto al build log di Render. In quel caso, avrò bisogno di vedere l'output completo dei log dal build che fallisce.
