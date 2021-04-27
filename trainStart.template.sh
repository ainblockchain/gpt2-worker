WORKER_NAME=
ETH_ADDRESS=
GPU_DEVICE_NUMBER=
SERVICE_JSON_PATH=

docker pull ainblockchain/worker-docker

docker rm -f $(docker ps -f "label=${WORKER_NAME}" -q -a)
rm -rf /ain-worker/${WORKER_NAME}/train

docker run -l ${WORKER_NAME} -d --restart unless-stopped --name ${WORKER_NAME} --gpus "\"device=${GPU_DEVICE_NUMBER}\"" \
 -e WORKER_NAME=${WORKER_NAME} \
 -e ETH_ADDRESS=${ETH_ADDRESS} \
 -e GPU_DEVICE_NUMBER=${GPU_DEVICE_NUMBER} \
 -v ${SERVICE_JSON_PATH}:/worker/service.json \
 -v /ain-worker/${WORKER_NAME}:/worker/shared \
 -v /var/run/docker.sock:/var/run/docker.sock \
 --network host ainblockchain/worker-docker

docker logs -f ${WORKER_NAME}
