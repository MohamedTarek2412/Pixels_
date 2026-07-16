# Deployment Notes

## Required environment variables on Vercel

Set these in Project Settings → Environment Variables:

- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `NODE_ENV=production`

## Recommended Vercel settings

- Framework Preset: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`
- Node.js Version: `20`

## Important notes

1. Prisma needs a PostgreSQL database.
2. Run `npm run db:push` once after deployment or in a Vercel Post-Deploy script.
3. The login cookie uses `httpOnly` and `secure` in production, so `JWT_SECRET` must be set in Vercel.
4. If the app is protected by middleware, verify that the deployment domain is allowed to use the auth cookie correctly.

## After deploy

1. Open the app URL.
2. Sign in with the seeded admin credentials.
3. Change the default password immediately.
