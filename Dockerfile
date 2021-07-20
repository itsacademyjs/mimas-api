FROM node:16

# Create app directory
WORKDIR /mimas/rest-api

# Install app dependencies
COPY package.json .
COPY yarn.lock .

# If you are building your code for production
RUN rm -rf node_modules && yarn install --frozen-lockfile

# Bundle app source
COPY . .

EXPOSE 80
CMD [ "node", "./app/start.js" ]
