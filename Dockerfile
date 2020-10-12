
# The instructions for the first stage
FROM node:10-alpine as builder

# set to production to run build
#ARG NODE_ENV=development

# set working directory
WORKDIR /app

# install app dependencies
COPY package.json ./
COPY package-lock.json ./
RUN npm install --silent
COPY . ./
#CMD [ "npm", "start" ]

#COPY . ./
RUN npm run build
RUN npm prune --production

# The instructions for second stage
FROM node:10-alpine

#WORKDIR /app
COPY --from=builder /app/ts-built ./ts-built
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.env ./
#RUN ls
CMD node ts-built/index.js

