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

Pagina web de reservas para un estudio de indoor cycling . Nuestra meta actual es integrar una nueva sucursal en la pagina web, Uso de créditos entre sucursales: confirmar si los créditos de una sucursal (ej. Sahagún) pueden utilizarse en otra (ej. Apan). NO SE PUEDE DEBEN DE COMPRAR ESPECÍFICAMENTE CRÉDITOS PARA CADA SUCURSAL. LA IDEA ES QUE LO PRIMERO QUE SALGA AL ENTRAR A LA PÁGINA DE INNATA SEA LA OPCIÓN DE SELECCIONAR SUCURSAL, POSTERIORMENTE QUE CADA SUCURSAL TENGA SU INFORMACIÓN INDEPENDIENTE. Salas (salones): 2. 1 EN SAHAGÚN, 1 EN APAN. AMBOS DE INDOOR CYCLING. Número de salas por sucursal ( nueva). 1. Si existe plan de abrir una sala adicional en el corto/mediano plazo. NO Confirmar si las salas comparten el mismo layout de bicis o si hay variaciones. NO LO COMPARTEN. SAHAGÚN PRIMERA VEZ: 80 30 DÍAS PASE INDIVIDUAL: 100 30 DÍAS SEMANA ILIMITADA: 399 20 CLASES LUNES A VIERNES PAQUETE 10 CLASES: 899 30 DÍAS PAQUETE 20 CLASES: 1899 60 DÍAS MES ILIMITADO: 1599 30 DÍAS Datos de la nueva sucursal: nombre oficial y cantidad de salas. INNATA SAHAGÚN. 1 SALA. Idea central Mismos paquetes, mismos tipos de clase, precios diferentes por sucursal, créditos NO transferibles entre sucursales. La sucursal es lo primero que ve el usuario al entrar. Base de datos Dos tablas nuevas: branches (con el layout de bicis de cada sala en JSON) y package_prices (precio + Stripe Price ID por cada combinación paquete-sucursal, 8 filas totales). Solo se agrega branch_id como campo nuevo a scheduled_classes y user_packages. Nada más cambia en el schema existente. La regla fundamental El branch_id del UserPackage debe coincidir con el branch_id de la ScheduledClass. Si no coinciden, no se puede reservar. Backend Un endpoint nuevo público GET /api/branches. El resto son modificaciones a endpoints existentes para recibir y propagar el branchId a través de todos los flujos: consulta de paquetes con precio correcto, creación de clases, reservas de usuario, reservas de admin, pagos en efectivo, pagos con Stripe, webhook y asignación de paquetes. Frontend Un BranchContext global que persiste la sucursal en localStorage. Selector de sucursal al primer ingreso. El branchId activo viaja en todos los fetches. Los layouts de bicis dejan de estar hardcodeados y se leen del JSON de la sucursal. Los precios hardcodeados en admin se eliminan y se leen de la API. Lo que NO cambia La tabla packages, la lógica de semana ilimitada, el flujo de Stripe, el sistema de check-in, las notificaciones, los emails y toda la lógica de cancelaciones y waitlist.
En la base de datos es:
Apan 2 
Sahagún 1 