# Optional: run the same app as a custom container on App Service.
# For custom containers, tell App Service which port to probe with the WEBSITES_PORT app setting.
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
ENV APP_PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
