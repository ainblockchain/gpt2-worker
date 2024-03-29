# AI Network Worker
In order to run an AIN worker, you need an ubuntu environment with GPU. The required GPU specifications may differ depending on the types of model to be served, and the requirements for each model can be found in the Model List section. In this tutorial, we will run a worker that provides the gpt-2-large-torch-serving model in the ubuntu 18.04 environment where Tesla K80 is installed.

# Run AIN Worker

## 1. Check Graphics Driver
Before running a worker, you should check the requirements. First, let's check if the graphics driver is installed correctly. Please enter the following command:

```
$ nvidia-smi
```

The results will be printed in the following form, and you can check the CUDA version supported by your driver.

```
+-----------------------------------------------------------------------------+
| NVIDIA-SMI 450.80.02    Driver Version: 450.80.02    CUDA Version: 11.0     |
|-------------------------------+----------------------+----------------------+
| GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC |
| Fan  Temp  Perf  Pwr:Usage/Cap|         Memory-Usage | GPU-Util  Compute M. |
|                               |                      |               MIG M. |
|===============================+======================+======================|
|   0  Tesla K80           Off  | 00002DE1:00:00.0 Off |                    0 |
| N/A   44C    P0    69W / 149W |      0MiB / 11441MiB |      0%      Default |
|                               |                      |                  N/A |
+-------------------------------+----------------------+----------------------+

+-----------------------------------------------------------------------------+
| Processes:                                                                  |
|  GPU   GI   CI        PID   Type   Process name                  GPU Memory |
|        ID   ID                                                   Usage      |
|=============================================================================|
|  No running processes found                                                 |
+-----------------------------------------------------------------------------+
```


## 2. Check Nvidia Docker
The next step is to check whether the docker and Nvidia docker is installed, which allows you to utilize the GPU on docker containers. Please enter the following command:

```
$ sudo docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi
```

After you run the above command, you should see something similar to this:

```
+-----------------------------------------------------------------------------+
| NVIDIA-SMI 450.80.02    Driver Version: 450.80.02    CUDA Version: 11.0     |
|-------------------------------+----------------------+----------------------+
| GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC |
| Fan  Temp  Perf  Pwr:Usage/Cap|         Memory-Usage | GPU-Util  Compute M. |
|                               |                      |               MIG M. |
|===============================+======================+======================|
|   0  Tesla K80           Off  | 00002DE1:00:00.0 Off |                    0 |
| N/A   44C    P0    69W / 149W |      0MiB / 11441MiB |      0%      Default |
|                               |                      |                  N/A |
+-------------------------------+----------------------+----------------------+

+-----------------------------------------------------------------------------+
| Processes:                                                                  |
|  GPU   GI   CI        PID   Type   Process name                  GPU Memory |
|        ID   ID                                                   Usage      |
|=============================================================================|
|  No running processes found                                                 |
+-----------------------------------------------------------------------------+
```

## 3. Start Running a Worker

Once the graphics driver and Nvidia docker are installed, you're now ready to run the AIN worker. First of all, download the latest AIN Worker docker image using the docker pull command.

```
$ sudo docker pull ainblockchain/worker-docker
```

After that, run AIN Worker with the command below:

```
$ docker run -l ${WORKER_NAME} -d --restart unless-stopped --name ${WORKER_NAME} --gpus "\"device=${GPU_DEVICE_NUMBER ex. 0,1}\"" \
 -e WORKER_NAME=${WORKER_NAME} \
 -e ETH_ADDRESS=${ETH_ADDRESS} \
 -e GPU_DEVICE_NUMBER=${GPU_DEVICE_NUMBER} \
 [-e INFERENCE_MODEL_NAME=${INFERENCE_MODEL_NAME} \ ]  // Only inference mode.
 [-v SERVICE_JSON_PATH:/server/service.json \ ]        // Only train mode.
 -v /ain-worker/${WORKER_NAME}:/server/shared \
 -v /var/run/docker.sock:/var/run/docker.sock \
 --network host ainblockchain/worker-docker
```
- (Optional Env) INFERENCE_CONTAINER_PORT: default = 7777
- (Optional Env) ENABLE_AUTO_PAYOUT: default = true
- (Optional Env) SLACK_WEBHOOK_URL: default = null

**/ain-worker** contains the path to the config file that contains the parameters required to run a worker. After creating a file in the form below, replace **/ain-worker** with the path of the file. After successfully running a worker, keep the config file safe, since it contains your Ethereum address and AIN private key.

```
// example
{
    "ETH_ADDRESS": '0x~~', // Ethereum wallet address to receive rewards
    "INFERENCE_MODEL_NAME": 'gpt-2-large-torch-serving',
    "GPU_DEVICE_NUMBER": '0,1',
    "AIN_PRIVATE_KEY": '0x~~'
}
```

### Model List
The list of models currently supported by AIN Worker is as follows:

-  gpt-2-large-torch-serving(Model Name) // 5 GB(GPU Memory Requirement) // 10.1 (Minimum CUDA version)
-  gpt-2-trump-torch-serving(Model Name) // 2 GB(GPU Memory Requirement) // 10.1 (Minimum CUDA version)

When you have finished executing the command, you can check whether the worker is running normally through the docker logs. You can check the worker's logs with the following command:

```
$ sudo docker logs -f ain-worker
```

If the following log is displayed, the worker has been successfully started and is in the process of preparing to provide a model. This step can take about 15 to 25 minutes.

```
2020-12-14T04:21:23.362Z [manager/worker] info: [+] Start to create Job Container. It can take a long time.
```

After that, once the following message is displayed, the model is ready and is being served.

```
2020-12-14T04:37:03.498Z [manager/worker] info: [+] Success to create Job Container.
2020-12-14T04:38:03.654Z [manager/worker] info: [+] Start to listen Job
```

## 4. Exit a Worker

To terminate the AIN Worker, enter the following command:

```
$ docker rm -f $(docker ps -f "label=${WORKER_NAME}" -q -a)

// Only Train Mode.
$ rm -rf /ain-worker/${WORKER_NAME}/train
```


# For Dev

## How To Build Docker

```
docker build -t {INPUT DOCKER TAG} .
```

## How To Test

```
yarn test
```
