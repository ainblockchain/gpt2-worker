import * as fs from 'fs';
import { isValidAddress } from '@ainblockchain/ain-util';

export const { WORKER_NAME } = process.env;
export const ROOT_PATH = `/ain-worker/${WORKER_NAME}`;
export const SHARED_ROOT_PATH = '/server/shared';
export const ENV_PATH = `${SHARED_ROOT_PATH}/env.json`;
export const SERVICE_JSON_PATH = '/server/shared/service.json';

let env;
if (fs.existsSync(ENV_PATH)) {
  env = JSON.parse(String(fs.readFileSync(ENV_PATH)));
} else {
  env = {};
}

env = {
  ...env,
  ...process.env,
};

// process.env > env.json
export const {
  INFERENCE_MODEL_NAME,
  ETH_ADDRESS,
  AIN_PRIVATE_KEY,
  SERVICE_JSON,
  SLACK_WEBHOOK_URL,
  GPU_DEVICE_NUMBER,
} = env;

export const STATUS_CODE = {
  SUCCESS: 0,
  FAILED: 1,
};

export const NODE_ENV = env.NODE_ENV || 'prod';
export const INFERENCE_CONTAINER_PORT = env.INFERENCE_CONTAINER_PORT || '7777';
export const ENABLE_AUTO_PAYOUT = env.ENABLE_AUTO_PAYOUT || 'true';
export const START_TIME = Date.now();

export const validateConstants = () => {
  if (!WORKER_NAME || !/^[A-z]+[A-z0-9]*$/.test(WORKER_NAME)) {
    throw new Error(`Invalid ENV[WORKER_NAME=${WORKER_NAME}] - ^[A-z]+$`);
  } else if (!ETH_ADDRESS || !isValidAddress(ETH_ADDRESS)) {
    throw new Error(`Invalid ENV[ETH_ADDRESS=${ETH_ADDRESS}]`);
  } else if (!['prod', 'staging'].includes(NODE_ENV)) {
    throw new Error(`Invalid ENV[NODE_ENV=${NODE_ENV}} - 'prod' or 'staging'`);
  } else if (!/^[0-9]+$/.test(INFERENCE_CONTAINER_PORT)) {
    throw new Error(`Invalid ENV[INFERENCE_CONTAINER_PORT=${INFERENCE_CONTAINER_PORT}} - ^[0-9]+$`);
  } else if (!/^\d*(,\d+)*\d*$/.test(GPU_DEVICE_NUMBER)) {
    throw new Error(`Invalid ENV[GPU_DEVICE_NUMBER=${GPU_DEVICE_NUMBER}} - ex. '1,2'`);
  }
};
