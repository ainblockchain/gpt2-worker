import axios from 'axios';
import { diff } from 'deep-object-diff';
import * as util from './util';
import Logger from '../common/logger';
import * as types from '../common/types';
import Docker from './docker';
import * as constants from '../common/constants';
import AinConnect from '../interface/ainConnect';
import {
  THRESHOLD_PAYOUT_AMOUNT, existsBucket, FIREBASE_CONFIG,
} from '../interface/firebaseInfo';

const log = Logger.createLogger('handler/worker');

export default class Worker {
  protected ainConnect: AinConnect;

  protected modelInfo: types.ModelInfo;

  private trainInfo: types.TrainInfo;

  static workerInfoUpdateMs = 20 * 1000;

  static requestPayoutMs = 10 * 60 * 1000;

  static healthCheckMaxCnt = 100;

  static healthCheckDelayMs = 2000;

  public totalRewardAmount: number;

  public totalPayoutAmount: number;

  private trainLogData: Object;

  constructor(test: boolean = false) {
    this.totalRewardAmount = 0;
    this.totalPayoutAmount = 0;
    this.ainConnect = new AinConnect(constants.AIN_PRIVATE_KEY, test);
    this.trainInfo = {
      running: false,
    };
  }

  /**
  * Start Worker.
  */
  async start() {
    log.info(`[+] Start Worker [
      Worker Address: ${this.ainConnect.getAddress()}
      Worker Name: ${constants.WORKER_NAME}
      Worker Mode: ${(constants.INFERENCE_MODEL_NAME) ? `Inference[${constants.INFERENCE_MODEL_NAME}]` : 'Train'}
    ]`);
    await this.ainConnect.signIn();

    if (constants.INFERENCE_MODEL_NAME) {
      // Inference Mode.
      await this.startInference();
    } else {
      // Train Mode.
      await this.startTrain();
    }

    // Set Worker Information on firebase database.
    setInterval(async () => {
      try {
        const gpuInfo = await util.getGpuInfo();
        await this.ainConnect.setWorkerInfo({
          jobType: constants.INFERENCE_MODEL_NAME,
          type: (constants.INFERENCE_MODEL_NAME) ? 'inference' : 'training',
          gpuInfo,
        });
      } catch (err) {
        log.error(err);
      }
    }, Worker.workerInfoUpdateMs);

    // Set Worker ETH_ADDRESS on firebase database.
    await this.ainConnect.registerEthAddr(constants.ETH_ADDRESS);
    // Listen to 'user_transactions' for logging about reward
    this.ainConnect.listenTransaction(this.listenTransactionHandler);
    // Auto payout
    if (constants.ENABLE_AUTO_PAYOUT === 'true') {
      setInterval(this.requestToPayout, Worker.requestPayoutMs);
    }
  }

  private startInference = async () => {
    // Inference Mode.
    // Get AI Model Information on Firebase Database.
    this.modelInfo = await this.ainConnect.getModelInfo();
    const selectModelInfo = this.modelInfo[constants.INFERENCE_MODEL_NAME!];
    if (!selectModelInfo) {
      throw new Error(`Invaild MODEL_NAME[${constants.INFERENCE_MODEL_NAME}]`);
    }
    const containerName = `inference${constants.WORKER_NAME}`;
    // Create Container for ML Job.
    log.debug('[+] Start to create Job Container. It can take a long time.');
    await Docker.runContainer(containerName, selectModelInfo.imagePath, {
      publishPorts: {
        [constants.INFERENCE_CONTAINER_PORT!]: String(selectModelInfo.port),
      },
      gpuDeviceNumber: constants.GPU_DEVICE_NUMBER!,
      labels: {
        [constants.WORKER_NAME!]: '',
      },
    });
    log.debug('[+] Success to create Job Container.');
    this.trainLogData = {};
    // Check AI Model container by calling health API.
    let health = false;
    for (let cnt = 0; cnt < Worker.healthCheckMaxCnt; cnt += 1) {
      health = await this.healthCheckContainer(constants.INFERENCE_MODEL_NAME);
      if (health) {
        break;
      }
      await util.delay(Worker.healthCheckDelayMs);
    }
    if (!health) {
      await Docker.killContainer(containerName);
      throw new Error('Failed to run Container.');
    }

    this.ainConnect.listenForInferenceRequest(this.inferenceHandler);
  }

