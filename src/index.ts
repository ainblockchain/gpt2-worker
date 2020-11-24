import program from 'commander';
import Worker from './manager/worker';
import Logger from './common/logger';
import * as constants from './common/constants';

const log = Logger.createLogger('index');

program.command('serve').action(async () => {
  try {
    if (!constants.validateConstants()) {
      throw new Error('Invalid Constants.');
    }
    const worker = await Worker.getInstance();
    await worker.start();
  } catch (err) {
    log.error(err);
  }
});

program.parse(process.argv);
