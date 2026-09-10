# Deployment notes

The application can be deployed as a single Node web service: Vite builds the frontend into `dist/` and Express serves that build together with the API.

## Required production services

1. A PostgreSQL database.
2. Persistent image storage. Cloudinary is the recommended option for this project; alternatively use a host-mounted persistent volume and set `UPLOAD_DIR`.
3. A production `ADMIN_PIN`.

The server intentionally refuses to start in production if `DATABASE_URL` is missing, or if image persistence is not configured. This prevents a successful-looking deploy that later loses products or photos.

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
ADMIN_PIN=<strong private pin>
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
- Use a private production admin PIN and never commit it.
- Upload only real catalog/outfit content.
- Verify an image remains available after a redeploy/restart.
- Verify a product remains available after a redeploy/restart.
- Test the admin upload flow from the owner's phone.
- Run the smoke test against the final public URL.
