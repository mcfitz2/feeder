FROM node:alpine

# Create app directory
RUN mkdir -p /app
WORKDIR /app


# Install app dependencies
COPY package.json /app/
RUN apk add --no-cache make gcc g++ python libzmq zeromq-dev && \
  npm install && \
  apk del make gcc g++ python
# Bundle app source
COPY . /app

EXPOSE 1883
EXPOSE 8883
CMD [ "npm", "start" ]
