FROM node:25-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY openapi.yaml ./
COPY src/ ./src/

EXPOSE 3001

CMD ["npm", "start"]