# Setup Guide

This guide will walk you through setting up the AI Math Tutor application on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher recommended)
- **Bun** (v1.0 or higher) - [Install Bun](https://bun.sh/docs/installation)
- **Git** (for cloning the repository)

## Step 1: Clone the Repository

```bash
git clone <repository-url>
cd ai-math-tutor
```

## Step 2: Install Dependencies

```bash
bun install
```

## Step 3: Set Up External Services

### 3.1 Clerk Authentication

1. Create a free account at [Clerk](https://clerk.com)
2. Create a new application
3. In the Clerk dashboard, navigate to **API Keys**
4. Copy your **Publishable Key** and **Secret Key**
5. Go to **JWT Templates** → **Convex** template (or create a custom one)
6. Note your **Issuer** domain (e.g., `your-app.clerk.accounts.dev`)

### 3.2 Convex Database

1. Create a free account at [Convex](https://convex.dev)
2. Create a new project
3. Copy your deployment URL (looks like `https://xyz.convex.cloud`)
4. You'll configure Clerk authentication in Convex later (see Step 5)

### 3.3 Anthropic API

1. Create an account at [Anthropic](https://console.anthropic.com)
2. Navigate to **API Keys**
3. Create a new API key
4. Copy the key (starts with `sk-ant-`)

## Step 4: Configure Environment Variables

Create a `.env.local` file in the root of your project:

```bash
touch .env.local
```

Add the following environment variables:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_JWT_ISSUER_DOMAIN=your-app.clerk.accounts.dev

# Convex Database
NEXT_PUBLIC_CONVEX_URL=https://xyz.convex.cloud

# Anthropic API
ANTHROPIC_API_KEY=sk-ant-...
```

**Important Notes:**
- Replace all placeholder values (`...`) with your actual keys
- The `CLERK_JWT_ISSUER_DOMAIN` should be just the domain without `https://`
- Never commit `.env.local` to version control (it's already in `.gitignore`)

## Step 5: Configure Convex Authentication

1. Run the Convex development server:
   ```bash
   bun run convex-dev
   ```

2. The Convex dashboard will open automatically in your browser

3. Navigate to **Settings** → **Environment Variables**

4. Add the following environment variable:
   ```
   CLERK_JWT_ISSUER_DOMAIN=your-app.clerk.accounts.dev
   ```
   (Use the same value as in your `.env.local`)

5. The Convex backend will automatically restart with the new configuration

## Step 6: Run the Application

You have two options for running the application:

### Option A: Run Everything (Recommended)

This runs both the Convex backend and Next.js frontend in parallel:

```bash
bun run dev
```

### Option B: Run Separately

In separate terminal windows:

**Terminal 1 - Convex Backend:**
```bash
bun run convex-dev
```

**Terminal 2 - Next.js Frontend:**
```bash
bun run next-dev --turbopack
```

## Step 7: Access the Application

1. Open your browser and navigate to [http://localhost:3000](http://localhost:3000)
2. You'll be redirected to Clerk's authentication page
3. Sign up or sign in with your preferred method
4. Once authenticated, you'll see the AI Math Tutor interface

## Verification Checklist

After setup, verify everything is working:

- [ ] Application loads at `http://localhost:3000`
- [ ] You can sign in via Clerk authentication
- [ ] You can create a new conversation
- [ ] You can send a message and receive a response from Claude
- [ ] You can upload images (file picker, paste, or drag & drop)
- [ ] Messages persist when you refresh the page
- [ ] You can create multiple conversations and switch between them

## Troubleshooting

### Issue: "Authentication failed" error

**Solution:** Verify that:
- `CLERK_JWT_ISSUER_DOMAIN` matches in both `.env.local` and Convex dashboard
- Your Clerk publishable and secret keys are correct
- You've created a JWT template in Clerk (can use the Convex template)

### Issue: Convex queries fail or return null

**Solution:**
- Check that Convex is running (`bun run convex-dev`)
- Verify `NEXT_PUBLIC_CONVEX_URL` is correct
- Check the Convex dashboard logs for errors
- Ensure you're authenticated (Clerk session is active)

### Issue: Claude API returns errors

**Solution:**
- Verify your `ANTHROPIC_API_KEY` is valid and has credits
- Check the Network tab in browser DevTools for API responses
- Ensure you're using a supported Claude model (currently Sonnet 4.5)

### Issue: Images won't upload

**Solution:**
- Ensure the image is a valid format (JPEG, PNG, WebP, GIF)
- Check browser console for errors
- Verify Convex storage is enabled in your Convex project

### Issue: "Module not found" errors

**Solution:**
- Run `bun install` again to ensure all dependencies are installed
- Delete `node_modules` and `.next` folders, then reinstall:
  ```bash
  rm -rf node_modules .next
  bun install
  ```

## Production Deployment

### Deploy to Vercel (Recommended for Next.js)

1. Install Vercel CLI:
   ```bash
   bun add -g vercel
   ```

2. Deploy Convex first:
   ```bash
   bunx convex deploy
   ```
   This will give you a production Convex URL.

3. Update your `.env.local` with the production Convex URL

4. Deploy to Vercel:
   ```bash
   vercel
   ```

5. In Vercel dashboard, add all environment variables from `.env.local`

6. Ensure your Clerk production instance is configured with the Vercel domain

### Environment Variables for Production

Make sure to set these in your hosting platform:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (production key)
- `CLERK_SECRET_KEY` (production key)
- `CLERK_JWT_ISSUER_DOMAIN` (production domain)
- `NEXT_PUBLIC_CONVEX_URL` (production Convex URL)
- `ANTHROPIC_API_KEY`

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Convex Documentation](https://docs.convex.dev)
- [Clerk Documentation](https://clerk.com/docs)
- [Anthropic API Documentation](https://docs.anthropic.com)
- [Bun Documentation](https://bun.sh/docs)

## Getting Help

If you encounter issues not covered in this guide:

1. Check the [CLAUDE.md](./CLAUDE.md) file for architectural details
2. Review the [problem-testing.md](./docs/problem-testing.md) for testing guidance
3. Check the browser console and Convex dashboard logs for errors
4. Ensure all environment variables are correctly configured

## Next Steps

Once your application is running:

1. Review the [CLAUDE.md](./CLAUDE.md) file to understand the architecture
2. Read the [problem-testing.md](./docs/problem-testing.md) for testing the Socratic tutoring behavior
3. Start a conversation and try asking for help with a math problem!
