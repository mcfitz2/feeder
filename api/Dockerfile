# for an Alpine Linux-based im
FROM node:alpine

# installs the NodeJS application and dependencies (including zmq - https://github.com/JustinTulloss/zeromq.node):
RUN mkdir -p /app
WORKDIR /app
COPY . /app
RUN apk add --update git && \
  rm -rf /tmp/* /var/cache/apk/*
RUN npm install
EXPOSE 8888
# starts the application
CMD [ "npm", "start" ]