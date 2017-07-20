
FROM node:alpine
# Create app directory
RUN mkdir -p /app
WORKDIR /app

# Install app dependencies
COPY package.json /app/
run apk --no-cache add --virtual native-deps g++ gcc libgcc libstdc++ linux-headers make python
RUN npm install
# Bundle app source
COPY . /app
EXPOSE 4242
CMD [ "npm", "start" ]