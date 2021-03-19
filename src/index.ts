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
    await util.editJsonFile(constants.ENV_PATH, {
      ...constants.ENV,
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
