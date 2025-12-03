# frontend/Dockerfile - SOLO para build (sin servir)
FROM node:18-alpine

WORKDIR /app

# Copiar dependencias
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=false

# Copiar todo el código
COPY . .

# El comando de build se hará en docker-compose
# Esto es solo para tener las dependencias instaladas
CMD ["sh", "-c", "yarn build && tail -f /dev/null"]