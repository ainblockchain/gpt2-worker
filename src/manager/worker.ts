import axios from 'axios';
import Logger from '../common/logger';
import * as types from '../common/types';
import Docker from './docker';
import * as constants from '../common/constants';
import Firebase from '../util/firebase';

const log = Logger.createLogger('manager/worker');

const delay = async (ms: number) => {
  const result = await new Promise((resolve) => setTimeout(resolve, ms));
  return result;
};

export default class Worker {
  static instance: Worker;

  protected dockerApi: Docker;

  protected firebase: Firebase;

  protected workerInfo: types.WorkerInfo;

  static workerInfoUpdateMs = 30 * 1000; // 30s

  static requestPayoutMs = 30 * 1000; // 30s

  static healthChechMacCnt = 100;

  static healthCheckDelayMs = 2000;

  /**
   * Method For Singleton Pattern.
   */
  static getInstance() {
    if (!Worker.instance) {
      Worker.instance = new Worker();
    }
    return Worker.instance;
  }

  /**
   * Start Worker.
  */
  async start(firebase: Firebase, dockerApi: Docker) {
    this.firebase = firebase;
    this.dockerApi = dockerApi;
    log.info(`[+] Start Worker [
      Worker Address: ${this.firebase.getAddress()}
      Model Name: ${constants.MODEL_NAME}
    ]`);

    // Create Container for ML Job.
    log.info('[+] Start to create Job Container. It can take a long time.');
    const modelInfo = constants.modelInfo[constants.MODEL_NAME!];
    await this.dockerApi.run(constants.MODEL_NAME!, modelInfo.imagePath,
      constants.GPU_DEVICE_NUMBER!, constants.JOB_PORT!, String(modelInfo.port));
    log.info('[+] Success to create Job Container.');

    // Update Worker Information on Database.
    setInterval(async () => {
      await this.firebase.setWorkerInfo({
        jobType: constants.MODEL_NAME!,
      });
    }, Worker.workerInfoUpdateMs);

    let health = false;
    for (let cnt = 0; cnt < Worker.healthChechMacCnt; cnt += 1) {
      health = await this.healthCheckContainer(constants.MODEL_NAME!);
      if (health) {
        break;
      }
      await delay(Worker.healthCheckDelayMs);
    }
    if (!health) {
      await this.dockerApi.kill(constants.MODEL_NAME!);
      throw new Error('Failed to run Container.');
    }
    log.info('[+] Start to listen Job');
    this.firebase.listenRequest(this.runJob);
    // Auto Payout.
    setInterval(this.requestToPayout, Worker.requestPayoutMs);
  }

  public requestToPayout = async () => {
    try {
      const balance = await this.firebase.getCurrentBalance();
      await this.firebase.requestToPayout();
      if (balance >= constants.THRESHOLD_AMOUNT) {
        await this.firebase.requestToPayout();
      }
      await this.firebase.requestToPayout();
    } catch (error) {
      log.error(`[-] Failed to request to payout - ${error}`);
    }
  }

  private healthCheckContainer = async (modelName: string) => {
    const { framework, healthCheckPath } = constants.modelInfo[modelName];
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
  public runJob = async (requestId: string, input: {[key: string]: any}) => {
    log.debug(`[+] runJob - requestId: ${requestId}`);
    const vector = JSON.parse(input.data.inputVector.replace(/'/g, ''));
    const data = (constants.modelInfo[constants.MODEL_NAME!].framework === 'tensorflow') ? {
      signature_name: 'predict',
      instances: [vector],
    } : {
      num_samples: input.data.numResultsRequest,
      length: input.data.length,
      text: vector,
    };
    const modelInfo = constants.modelInfo[constants.MODEL_NAME!];
    const res = await axios({
      method: modelInfo.method,
      url: `http://localhost:${constants.JOB_PORT}${modelInfo.apiPath}`,
      headers: {
        'Content-Type': 'application/json',
      },
      data,
    });
    return (constants.modelInfo[constants.MODEL_NAME!].framework === 'tensorflow') ? {
      predictions: JSON.stringify(res.data.predictions),
    } : {
      predictions: JSON.stringify(res.data),
    };
  }
}
