# ─────────────────────────────────────────────────────────────
# Stage 1 – Build the Expo web bundle
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first (leverages Docker layer cache)
COPY package.json package-lock.json ./

# Install all dependencies (including devDeps needed for the build)
RUN npm ci

# Copy the rest of the project
COPY . .

# Build-time env vars for Supabase (EXPO_PUBLIC_ vars are baked into the bundle)
ARG EXPO_PUBLIC_SUPABASE_URL
ARG EXPO_PUBLIC_SUPABASE_ANON_KEY
ENV EXPO_PUBLIC_SUPABASE_URL=$EXPO_PUBLIC_SUPABASE_URL
ENV EXPO_PUBLIC_SUPABASE_ANON_KEY=$EXPO_PUBLIC_SUPABASE_ANON_KEY

# Build the static web bundle (output goes to /app/dist)
RUN npx expo export --platform web

# ─────────────────────────────────────────────────────────────
# Stage 2 – Serve with nginx (lightweight production image)
# ─────────────────────────────────────────────────────────────
FROM nginx:alpine AS runner

# Copy the compiled static files from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config (handles SPA routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