  private startTrain = async () => {
    // Train Mode.
    const existsBucketResult = await existsBucket(FIREBASE_CONFIG.storageBucket);
    if (!existsBucketResult) {
      throw new Error('Invalid Service.json');
    }

    this.ainConnect.listenForTrainRequest(this.trainHandler,
      this.cancelTrainHandler);
  }

  /**
  * Request to payout.
  */
  public requestToPayout = async () => {
    try {
      const balance = await this.ainConnect.getCurrentBalance();
      const isAinAddressKycVerified = await this.ainConnect.isAinAddressKycVerified();
      if (balance >= THRESHOLD_PAYOUT_AMOUNT && isAinAddressKycVerified) {
        await this.ainConnect.payout(THRESHOLD_PAYOUT_AMOUNT);
      }
    } catch (error) {
      log.error(`[-] Failed to request to payout - ${error}`);
    }
  }

  /**
  * Check AI Model container.
  */
  private healthCheckContainer = async (modelName: string) => {
    const { framework, healthCheckPath } = this.modelInfo[modelName];
    try {
      const res = await axios.get(`http://localhost:${constants.INFERENCE_CONTAINER_PORT}${healthCheckPath}`);
      if (framework === 'pytorch') {
        return res.data.status === 'Healthy';
      }
      // tensorflow
      return res.data.model_version_status.state === 'AVAILABLE';
    } catch (err) {
      return false;
    }
  }

  /**
  * Handler for logging about reward.
  */
  public listenTransactionHandler = (params: types.UserTransactionParams) => {
    if (params.type === 'REWARD_JOB') {
      this.totalRewardAmount += params.value;
      if (constants.START_TIME < params.timestamp) {
        log.debug(`[+] Current AIN Total Reward balance: ${this.totalRewardAmount} ain (+ ${params.value})`);
      }
    } else if (params.type === 'PAYOUT_CONFIRMED') {
      this.totalPayoutAmount += params.value;
      if (constants.START_TIME < params.timestamp) {
        log.debug(`[+] Current AIN Total Payout balance: ${this.totalPayoutAmount} ain (+ ${params.value})`);
      }
    }
  }

