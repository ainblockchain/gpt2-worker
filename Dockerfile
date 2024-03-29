FROM node:12.16.1-alpine AS build

# copy server code.
RUN mkdir /server
WORKDIR /server
ADD yarn.lock /server
ADD package.json /server
ADD ./tsconfig.json /server/tsconfig.json
RUN npm install 
RUN npm install -g typescript@3.9
ADD ./src /server/src

WORKDIR /server
RUN tsc

FROM node:12.16.1-slim

RUN mkdir /server
WORKDIR /server
ADD package.json /server
ADD yarn.lock /server
RUN npm install --only=prod
COPY --from=build /server/dist /server/dist

ENV GOOGLE_APPLICATION_CREDENTIALS /server/service.json

CMD ["node", "dist/index.js", "serve"]
