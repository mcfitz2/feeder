# for an Alpine Linux-based image:
FROM lucsorel/zeromq-bindings:alpinelinux3.3-zeromq4.3.x-nodejs4.3.x


# installs the NodeJS application and dependencies (including zmq - https://github.com/JustinTulloss/zeromq.node):
RUN mkdir -p /app
WORKDIR /app
COPY . /app
RUN npm install

# starts the application
CMD [ "npm", "start" ]