import program from 'commander';
import Worker from './handler/worker';
import Logger from './common/logger';
import * as constants from './common/constants';
import * as util from './handler/util';

const log = Logger.createLogger('index');

program.command('serve').action(async () => {
  try {
    constants.validateConstants();
    const worker = new Worker();
    util.editJsonFile(constants.ENV_PATH, {
      INFERENCE_MODEL_NAME: constants.INFERENCE_MODEL_NAME,
      ETH_ADDRESS: constants.ETH_ADDRESS,
      SERVICE_JSON: constants.SERVICE_JSON,
      SLACK_WEBHOOK_URL: constants.SLACK_WEBHOOK_URL,
      GPU_DEVICE_NUMBER: constants.GPU_DEVICE_NUMBER,
      AIN_PRIVATE_KEY: worker.getAinConnect().getPrivateKey(),
      AIN_ADDRESS: worker.getAinConnect().getAddress(),
    });
    await worker.start();
  } catch (err) {
    log.error(`[-] Failed to Start Worker - ${err.message}`);
    process.exit(1);
  }
});

program.parse(process.argv);
