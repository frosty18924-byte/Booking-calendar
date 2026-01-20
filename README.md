# Booking Calendar

A training portal and booking calendar application built with Next.js and Supabase.

## Prerequisites

- Node.js 20 or higher
- npm or yarn
- A Supabase account and project

## Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Update `.env.local` with your Supabase credentials:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL (found in project settings)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key (found in project settings)

## Getting Started

First, install the dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint to check code quality

## Deployment

### Deploy to Vercel (Recommended)

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new):

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)
2. Import your repository to Vercel
3. Configure environment variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy! Vercel will automatically build and deploy your application

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/frosty18924-byte/Booking-calendar)

### Manual Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm run start
   ```

## Database Setup

This application uses Supabase for the database. Make sure to:

1. Create a new Supabase project at https://app.supabase.com
2. Run the migrations in the `supabase/migrations` folder
3. Configure your environment variables with the project credentials

## Learn More

To learn more about the technologies used in this project:

- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API
- [Supabase Documentation](https://supabase.com/docs) - Learn about Supabase features
- [React Documentation](https://react.dev) - Learn about React

## Project Structure

- `/src/app` - Next.js app directory with routes and pages
- `/src/lib` - Utility functions and configurations
- `/src/components` - Reusable React components (if any)
- `/supabase/migrations` - Database migration files
- `/public` - Static assets

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
