import axios from 'axios';
import Logger from '../common/logger';
import * as types from '../common/types';
import Docker from './docker';
import Firebase from '../util/firebase';
import * as constants from '../common/constants';

const log = Logger.createLogger('manager.worker');

export default class Worker {
  static instance: Worker;

  protected dockerApi: Docker;

  protected firebase: Firebase;

  protected workerInfo: types.WorkerInfo;

  static workerInfoUpdateSec = 10;

  constructor(workerInfo: types.WorkerInfo, dockerApi: Docker, firebase: Firebase) {
    this.workerInfo = workerInfo;
    this.dockerApi = dockerApi;
    this.firebase = firebase;
  }

  /**
   * Get WorkerBase instance for Singleton Pattern.
   * @returns WorkerBase instance.
  */
  static async getInstance() {
    if (!Worker.instance) {
      const dockerApi = await Docker.getInstance();
      const firebase = new Firebase(constants.MNEMONIC!,
        constants.WORKER_NAME!, constants.NODE_ENV as types.EnvType);
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

  async init() {
    log.info('[+] Start to create Job container');
    if (!constants.modelInfo[constants.MODEL_NAME!]) {
      throw new Error(`Invalid Model ${constants.MODEL_NAME}`);
    }
    const modelInfo = constants.modelInfo[constants.MODEL_NAME!];
    await this.dockerApi.run(constants.MODEL_NAME!, modelInfo.imagePath,
      constants.GPU_DEVICE_NUMBER!, constants.JOB_PORT!, modelInfo.port);
    log.info('[+] success to create Job container');
  }

  public runJob = async (input: {[key: string]: string}) => {
    log.debug('[+] runJob');
    // temp (Only tenworflow serving)
    const data = {
      signature_name: 'predict',
      instances: JSON.parse(input.instances.replace(/'/g, '')),
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
    return { predictions: JSON.stringify(res.data.predictions) };
  }
}
