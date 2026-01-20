# Deployment Guide for Booking Calendar

This guide provides detailed instructions for deploying the Booking Calendar application to production.

## Prerequisites

Before deploying, ensure you have:
- A Supabase account and project set up
- Database migrations applied
- A deployment platform account (Vercel recommended)

## Environment Variables

The application requires the following environment variables:

### Required for All Environments

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Supabase Project Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key | Supabase Project Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (for admin operations) | Supabase Project Settings > API (keep this secret!) |

## Deployment Options

### Option 1: Deploy to Vercel (Recommended)

Vercel is the recommended platform for deploying Next.js applications.

#### Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/frosty18924-byte/Booking-calendar)

#### Manual Deployment

1. **Connect your repository to Vercel**
   ```bash
   npm install -g vercel
   vercel login
   ```

2. **Link your project**
   ```bash
   vercel link
   ```

3. **Configure environment variables**
   - Go to your Vercel project dashboard
   - Navigate to Settings > Environment Variables
   - Add all required environment variables listed above
   - Make sure to add them for all environments (Production, Preview, Development)

4. **Deploy**
   ```bash
   vercel --prod
   ```

   Or simply push to your main branch if you have automatic deployments enabled.

#### Environment Variable Configuration in Vercel UI

1. Go to your project in Vercel Dashboard
2. Click on "Settings"
3. Click on "Environment Variables"
4. Add each variable:
   - Name: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: Your Supabase project URL
   - Environments: Check Production, Preview, and Development
5. Repeat for all environment variables

### Option 2: Deploy to Other Platforms

#### Netlify

1. Connect your repository to Netlify
2. Build command: `npm run build`
3. Publish directory: `.next`
4. Add environment variables in Site Settings > Build & Deploy > Environment

#### Railway

1. Create a new project in Railway
2. Connect your GitHub repository
3. Add environment variables in the Variables tab
4. Railway will automatically detect and deploy your Next.js app

#### Docker Deployment

1. Build the Docker image:
   ```bash
   docker build -t booking-calendar .
   ```

2. Run the container:
   ```bash
   docker run -p 3000:3000 \
     -e NEXT_PUBLIC_SUPABASE_URL=your-url \
     -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key \
     -e SUPABASE_SERVICE_ROLE_KEY=your-service-key \
     booking-calendar
   ```

## Database Setup

### Setting up Supabase

1. **Create a new Supabase project**
   - Go to https://app.supabase.com
   - Click "New Project"
   - Choose your organization and set up the project

2. **Run database migrations**
   - Navigate to SQL Editor in your Supabase dashboard
   - Run the migration files from `supabase/migrations` in order
   - Alternatively, use the Supabase CLI:
     ```bash
     npx supabase db push
     ```

3. **Get your API credentials**
   - Go to Project Settings > API
   - Copy your project URL and anon key
   - Copy your service role key (keep this secure!)

### Database Tables

The application uses the following main tables:
- `profiles` - User profiles and roles
- `training_events` - Scheduled training sessions
- `courses` - Available training courses
- `bookings` - User bookings for training events

## Post-Deployment Checklist

After deployment, verify:

- [ ] Application loads without errors
- [ ] Login page is accessible
- [ ] Database connection is working
- [ ] Environment variables are properly set
- [ ] SSL/HTTPS is enabled
- [ ] Domain is properly configured (if using custom domain)

## Testing Your Deployment

1. **Access the application**
   - Navigate to your deployment URL
   - You should be redirected to the login page

2. **Test authentication**
   - Try logging in with test credentials
   - Verify Google OAuth is working (if configured)

3. **Test core functionality**
   - View the booking calendar
   - Test booking a training session
   - Verify admin features (if applicable)

## Monitoring and Maintenance

### Logs

- **Vercel**: View logs in the Deployments tab of your project
- **Supabase**: View database logs in the Supabase dashboard under Database > Logs

### Performance Monitoring

Consider setting up:
- Vercel Analytics for performance insights
- Sentry for error tracking
- Supabase monitoring for database performance

## Troubleshooting

### Common Issues

**Issue: "supabaseUrl is required" error**
- Ensure all environment variables are set correctly
- Verify variables are available in the correct environment (production/preview)
- Rebuild and redeploy after adding variables

**Issue: Authentication not working**
- Check Supabase project is active
- Verify API keys are correct
- Check Supabase authentication settings

**Issue: Build fails**
- Check build logs for specific errors
- Ensure all dependencies are listed in package.json
- Verify Node.js version compatibility (use Node 20+)

## Security Considerations

- **Never commit** `.env.local` or any file containing secrets
- Keep `SUPABASE_SERVICE_ROLE_KEY` secure - it has admin privileges
- Regularly rotate API keys
- Enable Supabase Row Level Security (RLS) policies
- Use HTTPS in production
- Set up proper CORS policies in Supabase

## Rollback Procedure

If issues occur after deployment:

### Vercel
1. Go to Deployments tab
2. Find a previous working deployment
3. Click the three dots menu
4. Select "Promote to Production"

### Other Platforms
- Revert to the previous git commit
- Redeploy the application

## Support

For issues or questions:
- Check the [Next.js Documentation](https://nextjs.org/docs)
- Review [Supabase Documentation](https://supabase.com/docs)
- Open an issue in the GitHub repository
