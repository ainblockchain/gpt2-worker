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

export const PAYOUT_POOL_ADDR = '0x945bDFa911cf895Bca3F4b5B5816BcfDb5A1480b';

export const THRESHOLD_AMOUNT = 100;

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

export function gettrainingPath(address: string) {
  return `/training/${address}/`;
}

export function getTrainingResultPath(trainId: string, address: string) {
  return `/training_result/${trainId}/${address}/`;
}

export function getDatasetPath(uid: string, trainId: string, fileName: string) {
  return `/trainData/${uid}/${trainId}/${fileName}`;
}

export function getModelUploadPath(trainId: string, address: string, fileName: string) {
  return `/trainResult/${trainId}/${address}/${fileName}`;
}
