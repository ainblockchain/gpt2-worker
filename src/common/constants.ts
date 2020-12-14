import * as fs from 'fs';
import * as types from './types';

const env = JSON.parse(String(fs.readFileSync('./env.json')));

export const PROD_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCaNna60wsEWDYhAleGVj5jjp3-24GCtN0',
  authDomain: 'gpt2-ainetwork-prod.firebaseapp.com',
  databaseURL: 'https://gpt2-ainetwork-prod.firebaseio.com',
  projectId: 'gpt2-ainetwork-prod',
  storageBucket: 'gpt2-ainetwork-prod.appspot.com',
  messagingSenderId: '983388933112',
  appId: '1:983388933112:web:a199871d763bcdb59e240d',
  measurementId: 'G-CMS0JDQQB6',
};

export const STAGING_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyA_ss5fiOD6bckPQk7qnb_Ruwd29OVWXE8',
  authDomain: 'gpt2-ainetwork.firebaseapp.com',
  databaseURL: 'https://gpt2-ainetwork.firebaseio.com',
  projectId: 'gpt2-ainetwork',
  storageBucket: 'gpt2-ainetwork.appspot.com',
  messagingSenderId: '1045334268091',
  appId: '1:1045334268091:web:c0490dfa3e8057a078f19e',
  measurementId: 'G-8NBD57K71C',
};

export const {
  MODEL_NAME,
  GPU_DEVICE_NUMBER,
  ETH_ADDRESS,
  KET_STORE,
  PASSWORD,
} = env;

export const ENV = env;

export const MAX_IMAGE_COUNT = 2;
export const statusCode = {
  Success: 0,
  Failed: 1,
};

export const NODE_ENV = env.NODE_ENV || 'prod';
export const JOB_PORT = env.JOB_PORT || '7777';
export const ENABLE_AUTH_PAYOUT = env.ENABLE_AUTH_PAYOUT || 'true';

export const modelInfo: types.ModelInfo = {
  'gpt-2-large-length-1': {
    apiPath: '/v1/models/gpt-2-large:predict',
    healthCheckPath: '/v1/models/gpt-2-large',
    method: 'post',
    imagePath: 'gkswjdzz/gpt-2-large-length-1',
    port: 8501,
    framework: 'tensorflow',
  },
  'gpt-2-large-torch-serving': {
    apiPath: '/predictions/gpt2-large',
    healthCheckPath: '/ping',
    method: 'post',
    imagePath: 'gkswjdzz/gpt-2-large-torch-serving',
    port: 8080,
    framework: 'pytorch',
  },
  'gpt-2-trump-torch-serving': {
    apiPath: '/predictions/gpt2-trump',
    healthCheckPath: '/ping',
    method: 'post',
    imagePath: 'gkswjdzz/gpt-2-trump-torch-serving',
    port: 8080,
    framework: 'pytorch',
  },
};

export const payoutPoolAddr = '0x945bDFa911cf895Bca3F4b5B5816BcfDb5A1480b';

export const THRESHOLD_AMOUNT = 100;

export const CURRENT_PROTOCOL_VERSION = '0.5.0';

export const validateConstants = () => {
  if (!ETH_ADDRESS || ETH_ADDRESS === '') {
    throw new Error('"ETH_ADDRESS" Does not Exist.');
  } else if (!MODEL_NAME || !modelInfo[MODEL_NAME]) {
    throw new Error(`Invalid "MODEL_NAME":${MODEL_NAME} - ${Object.keys(modelInfo)}`);
  } else if (!GPU_DEVICE_NUMBER || GPU_DEVICE_NUMBER === '') {
    throw new Error('"GPU_DEVICE_NUMBER" Does not Exist. (ex. 0)');
  } else if (!PASSWORD || PASSWORD === '') {
    throw new Error('"PASSWORD" Does not Exist. (ex. 0)');
  } else if (!['prod', 'staging'].includes(NODE_ENV)) {
    throw new Error(`Invalid NODE_ENV:${NODE_ENV} - [prod, staging]`);
  }
};
