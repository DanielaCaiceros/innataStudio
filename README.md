# Project Title (Replace with actual title)

## Deployment to Vercel

This project is deployed using Vercel.

### Project Configuration on Vercel

*   Vercel automatically detects this as a Next.js project.
*   A `vercel.json` file is included in this repository to ensure the Vercel build command is `prisma generate && next build`. This is necessary to generate the Prisma Client before building the Next.js application.

### Environment Variables

The following environment variables must be configured in your Vercel project settings (under Settings > Environment Variables):

*   `DATABASE_URL`: The connection string for your production database.
*   `NEXTAUTH_URL`: The canonical URL of your deployment (e.g., `https://your-domain.com`). Vercel often sets this automatically.
*   `NEXTAUTH_SECRET`: A randomly generated secret string for NextAuth.js token encryption. Generate one using `openssl rand -base64 32`.
*   `STRIPE_SECRET_KEY`: Your Stripe secret API key (e.g., `sk_live_...`).
*   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Your Stripe publishable API key (e.g., `pk_live_...`).
*   `RESEND_API_KEY`: (If using Resend for emails) Your Resend API key.
*   _(Add any other required environment variables here, e.g., for other email providers or third-party services)_

**Important:** Never commit the actual values of these secrets to the repository.

### Database Migrations

This project uses Prisma for database management. After a deployment that includes changes to the database schema (changes in `prisma/schema.prisma`), you need to apply these migrations to your production database.

1.  **Ensure your local `DATABASE_URL` environment variable temporarily points to your PRODUCTION database.** Be extremely careful with this step.
2.  Run the command:
    ```bash
    npx prisma migrate deploy
    ```
3.  It's recommended to revert your local `DATABASE_URL` to your development database connection string after running production migrations.

### Triggering Deployments

*   Deployments are automatically triggered when changes are pushed to the `main` branch (or your designated production branch).
*   You can also manually trigger a redeployment from the Vercel dashboard for your project.
