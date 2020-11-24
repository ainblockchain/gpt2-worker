import axios from 'axios';
import Logger from '../common/logger';
import * as types from '../common/types';
import Docker from './docker';
import FirebaseUtil from '../util/firebase';
import * as constants from '../common/constants';

const log = Logger.createLogger('manager.worker');

export default class Worker {
  static instance: Worker;

  protected dockerApi: Docker;

  protected firebase: FirebaseUtil;

  protected workerInfo: types.WorkerInfo;

  static workerInfoUpdateSec = 10;

  constructor(workerInfo: types.WorkerInfo, dockerApi: Docker, firebase: FirebaseUtil) {
    this.workerInfo = workerInfo;
    this.dockerApi = dockerApi;
    this.firebase = firebase;
  }

  /**
   * Get Worke instance for Singleton Pattern.
   * @returns Worker instance.
  */
  static async getInstance() {
    if (!Worker.instance) {
      const dockerApi = await Docker.getInstance();
      const firebase = await FirebaseUtil.getInstance();
      Worker.instance = new Worker({
        jobType: constants.MODEL_NAME as string,
      }, dockerApi, firebase);
    }

    return Worker.instance;
  }

  /**
   * Start Worker.
  */
  async start() {
    log.info(`[+] Start Worker [
      Worker Address: ${this.firebase.getAddress()}
      Worker Name: ${constants.WORKER_NAME} 
      Model Name: ${this.workerInfo.jobType}
    ]`);
    await this.init();
    setInterval(async () => {
      await this.firebase.setWorkerInfo(this.workerInfo);
    }, Worker.workerInfoUpdateSec * 1000);

    setTimeout(() => {
      this.firebase.listenRequest(this.runJob);
    }, 5000);
  }

  /**
   * Create Container for Serving ML Job.
  */
  async init() {
    log.info('[+] Start to create Job container');
    if (!constants.modelInfo[constants.MODEL_NAME!]) {
      throw new Error(`Invalid Model ${constants.MODEL_NAME}`);
    }
    if (constants.TEST !== 'true') {
      const modelInfo = constants.modelInfo[constants.MODEL_NAME!];
      await this.dockerApi.run(constants.MODEL_NAME!, modelInfo.imagePath,
        constants.GPU_DEVICE_NUMBER!, constants.JOB_PORT!, String(modelInfo.port));
      log.info('[+] success to create Job container');
    }
  }

  /**
   * Request to ML Container.
  */
  public runJob = async (input: {[key: string]: any}) => {
    log.debug('[+] runJob');
    const data = (constants.modelInfo[constants.MODEL_NAME!].framework === 'tensorflow') ? {
      signature_name: 'predict',
      instances: JSON.parse(input.data.instances.replace(/'/g, '')),
    } : {
      num_samples: input.num_samples,
      length: input.length,
      text: JSON.parse(input.data.text.replace(/'/g, '')),
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
      params: input.params,
      result: {
        predictions: JSON.stringify([res.data.predictions]),
      },
    } : {
      params: input.params,
      result: {
        predictions: JSON.stringify(res.data),
      },
    };
  }
}
