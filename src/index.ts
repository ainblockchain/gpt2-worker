import program from 'commander';
import Worker from './handler/worker';
import Logger from './common/logger';
import * as constants from './common/constants';

const log = Logger.createLogger('index');

program.command('serve').action(async () => {
  try {
    constants.validateConstants();
    const worker = new Worker();
    await worker.start();
  } catch (err) {
    log.error(`[-] Failed to start Worker - ${err.message}`);
    process.exit(1);
  }
});

program.parse(process.argv);
