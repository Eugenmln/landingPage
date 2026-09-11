# Deployment notes

The application can be deployed as a single Node web service: Vite builds the frontend into `dist/` and Express serves that build together with the API.

## Required production services

1. A PostgreSQL database.
2. Persistent image storage. Cloudinary is the recommended option for this project; alternatively use a host-mounted persistent volume and set `UPLOAD_DIR`.
3. Admin credentials plus a private authentication secret.

The server intentionally refuses to start in production if `DATABASE_URL` is missing, or if image persistence is not configured. Authentication also refuses to initialize unless the admin email, password and a sufficiently long auth secret are configured.

## Build and start

```bash
npm install
npm run build
npm start
```

The host must expose the port provided through `PORT`.

## Required environment variables

```env
NODE_ENV=production
ADMIN_EMAIL=<private admin email>
ADMIN_PASSWORD=<strong private password>
AUTH_SECRET=<random secret at least 32 characters>
AUTH_SESSION_HOURS=8
DATABASE_URL=<postgres connection string>
DB_SSL=true
```

For Cloudinary:

```env
CLOUDINARY_CLOUD_NAME=<cloud name>
CLOUDINARY_API_KEY=<api key>
CLOUDINARY_API_SECRET=<api secret>
CLOUDINARY_FOLDER=kenza
```

If the frontend and API are served from the same deployment, `CORS_ORIGIN` can remain empty. If they are separated, set it to the allowed browser origins separated by commas.

## Admin authentication

Admin writes no longer use a shared PIN header. The API exposes:

```text
POST /api/admin/login
GET  /api/admin/session
POST /api/admin/logout
```

A successful login creates an HttpOnly session cookie. In production it is also Secure and SameSite=Strict. The browser never needs direct access to the signed session token.

Login attempts are rate limited, and all product/outfit/settings/upload mutations require an authenticated admin session.

## Health check

After deployment:

```text
GET /api/health
```

A healthy production response should report `database: "postgres"` and either `images: "cloudinary"` or persistent local storage.

The repository also includes a non-destructive smoke test:

```bash
API_URL=https://your-deployment.example npm run smoke:api
```

It verifies health, public store retrieval, and that anonymous admin writes are rejected.

## Docker

A production `Dockerfile` is included. It builds the Vite application and starts the Express server on `PORT`.

## Before handing the site to the client

- Replace all placeholder phone/Instagram values with the real store information.
- Use a private admin email/password and a long random `AUTH_SECRET`; never commit secrets.
- Upload only real catalog/outfit content.
- Verify an image remains available after a redeploy/restart.
- Verify a product remains available after a redeploy/restart.
- Test the admin login and upload flow from the owner's phone.
- Run the smoke test against the final public URL.
