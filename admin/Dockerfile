FROM node:alpine

# installs the NodeJS application and dependencies (including zmq - https://github.com/JustinTulloss/zeromq.node):
RUN mkdir -p /app
WORKDIR /app
COPY . /app
RUN apk add --update git && \
  rm -rf /tmp/* /var/cache/apk/*
RUN npm install
# starts the application
EXPOSE 8888
CMD [ "npm", "start" ]