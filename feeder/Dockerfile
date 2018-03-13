FROM node:alpine

# installs the NodeJS application and dependencies (including zmq - https://github.com/JustinTulloss/zeromq.node):
RUN mkdir -p /app
WORKDIR /app
#RUN apk add --update git && \
#  rm -rf /tmp/* /var/cache/apk/*
COPY package.json /app
RUN npm install
COPY . /app

# starts the application
CMD [ "npm", "start" ]
