FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY package.json package-lock.json* ./
RUN npm ci
COPY vite.config.js ./
COPY src/ ./src/
COPY index.html ./
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY server/ ./server/
COPY public/ ./public/
COPY --from=frontend-build /app/frontend/dist ./public/static

RUN mkdir -p /app/data

EXPOSE 3001

CMD ["node", "server/index.js"]
