# ---------- Build stage ----------
FROM node:20-alpine AS build
WORKDIR /app

# 1️⃣ Copiar archivos de dependencias
COPY package*.json ./

# 2️⃣ Instalar dependencias (solo npm, más estable en CI)
RUN npm ci

# 3️⃣ Copiar el resto del código (src, public, etc.)
# ⚠️ Asegúrate de NO tener src/ en .dockerignore
COPY . .

# 4️⃣ Variables de entorno para Vite
ARG VITE_API_BASE_URL=http://localhost:3000/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# 5️⃣ Build de producción
RUN npm run build

# ---------- Runtime stage ----------
FROM nginx:alpine

# Copiar configuración SPA (fallback para React Router)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar archivos generados por Vite
COPY --from=build /app/dist /usr/share/nginx/html

# Exponer el puerto de Nginx
EXPOSE 80

# Iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]
