FROM node:alpine

# Create app directory
RUN mkdir -p /app
WORKDIR /app


# Install app dependencies
COPY package.json /app/
# Bundle app source
COPY . /app

EXPOSE 1883
EXPOSE 8883
CMD [ "npm", "start" ]
