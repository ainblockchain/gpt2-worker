import { Storage } from '@google-cloud/storage';
import { NODE_ENV } from '../common/constants';

// eslint-disable-next-line no-nested-ternary
export const FIREBASE_CONFIG = (NODE_ENV === 'prod') ? {
  apiKey: 'AIzaSyCaNna60wsEWDYhAleGVj5jjp3-24GCtN0',
  authDomain: 'gpt2-ainetwork-prod.firebaseapp.com',
  databaseURL: 'https://gpt2-ainetwork-prod.firebaseio.com',
  projectId: 'gpt2-ainetwork-prod',
  storageBucket: 'gpt2-ainetwork-prod.appspot.com',
  messagingSenderId: '983388933112',
  appId: '1:983388933112:web:a199871d763bcdb59e240d',
  measurementId: 'G-CMS0JDQQB6',
} : (NODE_ENV === 'staging') ? {
  apiKey: 'AIzaSyDFdzVaMN1BzEEYtIw0i36do_7ojaGtPPo',
  authDomain: 'gpt2-ainetwork-staging.firebaseapp.com',
  databaseURL: 'https://gpt2-ainetwork-staging-default-rtdb.firebaseio.com',
  projectId: 'gpt2-ainetwork-staging',
  storageBucket: 'gpt2-ainetwork-staging.appspot.com',
  messagingSenderId: '413933589405',
  appId: '1:413933589405:web:73b59c581df50e5d729574',
  measurementId: 'G-SNCK4FLQBN',
} : { // dev
  apiKey: 'AIzaSyCaNna60wsEWDYhAleGVj5jjp3-24GCtN0',
  authDomain: 'gpt2-ainetwork-prod.firebaseapp.com',
  databaseURL: 'https://gpt2-ainetwork-prod.firebaseio.com',
  projectId: 'gpt2-ainetwork-prod',
  storageBucket: 'gpt2-ainetwork-prod.appspot.com',
  messagingSenderId: '983388933112',
  appId: '1:983388933112:web:a199871d763bcdb59e240d',
  measurementId: 'G-CMS0JDQQB6',
};

export const THRESHOLD_PAYOUT_AMOUNT = 100;

export const CURRENT_PROTOCOL_VERSION = '0.5.0';

export const COLLABORATIVE_AI_PREFIX = '/apps/collaborative_ai';

export const OPERRATION_TYPE = {
  getAuthToken: 'GET_AUTH_TOKEN',
  setValue: 'SET_VALUE',
};

export const FUNCTIONS_NAMES = {
  getAuthToken: 'getAuthToken',
  sendSignedTransaction: 'sendSignedTransaction',
  setWorkerInfo: 'setWorkerInfo',
  inferResponse: 'inferResponse',
  isAinAddressKycVerified: 'isAinAddressKycVerified',
};

export function getKycAinPath(address: string) {
  return `/kyc_ain/${address}}`;
}

export function getjobTypesPath() {
  return '/job_types';
}

export function getKycAinEthAddrPath(address: string) {
  return `/kyc_ain/${address}/eth_address`;
}

export function getAccountsBalancePath(address: string) {
  return `/accounts/${address}/balance`;
}

export function getWorkerInfoPath(address: string) {
  return `/worker_info/${address}`;
}

export function getInferencePath(address: string) {
  return `/inference/${address}`;
}

export function getInferenceResultPath(address: string, requestId: string) {
  return `/inference_result/${requestId}/${address}`;
}

export function getAinPayoutPath(address: string, requestId: string) {
  return `ain_payout/${address}/${requestId}`;
}

export function getTransferValuePath(fromAddress: string, toAddress: string, requestId: string) {
  return `/transfer/${fromAddress}/${toAddress}/${requestId}/value`;
}

export function getUserTransactionsPath(address: string) {
  return `/user_transactions/${address}/`;
}

export function getTrainingPath(address: string) {
  return `/training/${address}/`;
}

export function getTrainingResultPath(trainId: string, userAddress: string, workerAddress: string) {
  return `/train_tasks/${userAddress}/${trainId}/response/${workerAddress}`;
}

export function getDatasetPath(uid: string, trainId: string, fileName: string) {
  return `/trainData/${uid}/${trainId}/${fileName}`;
}

export function getModelUploadPath(trainId: string, address: string, fileName: string) {
  return `trainResult/${trainId}/${address}/${fileName}`; // the path must not start with '/' (firebase Storage PATH)
}

export function getPoolAddrPath() {
  return '/pool_addresses';
}

export async function existsBucket(bucketName: string) {
  try {
    const storage = new Storage();
    const results = await storage.getBuckets();
    const [buckets] = results;
    let result = false;
    buckets.forEach((bucket) => {
      if (bucket.name === bucketName) {
        result = true;
      }
    });
    return result;
  } catch (err) {
    return false;
  }
}
