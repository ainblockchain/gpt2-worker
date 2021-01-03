import * as fs from 'fs';
import { isValidAddress } from '@ainblockchain/ain-util';
import Logger from './logger';

const log = Logger.createLogger('common/constants');

export const ENV_PATH = './env.json';

let env;
try {
  env = JSON.parse(String(fs.readFileSync(ENV_PATH)));
} catch (err) {
  log.error('[-] Failed to load env file.');
}

export const {
  MODEL_NAME,
  GPU_DEVICE_NUMBER,
  ETH_ADDRESS,
  AIN_PRIVATE_KEY,
} = env;
export const ENV = env;

export const statusCode = {
  Success: 0,
  Failed: 1,
};

export const NODE_ENV = env.NODE_ENV || 'prod';
export const JOB_PORT = env.JOB_PORT || '7777';
export const ENABLE_AUTO_PAYOUT = env.ENABLE_AUTO_PAYOUT || 'true';

export const START_TIME = Date.now();

export const validateConstants = () => {
  if (!ETH_ADDRESS || !isValidAddress(ETH_ADDRESS)) {
    throw new Error(`Invalid "ETH_ADDRESS" - ${ETH_ADDRESS}`);
  } else if (!GPU_DEVICE_NUMBER || GPU_DEVICE_NUMBER === '') {
    throw new Error('"GPU_DEVICE_NUMBER" Does not Exist. (ex. 0)');
  } else if (!['prod', 'staging'].includes(NODE_ENV)) {
    throw new Error(`Invalid NODE_ENV:${NODE_ENV} - [prod, staging]`);
  }
};
