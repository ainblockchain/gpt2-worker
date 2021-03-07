import axios from 'axios';
import * as fs from 'fs';
import * as util from 'util';
import { diff } from 'deep-object-diff';
import Logger from '../common/logger';
import * as types from '../common/types';
import Docker from './docker';
import * as constants from '../common/constants';
import AinConnect from '../interface/ainConnect';
import {
  THRESHOLD_AMOUNT, existsBucket, PROD_BUCKET_NAME, STAGING_BUCKET_NAME,
} from '../interface/firebaseInfo';

const log = Logger.createLogger('handler/worker');

const exec = util.promisify(require('child_process').exec);

const delay = async (ms: number) => {
  const result = await new Promise((resolve) => setTimeout(resolve, ms));
  return result;
};

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
      Model Name: ${(!constants.TRAIN_MODE) ? constants.MODEL_NAME : '-'}
    ]`);
    await this.ainConnect.signIn();

    // Update Env File (Add AIN_PRIVATE_KEY and AIN_ADDRESS).
    const newEnv = {
      ...constants.ENV,
      AIN_PRIVATE_KEY: this.ainConnect.getPrivateKey(),
      AIN_ADDRESS: this.ainConnect.getAddress(),
    };
    fs.truncateSync(constants.ENV_PATH, 0);
    fs.appendFileSync(constants.ENV_PATH, JSON.stringify(newEnv, null, 2));

    if (constants.TRAIN_MODE) {
      const existsBucketResult = await existsBucket(
        (constants.NODE_ENV === 'prod')
          ? PROD_BUCKET_NAME : STAGING_BUCKET_NAME,
      );
      if (!existsBucketResult) {
        throw new Error('Invalid Service.json');
      }
    } else {
      // Get AI Model Information on Firebase Database.
      this.modelInfo = await this.ainConnect.getModelInfo();
      const selectModelInfo = this.modelInfo[constants.MODEL_NAME!];
      if (!selectModelInfo) {
        throw new Error(`Invaild MODEL_NAME[${constants.MODEL_NAME}]`);
      }

      // Create Container for ML Job.
      log.info('[+] Start to create Job Container. It can take a long time.');
      await Docker.runContainerWithGpu(constants.MODEL_NAME!, selectModelInfo.imagePath, {
        publishPorts: {
          [constants.JOB_PORT!]: String(selectModelInfo.port),
        },
        gpuDeviceNumber: constants.GPU_DEVICE_NUMBER!,
        labels: {
          [constants.WORKER_NAME!]: '',
        },
      });
      log.info('[+] Success to create Job Container.');
      this.trainLogData = {};
      // Check AI Model container by calling health API.
      let health = false;
      for (let cnt = 0; cnt < Worker.healthCheckMaxCnt; cnt += 1) {
        health = await this.healthCheckContainer(constants.MODEL_NAME!);
        if (health) {
          break;
        }
        await delay(Worker.healthCheckDelayMs);
      }
      if (!health) {
        await Docker.killContainer(constants.MODEL_NAME!);
        throw new Error('Failed to run Container.');
      }
    }

    // Set Worker Information on firebase database.
    setInterval(async () => {
      const gpuInfo = await this.getGpuInfo();
      await this.ainConnect.setWorkerInfo({
        jobType: constants.MODEL_NAME,
        type: (constants.MODEL_NAME) ? 'inference' : 'training',
        gpuInfo,
      });
    }, Worker.workerInfoUpdateMs);

    // Set Worker ETH_ADDRESS on firebase database.
    await this.ainConnect.registerEthAddr(constants.ETH_ADDRESS);

    // Listen to 'user_transactions' for logging about reward
    this.ainConnect.listenTransaction(this.listenTransactionHandler);

    log.info('[+] Start to listen Job');
    if (constants.TRAIN_MODE) {
      this.ainConnect.listenForTrainingRequest(this.jobTrainingHandler,
        this.jobCancelTrainingHandler);
    } else {
      this.ainConnect.listenForInferenceRequest(this.jobInferenceHandler);
    }
    // Auto payout
    if (constants.ENABLE_AUTO_PAYOUT === 'true') {
      setInterval(this.requestToPayout, Worker.requestPayoutMs);
    }
  }

  /**
  * Request to payout.
  */
  public requestToPayout = async () => {
    try {
      const balance = await this.ainConnect.getCurrentBalance();
      const isAinAddressKycVerified = await this.ainConnect.isAinAddressKycVerified();
      if (balance >= THRESHOLD_AMOUNT && isAinAddressKycVerified) {
        await this.ainConnect.payout(THRESHOLD_AMOUNT);
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
      const res = await axios.get(`http://localhost:${constants.JOB_PORT}${healthCheckPath}`);
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
   * Request to ML Inference Container.
  */
  public jobInferenceHandler = async (params: types.InferenceHandlerParams) => {
    const vector = JSON.parse(params.data.inputVector.replace(/'/g, ''));
    const data = (this.modelInfo[constants.MODEL_NAME!].framework === 'tensorflow') ? {
      signature_name: 'predict',
      instances: [vector],
    } : {
      num_samples: params.data.numResultsRequest,
      length: params.data.length,
      text: vector,
    };
    const modelInfo = this.modelInfo[constants.MODEL_NAME!];
    const res = await axios({
      method: modelInfo.method,
      url: `http://localhost:${constants.JOB_PORT}${modelInfo.apiPath}`,
      headers: {
        'Content-Type': 'application/json',
      },
      data,
    });
    return (this.modelInfo[constants.MODEL_NAME!].framework === 'tensorflow') ? {
      predictions: JSON.stringify(res.data.predictions),
    } : {
      predictions: JSON.stringify(res.data),
    };
  }

  /**
  * Handler for logging about reward.
  */
  public listenTransactionHandler = (params: types.UserTransactionParams) => {
    if (params.type === 'REWARD_JOB') {
      this.totalRewardAmount += params.value;
      if (constants.START_TIME < params.timestamp) {
        log.info(`[+] Current AIN Total Reward balance: ${this.totalRewardAmount} ain (+ ${params.value})`);
      }
    } else if (params.type === 'PAYOUT_CONFIRMED') {
      this.totalPayoutAmount += params.value;
      if (constants.START_TIME < params.timestamp) {
        log.info(`[+] Current AIN Total Payout balance: ${this.totalPayoutAmount} ain (+ ${params.value})`);
      }
    }
  }

  /**
   * Request to ML training Container.
  */
  public jobTrainingHandler = async (trainId: string, params: types.trainingParams) => {
    if (this.trainInfo.running) {
      throw new Error('Other task is already in progress');
    }
    this.trainInfo = {
      userAddr: params.userAddress,
      trainId,
      running: true,
    };
    const workerRootPath = `${constants.SHARED_ROOT_PATH}/train/${trainId}`;
    const containerRootPath = `/train/${trainId}`;
    const containerName = 'worker-train';
    await exec(`mkdir -p ${workerRootPath}`);
    try {
      await this.ainConnect.downloadFile(params.datasetPath, `${workerRootPath}/${params.fileName}`);
      log.debug(`[+] success to download file (id: ${trainId})`);
      // Create Container for training
      await Docker.runContainerWithGpu(containerName, params.imagePath, {
        gpuDeviceNumber: constants.GPU_DEVICE_NUMBER,
        env: [`epochs=${params.epochs}`,
          `jobType=${params.jobType}`,
          `mountedDataPath=${containerRootPath}/${params.fileName}`,
          `outputPath=${containerRootPath}/${params.jobType}.mar`,
          `logFilePath=${containerRootPath}/logs`],
        binds: [`${constants.CONFIG_ROOT_PATH}/train/${trainId}:${containerRootPath}`],
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
      log.error(error);
      await exec(`rm -rf ${workerRootPath}`);
      throw error;
    }
  }

  /**
   * Request to ML training Container.
  */
  public jobCancelTrainingHandler = async (
    cancelId: string, params: types.CancelTrainingParams,
  ) => {
    try {
      if (this.trainInfo.trainId !== params.trainId) {
        throw new Error('Not training');
      }
      if (this.trainInfo.userAddr !== params.userAddress) {
        throw new Error('Not permission');
      }
      this.trainInfo.cancelId = cancelId;
      this.trainInfo.needSave = params.needSave;
      if (Docker.existContainer(params.trainId)) {
        await Docker.execContainer(params.trainId,
          "ps -aux | grep -m 1 python | awk '{print $2}' | xargs -I{} kill -9 {}");
      } else {
        Docker.cancelPullImage(params.trainId);
      }
      return {
        startedAt: Date.now(),
        status: 'success',
      };
    } catch (error) {
      log.error(error);
      throw error;
    }
  }

  /**
   * Monitoring Method About training Container.
   * @param name training Container Name.
   * @param params MonitoringParams(trainId..).
   */
  private monitoringTrainContainer(name: string, params: types.MonitoringParams) {
    const watch = this.watchJsonFile(params.logPath, async (value: Object) => {
      await this.ainConnect.updateTrainingResult(params.trainId, params.userAddress, {
        trainingLogs: value,
      });
    });
    Docker.containerLog(name, async (data: string) => {
      // Data handler
      await this.ainConnect.updateTrainingResult(params.trainId, params.userAddress, {
        containerLogs: {
          [String(Date.now())]: data,
        },
      });
    },
    async (err: Error) => {
      this.trainInfo = {
        running: false,
      };
      watch.close();
      // End handler
      if (err) {
        await this.ainConnect.updateTrainingResult(params.trainId, params.userAddress, {
          status: 'failed',
        });
        return;
      }

      try {
        let status = 'failed';
        const existModel = fs.existsSync(params.outputLocalPath);
        if (this.trainInfo.cancelId) {
          status = (existModel && this.trainInfo.needSave) ? 'completed' : 'canceled';
        } else if (existModel) {
          status = 'completed';
        }
        if (status === 'completed') {
          await this.ainConnect.uploadFile(params.uploadModelPath, params.outputLocalPath);
        }
        await this.ainConnect.updateTrainingResult(params.trainId,
          params.userAddress, JSON.parse(JSON.stringify({
            modelName: `${params.jobType}.mar`,
            status,
            errMessage: (status === 'failed') ? 'Failed to train' : undefined,
          })));
        log.debug(`[+] Train Result: ${status} - trainId: ${params.trainId}`);
      } catch (error) {
        await this.ainConnect.updateTrainingResult(params.trainId,
          params.userAddress, JSON.parse(JSON.stringify({
            status: 'failed',
            errMessage: 'Failed to train',
          }))).catch(() => {});
        log.error(`[-] Failed to send result about training - ${error.message}`);
      }
      await exec(`rm -rf ${params.workerRootPath}`);
    });
  }

  watchJsonFile(jsonFilePath: string, callback: Function) {
    fs.writeFileSync(jsonFilePath, '');
    this.trainLogData = {};
    return fs.watch(jsonFilePath, async (event: string, filename: string) => {
      let diffObject;
      try {
        const data = String(fs.readFileSync(jsonFilePath));
        if (data === '') {
          return;
        }
        const json = JSON.parse(data);

        diffObject = diff(this.trainLogData, json);
        this.trainLogData = json;
        if (Object.keys(diffObject).length === 0) {
          return;
        }
        await callback(diffObject);
      } catch (err) {
        log.error(`event: ${event}, filename: ${filename} - ${diffObject} - ${err}`);
      }
    });
  }

  async getGpuInfo(): Promise<types.GPUInfo> {
    const command = 'nvidia-smi --query-gpu=name,driver_version,memory.used,memory.total --format=csv,noheader';
    const { stdout } = await exec(command);
    const infoList = stdout.split('\n');
    infoList.pop();
    const result = {};
    for (const info of infoList) {
      const dataList = info.split(',').map((item: string) => item.replace(' ', ''));
      result[dataList[0]] = {
        driverVersion: dataList[1],
        memoryUsed: dataList[2],
        memoryTotal: dataList[3],
      };
    }
    return result;
  }
}
