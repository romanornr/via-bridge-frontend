# VIA Bridge Frontend - Deployment Guide

## Production Configuration

### Environment Variables

Create a `.env.production` file or set the following environment variables in your deployment platform:

```bash
# Required
NEXT_PUBLIC_NETWORK=mainnet  # or testnet4 for staging
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_WALLETCONNECT_ID=

# Optional - Build optimizations
BUILD_STANDALONE=true        # For Docker/containerized deployments
NODE_ENV=production         # Automatically set by most platforms
```

### Development vs Production

#### Development (Local)
```bash
# Use Turbopack for faster development
npm run dev

# Or disable Turbopack if needed for debugging
DISABLE_TURBO=true npm run dev:no-turbo
```

#### Production Build
```bash
# Standard build
npm run build
npm start

# Standalone build (for Docker)
BUILD_STANDALONE=true npm run build
npm start
```

### Deployment Platforms

#### Vercel (Recommended)
1. Connect your GitHub repository
2. Set environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_NETWORK=mainnet`
3. Deploy automatically on push to main branch

#### Docker
```dockerfile
FROM node:24-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_PUBLIC_NETWORK=mainnet
ENV BUILD_STANDALONE=true

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

**Build and run with Docker:**
```bash
# Build the image
docker build -t via-bridge-frontend .

# Run the container
docker run -p 3000:3000 via-bridge-frontend
```

#### Docker Compose (Recommended for Development)

For easier development and testing, use the included `docker-compose.yml`:

```bash
# Start the application (builds automatically)
docker-compose up --build

# Run in background
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

The docker-compose configuration includes:
- Development-friendly environment variables (`NODE_ENV=development`, `NEXT_PUBLIC_NETWORK=testnet4`)
- Volume mounts for live code changes during development
- Health checks to monitor container status
- Automatic restart policies

**Production Docker Compose:**
For production, modify the environment variables in `docker-compose.yml`:
```yaml
environment:
  - NODE_ENV=production
  - NEXT_PUBLIC_NETWORK=mainnet
```

#### Other Platforms
- **Netlify**: Use `npm run build` and deploy the `.next` folder
- **Railway**: Connect repository and set environment variables

### Security Considerations

Production builds automatically include:
- CSP headers for XSS protection
- X-Frame-Options to prevent clickjacking
- Content type sniffing protection
- Referrer policy configuration

### Monitoring

Consider adding these monitoring tools:
- Vercel Analytics (if using Vercel)
- Sentry for error tracking
- Web Vitals monitoring
- Wallet connection analytics

### Troubleshooting

#### Common Issues

1. **Wallet Provider Conflicts**
   - The app automatically detects and handles multiple wallet providers
   - Debug logs are only shown in development mode

2. **Network Configuration**
   - Ensure `NEXT_PUBLIC_NETWORK` matches your target environment
   - Verify wallet networks match the configured network

3. **Build Failures**
   - Check that all environment variables are properly set
   - Ensure Node.js version compatibility (20.9+, Node 24 LTS recommended)

4. **Performance Issues**
   - Use `BUILD_STANDALONE=true` for containerized deployments
   - Enable compression at the CDN/proxy level
   - Monitor Core Web Vitals

#### Debug Mode

To enable debug logging in production (not recommended):
```bash
NODE_ENV=development npm start
```

### Rollback Strategy

1. Keep previous builds available
2. Use feature flags for gradual rollouts
3. Monitor error rates after deployment
4. Have database migration rollback plans ready