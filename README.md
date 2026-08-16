# TFH Resources Microsite

A GitHub/Vercel starter for a standalone The Français Hub digital-resource store.

## Stack
- Next.js frontend + server routes
- Vercel deployment
- Razorpay Standard Checkout
- Supabase Postgres + private Storage
- Resend transactional email

## Important security properties
- Product prices are loaded server-side.
- Razorpay Key Secret is never sent to the browser.
- Checkout signatures are verified server-side.
- Razorpay payment state is checked before browser delivery.
- Webhook signatures are verified from the raw request body.
- Paid PDFs live in a private Supabase bucket.
- Downloads are served through short-lived signed URLs.
- Browser/anon access to commerce tables is blocked with RLS.

## 1. Preview the design without payments
Clone/download this repo.

```bash
npm install
npm run dev
```

Open http://localhost:3000

Without Supabase environment variables the site uses three demo catalogue entries so you can inspect the design.

## 2. Create Supabase
Create a project, then open:
SQL Editor -> New query

Paste and run:
`supabase/schema.sql`

Then:
Storage -> `paid-resources`

Confirm the bucket says PRIVATE.

## 3. Add your PDFs
Upload the actual PDF files to the private `paid-resources` bucket.

Follow:
`supabase/ADDING_A_PRODUCT.md`

Do not put paid PDFs in `/public`, GitHub, or a public Google Drive link.

## 4. Create Razorpay TEST credentials
In Razorpay Dashboard use Test Mode first.
Create/copy:
- Key ID
- Key Secret

Do not commit Key Secret to GitHub.

Make sure your Razorpay account is configured to capture successful payments. The code only unlocks a browser download after the payment reports `captured`.

## 5. Create Resend
Add and verify a sending domain/subdomain.
Create an API key.
Use an address such as:
`The Français Hub <resources@updates.yourdomain.com>`

## 6. Local environment
Copy `.env.example` to `.env.local`.

Fill in the TEST values.

For local testing:
`SITE_URL=http://localhost:3000`

## 7. Push to GitHub
Create a new repository, e.g.
`tfh-resources`

Push every file EXCEPT `.env.local`.

## 8. Deploy to Vercel
Vercel -> Add New -> Project -> Import your GitHub repo.

In Vercel:
Project -> Settings -> Environment Variables

Add:
- RAZORPAY_KEY_ID
- RAZORPAY_KEY_SECRET
- RAZORPAY_WEBHOOK_SECRET
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_STORAGE_BUCKET = paid-resources
- RESEND_API_KEY
- RESEND_FROM_EMAIL
- SITE_URL

Redeploy after adding/updating environment variables.

## 9. Configure Razorpay webhook
In Razorpay Test Mode create a payment webhook.

Webhook URL:
`https://YOUR-VERCEL-DOMAIN/api/razorpay-webhook`

Use the same long random value as `RAZORPAY_WEBHOOK_SECRET`.

Subscribe at minimum to:
- `order.paid`
- `payment.captured`

## 10. Test end-to-end
Test:
1. Catalogue loads.
2. Specific resource page opens.
3. Buyer name/email is required.
4. Correct amount opens in Razorpay.
5. Successful payment verifies.
6. Success state appears.
7. Delivery email arrives.
8. Email link opens the private download page.
9. Correct files appear.
10. Download redirects to a temporary Supabase signed URL.
11. Failed payment unlocks nothing.
12. Direct Supabase storage URL is not public.
13. Replaying the browser success does not create a second paid order.
14. Webhook is accepted only with a valid Razorpay signature.

## 11. Custom domain
Recommended:
`resources.thefrancaishub.com`

In Vercel:
Project -> Settings -> Domains -> Add domain.

Vercel will show the DNS record required. Add that exact record at the DNS provider for the main TFH domain.

Then change:
`SITE_URL=https://resources.thefrancaishub.com`

Redeploy.

## 12. Go live
Only after TEST mode is fully working:
- Complete Razorpay activation/KYC.
- Replace TEST Key ID and Secret in Vercel with LIVE credentials.
- Create the webhook again in Razorpay LIVE mode.
- Keep TEST and LIVE secrets separate.
- Run one low-value real transaction yourself.
- Confirm payment, email and download.

## TFH design notes
The starter intentionally avoids generic ecommerce UI:
- Porcelain `#F5F2EC`
- Ink `#171719`
- French Ink `#17283B`
- Bordeaux `#8A2938`
- Stone `#DAD5CD`
- Instrument Serif display type
- Manrope UI/body type
- editorial grid
- thin rules
- restrained CTAs
- no gradients/glassmorphism/marketplace clutter

Replace the text wordmark or cover artwork with the exact TFH assets from the existing website before launch.

# Admin Panel Upgrade

This version adds a private TFH Resource Studio at `/admin`.

1. In Supabase SQL Editor run `supabase/admin-upgrade.sql` once.
2. Keep the Supabase values already added to `.env.local`, including `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. Follow `supabase/MAKE_ADMIN.md` to create/approve Yana's login.
4. Restart with `npm run dev`.
5. Open `http://localhost:3000/admin`.

The admin can add a new PDF, upload a cover, enter a rupee price, publish it, edit its details/price, and publish/unpublish it later. Paid PDFs remain in the private `paid-resources` bucket. Cover images go to the public `resource-covers` bucket. Uploads use short-lived signed upload URLs created only after the server confirms the logged-in user is an approved admin.
