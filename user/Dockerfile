# for an Alpine Linux-based im
FROM node:alpine

# installs the NodeJS application and dependencies (including zmq - https://github.com/JustinTulloss/zeromq.node):
RUN apk add --update git && \
  rm -rf /tmp/* /var/cache/apk/*


ADD package.json /tmp/package.json
RUN cd /tmp && npm install
RUN mkdir -p /app && cp -a /tmp/node_modules /app/

WORKDIR /app
COPY . /app
# starts the application
CMD [ "npm", "start" ]