  /**
   * Request to ML Inference Container.
  */
  public inferenceHandler = async (params: types.InferenceHandlerParams) => {
    const vector = JSON.parse(params.data.inputVector.replace(/'/g, ''));
    const data = (this.modelInfo[constants.INFERENCE_MODEL_NAME!].framework === 'tensorflow') ? {
      signature_name: 'predict',
      instances: [vector],
    } : {
      num_samples: params.data.numResultsRequest,
      length: params.data.length,
      text: vector,
    };
    const modelInfo = this.modelInfo[constants.INFERENCE_MODEL_NAME!];
    const res = await axios({
      method: modelInfo.method,
      url: `http://localhost:${constants.INFERENCE_CONTAINER_PORT}${modelInfo.apiPath}`,
      headers: {
        'Content-Type': 'application/json',
      },
      data,
    });
    return (this.modelInfo[constants.INFERENCE_MODEL_NAME!].framework === 'tensorflow') ? {
      predictions: JSON.stringify(res.data.predictions),
    } : {
      predictions: JSON.stringify(res.data),
    };
  }

  /**
   * Request to ML training Container.
  */
  public trainHandler = async (trainId: string, params: types.trainingParams) => {
    if (this.trainInfo.running) {
      throw new Error('Other task is already in progress');
    }
    this.trainInfo = {
      trainId,
      running: true,
    };
    const workerRootPath = `${constants.SHARED_ROOT_PATH}/train/${trainId}`;
    const containerRootPath = `/train/${trainId}`;
    const containerName = `train${constants.WORKER_NAME!}`;
    await util.exec(`mkdir -p ${workerRootPath}`);
    try {
      await this.ainConnect.downloadFile(params.datasetPath, `${workerRootPath}/${params.fileName}`);
      log.debug(`[+] success to download file (id: ${trainId})`);
      if (this.trainInfo.cancelId) {
        throw new Error('canceled');
      }
      // Create Container for training
      await Docker.runContainer(containerName, params.imagePath, {
        gpuDeviceNumber: constants.GPU_DEVICE_NUMBER,
        labels: {
          [constants.WORKER_NAME!]: '',
        },
        env: [`epochs=${params.epochs}`,
          `jobType=${params.jobType}`,
          `mountedDataPath=${containerRootPath}/${params.fileName}`,
          `outputPath=${containerRootPath}/${params.jobType}.mar`,
          `logFilePath=${containerRootPath}/logs`],
        binds: [`${constants.ROOT_PATH}/train/${trainId}:${containerRootPath}`],
      });
      log.debug(`[+] success to create container (id: ${trainId})`);
      this.monitoringTrainContainer(containerName, {
        userAddress: params.uid,
        jobType: params.jobType,
        logPath: `${workerRootPath}/logs`,
        workerRootPath,
        trainId,
        uploadModelPath: params.uploadModelPath,
        outputLocalPath: `${workerRootPath}/${params.jobType}.mar`,
      });
      return {
        startedAt: Date.now(),
        status: 'running',
      };
    } catch (error) {
      this.trainInfo = {
        running: false,
      };
      log.error(`[-] trainHandler - ${error.message}`);
      await util.exec(`rm -rf ${workerRootPath}`);
      throw error;
    }
  }

  /**
   * Request to ML training Container.
  */
  public cancelTrainHandler = async (
    cancelId: string, params: types.CancelTrainingParams,
  ) => {
    try {
      if (!this.trainInfo.trainId || this.trainInfo.trainId !== params.trainId) {
        throw new Error('Not training');
      }
      this.trainInfo.cancelId = cancelId;
      const containerName = `train${constants.WORKER_NAME!}`;
      const exist = await Docker.existContainer(containerName);
      if (exist) {
        await Docker.execContainer(containerName,
          "ps -aux | grep -m 1 python | awk '{print $2}' | xargs -I{} kill -9 {}");
      } else {
        Docker.cancelPullImage(params.trainId);
      }
    } catch (error) {
      log.error(`[-] cancelTrainHandler - ${error.message}`);
    }
  }

  /**
   * Monitoring Method About training Container.
   * @param name training Container Name.
   * @param params MonitoringParams(trainId..).
   */
  private monitoringTrainContainer(name: string, params: types.MonitoringParams) {
    // Update Train Log.
    this.trainLogData = {};
    const watch = util.watchJsonFile(params.logPath, async (value: Object, errMessage: string) => {
      if (errMessage) {
        log.debug(`[-] Failed to watch Train Log - ${errMessage}`);
        return;
      }

      const diffObject = diff(this.trainLogData, value);
      this.trainLogData = value;
      if (Object.keys(diffObject).length === 0) {
        return;
      }
      await this.ainConnect.updateTrainingResult(params.trainId, params.userAddress, {
        trainingLogs: value,
      });
    });

    // Update Container Log.
    Docker.containerLog(name, async (data: string) => {
      // Data handler
      await this.ainConnect.updateTrainingResult(params.trainId, params.userAddress, {
        containerLogs: {
          [String(Date.now())]: data,
        },
      });
    },
    async () => {
      // End Handler
      const { cancelId } = this.trainInfo;
      this.trainInfo = {
        running: false,
      };
      watch.close();

      let status = 'failed';
      const existModel = util.fileExists(params.outputLocalPath);
      if (cancelId) {
        status = 'canceled';
      } else if (existModel) {
        status = 'completed';
      }

      if (status === 'completed') {
        try {
          await this.ainConnect.uploadFile(
            params.trainId,
            params.userAddress,
            params.uploadModelPath,
            params.outputLocalPath,
          );
        } catch (err) {
          status = 'failed';
          log.error(`[-] Failed to upload model - ${err}`);
        }
      }

      try {
        await this.ainConnect.updateTrainingResult(params.trainId,
          params.userAddress, JSON.parse(JSON.stringify({
            modelName: (status === 'completed') ? `${params.jobType}.mar` : undefined,
            status,
            cancelId,
            errMessage: (status === 'failed') ? 'Failed to train' : undefined,
          })));
      } catch (err) {
        log.error(`[-] Failed to update Train Result - ${err}`);
      }
      log.debug(`[+] Train Result: ${status} - trainId: ${params.trainId}`);
      await util.exec(`rm -rf ${params.workerRootPath}`);
    });
  }

  getAinConnect() {
    return this.ainConnect;
  }
}
