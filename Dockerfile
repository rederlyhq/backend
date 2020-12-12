
# The instructions for the first stage
FROM node:10-alpine as builder

# set to production to run build
#ARG NODE_ENV=development

# set working directory
WORKDIR /app

COPY . ./

# install app dependencies
RUN npm install --silent

# Builds and creates the package, does not create an archive
RUN REDERLY_PACKAGER_ARCHIVE=false npm run build:package

RUN npm run sequelize:built:migrations

# The instructions for second stage
FROM node:10-alpine

#WORKDIR /app
COPY --from=builder /app/build ./rederly
COPY --from=builder /app/.env ./rederly/

WORKDIR /rederly
CMD npm run run:build
