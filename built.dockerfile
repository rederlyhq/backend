# This file is intended to run on the built source
# Make sure you have environment variables set appropriately
# This can be done by having a .env file inside the build folder when creating the docker image
# Or more safely can be done by injecting into the docker container

# This file will be copied into the build directory on package

FROM node:14.15.3-alpine

COPY . ./rederly/
WORKDIR /rederly
CMD npm run run:build