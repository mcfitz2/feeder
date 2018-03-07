FROM node:alpine

# Create app directory
RUN mkdir -p /app
WORKDIR /app


# Install app dependencies
COPY package.json /app/
RUN npm install
# Bundle app source
COPY . /app

EXPOSE 8888
EXPOSE 7777
CMD [ "npm", "start" ]
