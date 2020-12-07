import program from 'commander';
import Worker from './manager/worker';
import Logger from './common/logger';
import * as constants from './common/constants';
import Docker from './manager/docker';
import Firebase from './util/firebase';

const log = Logger.createLogger('index');

program.command('serve').action(async () => {
  try {
    constants.validateConstants();
    const dockerApi = Docker.getInstance();
    if (!dockerApi.isNvidiaDocker()) {
      log.error('[-] Not NVIDIA Docker.');
      return;
    }
    const firebase = Firebase.getInstance();
    await firebase.start();
    const worker = Worker.getInstance();
    await worker.start(firebase, dockerApi);
  } catch (err) {
    log.error(`[-] Failed to Start Worker - ${err.message}`);
  }
});

program.parse(process.argv);
