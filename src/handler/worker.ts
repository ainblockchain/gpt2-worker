import axios from 'axios';
import * as fs from 'fs';
import Logger from '../common/logger';
import * as types from '../common/types';
import Docker from './docker';
import * as constants from '../common/constants';
import AinConnect from '../interface/ainConnect';
import { THRESHOLD_AMOUNT } from '../interface/firebaseInfo';

const log = Logger.createLogger('handler/worker');

const delay = async (ms: number) => {
  const result = await new Promise((resolve) => setTimeout(resolve, ms));
  return result;
};

export default class Worker {
  protected ainConnect: AinConnect;

  protected modelInfo: types.ModelInfo;

  static workerInfoUpdateMs = 30 * 1000; // 30s

  static requestPayoutMs = 10 * 60 * 1000;

  static healthCheckMaxCnt = 100;

  static healthCheckDelayMs = 2000;

  public totalRewardAmount: number;

  public totalPayoutAmount: number;

  constructor(test: boolean = false) {
    this.totalRewardAmount = 0;
    this.totalPayoutAmount = 0;
    this.ainConnect = new AinConnect(constants.AIN_PRIVATE_KEY, test);
  }

  /**
  * Start Worker.
  */
  async start() {
    log.info(`[+] Start Worker [
      Worker Address: ${this.ainConnect.getAddress()}
      Model Name: ${constants.MODEL_NAME}
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

    // Get AI Model Information on Firebase Database.
    this.modelInfo = await this.ainConnect.getModelInfo();
    const selectModelInfo = this.modelInfo[constants.MODEL_NAME!];
    if (!selectModelInfo) {
      throw new Error(`Invaild MODEL_NAME[${constants.MODEL_NAME}]`);
    }

    // Create Container for ML Job.
    log.info('[+] Start to create Job Container. It can take a long time.');
    await Docker.runContainerWithGpu(constants.MODEL_NAME!, selectModelInfo.imagePath,
      constants.GPU_DEVICE_NUMBER!, {
        [constants.JOB_PORT!]: String(selectModelInfo.port),
      });
    log.info('[+] Success to create Job Container.');

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

    // Set Worker Information on firebase database.
    setInterval(async () => {
      await this.ainConnect.setWorkerInfo({
        jobType: constants.MODEL_NAME!,
      });
    }, Worker.workerInfoUpdateMs);

    // Set Worker ETH_ADDRESS on firebase database.
    await this.ainConnect.registerEthAddr(constants.ETH_ADDRESS);

    // Listen to 'user_transactions' for logging about reward
    this.ainConnect.listenTransaction(this.listenTransactionHandler);

    log.info('[+] Start to listen Job');
    this.ainConnect.listenForJobRequest(this.jobHandler);

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
   * Request to ML Container.
  */
  public jobHandler = async (params: types.InferenceHandlerParams) => {
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
}
