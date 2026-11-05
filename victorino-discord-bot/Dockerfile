FROM node:22-alpine
WORKDIR /app
# sharp draws the welcome card text from system fonts; alpine ships none (cards showed boxes)
RUN apk add --no-cache fontconfig font-dejavu
COPY package*.json ./
RUN npm install --omit=dev
COPY src ./src
CMD ["npm", "start"]
