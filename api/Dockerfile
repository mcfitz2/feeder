
# for an Alpine Linux-based image:
FROM node:alpine


RUN mkdir -p /app
WORKDIR /app
COPY . /app
RUN npm install
EXPOSE 8888
# starts the application
CMD [ "npm", "start" ]