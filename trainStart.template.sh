WORKER_NAME=
ETH_ADDRESS=
GPU_DEVICE_NUMBER=
SERVICE_JSON_PATH=

docker rm -f $(docker ps -f "label=${WORKER_NAME}" -q -a)
rm -rf /ain-worker/${WORKER_NAME}

docker run -l ${WORKER_NAME} -d --name ${WORKER_NAME} --gpus '"device=${GPU_DEVICE_NUMBER}"' \
 -e WORKER_NAME=${WORKER_NAME} \
 -e ETH_ADDRESS=${ETH_ADDRESS} \
 -e GPU_DEVICE_NUMBER=${GPU_DEVICE_NUMBER} \
 -e SERVICE_JSON=`cat ${SERVICE_JSON_PATH}` \
 -v /ain-worker/${WORKER_NAME}:/server/shared \
 -v /var/run/docker.sock:/var/run/docker.sock \
 --network host ainblockchain/worker-docker
