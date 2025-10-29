# ---------- Build stage ----------
FROM node:20-alpine AS builder
WORKDIR /app

# 1) Dependencias
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN \
  if [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then npm i -g pnpm && pnpm i --frozen-lockfile; \
  elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
  else npm i; fi

# 2) Código fuente
COPY . .

# 3) Variables Vite en build (puedes sobreescribir con --build-arg)
ARG VITE_API_BASE_URL=http://localhost:3000/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# 4) Build de producción
RUN npm run build

# ---------- Runtime stage ----------
FROM nginx:1.27-alpine AS runtime
# SPA fallback para rutas de React Router
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Archivos estáticos
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
