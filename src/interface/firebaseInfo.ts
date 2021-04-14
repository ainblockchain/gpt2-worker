import { Storage } from '@google-cloud/storage';
import { NODE_ENV } from '../common/constants';

export const FIREBASE_CONFIG = (NODE_ENV === 'prod') ? {
  apiKey: 'AIzaSyCaNna60wsEWDYhAleGVj5jjp3-24GCtN0',
  authDomain: 'gpt2-ainetwork-prod.firebaseapp.com',
  databaseURL: 'https://gpt2-ainetwork-prod.firebaseio.com',
  projectId: 'gpt2-ainetwork-prod',
  storageBucket: 'gpt2-ainetwork-prod.appspot.com',
  messagingSenderId: '983388933112',
  appId: '1:983388933112:web:a199871d763bcdb59e240d',
  measurementId: 'G-CMS0JDQQB6',
} : {
  apiKey: 'AIzaSyA_ss5fiOD6bckPQk7qnb_Ruwd29OVWXE8',
  authDomain: 'gpt2-ainetwork.firebaseapp.com',
  databaseURL: 'https://gpt2-ainetwork.firebaseio.com',
  projectId: 'gpt2-ainetwork',
  storageBucket: 'gpt2-ainetwork.appspot.com',
  messagingSenderId: '1045334268091',
  appId: '1:1045334268091:web:c0490dfa3e8057a078f19e',
  measurementId: 'G-8NBD57K71C',
};

export const BUCKET_NAME = (NODE_ENV === 'prod') ? 'gpt2-ainetwork-prod.appspot.com' : 'gpt2-ainetwork.appspot.com';

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
