# Frontend Dockerfile - FIXED VERSION
FROM node:18-alpine AS build

WORKDIR /app

# Accept build argument
ARG VITE_GOOGLE_MAPS_API_KEY
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY

# Copy package files first
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy ALL source files (important!)
COPY . .

# Debug: List files to ensure everything is copied
RUN echo "=== Checking src/pages ===" && ls -la src/pages/ || echo "src/pages not found!"

# Build for production (with API key baked in)
RUN npm run build

# Debug: Check build output
RUN echo "=== Checking dist folder ===" && ls -la dist/ || echo "dist not found!"

# Production stage with nginx
FROM nginx:alpine

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
