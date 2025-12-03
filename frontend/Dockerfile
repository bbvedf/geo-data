# frontend/Dockerfile
# Build stage
FROM node:18-alpine as builder

WORKDIR /app

# 1. Copiar package.json e instalar
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=false

# 2. Copiar código y build
COPY . .
RUN yarn build

# 3. Production stage (solo servir archivos estáticos)
FROM nginx:alpine

# 4. Copiar build de React
COPY --from=builder /app/dist /usr/share/nginx/html

# 5. Copiar configuración Nginx
COPY docker/nginx-site.conf /etc/nginx/conf.d/default.conf

# 6. Health check endpoint
RUN echo '{"status": "healthy", "service": "frontend"}' > /usr/share/nginx/html/health.json

# 7. Exponer puerto
EXPOSE 80

# 8. Comando
CMD ["nginx", "-g", "daemon off;"]