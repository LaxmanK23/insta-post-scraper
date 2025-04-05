FROM mcr.microsoft.com/playwright:focal

WORKDIR /app

COPY package*.json ./
RUN npm install
RUN npm postinstall

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
