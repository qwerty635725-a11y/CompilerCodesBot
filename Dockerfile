FROM node:20-slim

RUN apt-get update && \
    apt-get install -y python3 g++ && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN mkdir -p tmp

ENV NODE_ENV=production

CMD ["node", "bot.js"]
