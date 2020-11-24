import * as types from './types';

export const PROD_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyA_ss5fiOD6bckPQk7qnb_Ruwd29OVWXE8',
  authDomain: 'gpt2-ainetwork.firebaseapp.com',
  databaseURL: 'https://gpt2-ainetwork.firebaseio.com',
  projectId: 'gpt2-ainetwork',
  storageBucket: 'gpt2-ainetwork.appspot.com',
  messagingSenderId: '1045334268091',
  appId: '1:1045334268091:web:c0490dfa3e8057a078f19e',
  measurementId: 'G-8NBD57K71C',
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
  WORKER_NAME,
  MNEMONIC,
  MODEL_NAME,
  JOB_PORT,
  GPU_DEVICE_NUMBER,
  ETH_ADDRESS,
  TEST,
} = process.env;

export const MAX_IMAGE_COUNT = 2;
export const statusCode = {
  Success: 0,
  Failed: 1,
};

export const NODE_ENV = process.env.NODE_ENV || 'prod';

export const modelInfo: types.ModelInfo = {
  'gpt-2-large-length-1': {
    apiPath: '/v1/models/gpt-2-large:predict',
    method: 'post',
    imagePath: 'gkswjdzz/gpt-2-large-length-1',
    port: 8501,
    framework: 'tensorflow',
  },
  'gpt-2-large-torch-serving': {
    apiPath: '/predictions/gpt2-large',
    method: 'post',
    imagePath: 'gkswjdzz/gpt-2-large-torch-serving',
    port: 8080,
    framework: 'pytorch',
  },
};

export const payoutPoolAddr = '0x28653A33E5E6e983F426B9321f51939B367Dd40d'; // temp

export const THRESHOLD_AMOUNT = 1000; // temp

export const validateConstants = () => {
  if (!WORKER_NAME || !MNEMONIC || ETH_ADDRESS || !MODEL_NAME
    || !modelInfo[MODEL_NAME] || !GPU_DEVICE_NUMBER
    || !['prod', 'staging'].includes(NODE_ENV) || !JOB_PORT) {
    return false;
  }
  return true;
};
