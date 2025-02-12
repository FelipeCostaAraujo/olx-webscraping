FROM node:20-buster

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

RUN npm run build

COPY . .

EXPOSE 6000

CMD ["node", "dist/index.js"]
