# chat-SD

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app).

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_WLsu3l8Jd7oJgNCCuiClOCzAqCwj)

## Getting Started

### Connect Supabase

Create `.env.local` from `.env.example` and fill it with your project values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000/auth/callback
```

In Supabase:

1. Open **Project Settings > API** and copy the **Project URL** and **anon public** key into `.env.local`.
2. Open **SQL Editor** and run `scripts/001_create_schema.sql`.
3. Run `scripts/002_create_storage.sql` to create the `chat-attachments` bucket used by uploads.
4. In **Authentication > URL Configuration**, set the site URL to `http://localhost:3000` for local development and add `http://localhost:3000/auth/callback` to redirect URLs.

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.

<a href="https://v0.app/chat/api/kiro/clone/Adilshaguala/chat-SD" alt="Open in Kiro"><img src="https://pdgvvgmkdvyeydso.public.blob.vercel-storage.com/open%20in%20kiro.svg?sanitize=true" /></a>
