FROM node:12.16.1-alpine AS build

# copy worker code.
RUN mkdir /worker
WORKDIR /worker
ADD yarn.lock /worker
ADD package.json /worker
ADD ./tsconfig.json /worker/tsconfig.json
RUN npm install 
RUN npm install -g typescript@3.9
ADD ./src /worker/src

WORKDIR /worker
RUN tsc

FROM node:12.16.1-slim

RUN mkdir /worker
WORKDIR /worker
ADD package.json /worker
ADD yarn.lock /worker
RUN npm install --only=prod
COPY --from=build /worker/dist /worker/dist

ENV GOOGLE_APPLICATION_CREDENTIALS /worker/service.json

CMD ["node", "dist/index.js", "serve"]
