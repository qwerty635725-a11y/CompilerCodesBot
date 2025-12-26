FROM node:20-slim

RUN apt-get update && \
    apt-get install -y python3 g++ util-linux && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

RUN mkdir -p /tmp/sandbox && chmod 777 /tmp/sandbox

ENV NODE_ENV=production

CMD ["node", "bot.js"]
