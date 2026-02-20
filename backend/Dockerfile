FROM node:20-alpine

# Ghostscript(gs) + Poppler(pdfinfo) — PDF 미리보기/압축/변환용
RUN apk add --no-cache ghostscript poppler-utils

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY . .
RUN npm run build

EXPOSE 3001
ENV PORT=3001
CMD ["npm", "run", "start:prod"]
