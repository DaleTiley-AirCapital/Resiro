FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache unzip

COPY attached_assets/React-Marketing-Site-master_1755526798974.zip /tmp/react-app.zip
RUN unzip /tmp/react-app.zip -d /tmp \
    && cp -R /tmp/React-Marketing-Site-master/. /app \
    && rm -rf /tmp/react-app.zip /tmp/React-Marketing-Site-master

RUN corepack enable && pnpm install --no-frozen-lockfile

EXPOSE 3000
CMD ["pnpm", "exec", "vite", "--host", "0.0.0.0", "--port", "3000"]
