FROM node:20-alpine
WORKDIR /app

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
COPY attached_assets/ /attached_assets/

EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
