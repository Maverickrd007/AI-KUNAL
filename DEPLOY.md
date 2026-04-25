# Deploy AstraML

The production deployment runs three containers:

- `frontend`: Nginx serving the built React app and proxying `/api` + `/ws`
- `backend`: compiled Express API on port `3001`
- `ml-service`: FastAPI ML service on port `8000`

Only the frontend container needs to be public.

## 1. Prepare Environment

```bash
cp .env.example .env
```

Set these values in `.env`:

```bash
GROQ_API_KEY=...
GEMINI_API_KEY=...
JWT_SECRET=replace_with_a_long_random_secret
FRONTEND_ORIGIN=https://your-domain.com
WEB_PORT=80
```

For a quick test without a domain, use:

```bash
FRONTEND_ORIGIN=http://localhost
WEB_PORT=8080
```

## 2. Deploy With Docker Compose

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

Check health:

```bash
docker compose -f docker-compose.prod.yml ps
curl http://localhost/health
```

The app will be available at:

```text
http://localhost
```

or, if `WEB_PORT=8080`:

```text
http://localhost:8080
```

## 3. VPS Deployment

On a server:

```bash
git clone <your-repo-url> astraml
cd astraml
cp .env.example .env
nano .env
docker compose -f docker-compose.prod.yml up --build -d
```

Point your domain to the server and put Caddy, Nginx Proxy Manager, or a cloud load balancer in front of port `80` for HTTPS.

## 4. Persistent Data

Production Compose creates named volumes for:

- `backend_uploads`: uploaded datasets
- `backend_db`: SQLite experiments and chat sessions
- `ml_model_cache`: saved model sessions and profiles

Back them up before rebuilding or migrating servers.

## 5. Logs

```bash
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f ml-service
```

## 6. Stop

```bash
docker compose -f docker-compose.prod.yml down
```
