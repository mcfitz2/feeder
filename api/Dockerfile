# for an Alpine Linux-based image:
FROM node:alpine


# installs the NodeJS application and dependencies (including zmq - https://github.com/JustinTulloss/zeromq.node):
RUN mkdir -p /app
WORKDIR /app
COPY . /app
run apk --no-cache add --virtual native-deps g++ gcc libgcc libstdc++ linux-headers make python
RUN npm install
EXPOSE 8888
# starts the application
CMD [ "npm", "start" ]