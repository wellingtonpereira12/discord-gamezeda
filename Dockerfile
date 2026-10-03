FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /app/key.pem -out /app/cert.pem \
    -subj "/CN=2.24.64.219"

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
