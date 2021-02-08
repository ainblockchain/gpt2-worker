import { mnemonicToSeedSync, generateMnemonic } from 'bip39';
import * as ainUtil from '@ainblockchain/ain-util';
import HDKey from 'hdkey';
import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/database';
import 'firebase/functions';
import 'firebase/storage';
import * as https from 'https';
import * as fs from 'fs';
import * as util from 'util';
import * as constants from '../common/constants';
import * as firebaseInfo from './firebaseInfo';
import * as types from '../common/types';
import Logger from '../common/logger';

// Polyfills required for Firebase
// eslint-disable-next-line import/no-unresolved
(global as any).XMLHttpRequest = require('xhr2');

const readFile = util.promisify(fs.readFile);

const log = Logger.createLogger('interface/ainConnect');

type KeyInfo = {
  privateKeyBuffer: Buffer;
  publicKeyBuffer: Buffer;
  address: string;
}

export default class AinConnect {
  private keyInfo: KeyInfo;

  private app: firebase.app.App;

  constructor(privateKey?: string, test: boolean = false) {
    const privateKeyBuffer = (privateKey) ? ainUtil.toBuffer(privateKey)
      : HDKey.fromMasterSeed(mnemonicToSeedSync(generateMnemonic()))
        .derive("m/44'/412'/0'/0/0").privateKey;
    this.keyInfo = {
      privateKeyBuffer,
      publicKeyBuffer: ainUtil.privateToPublic(privateKeyBuffer),
      address: ainUtil.toChecksumAddress(`0x${ainUtil.pubToAddress(ainUtil.privateToPublic(privateKeyBuffer), true)
        .toString('hex')}`),
    };
    if (test) return;
    const firebaseConfig = (constants.NODE_ENV === 'prod') ? firebaseInfo.PROD_FIREBASE_CONFIG : firebaseInfo.STAGING_FIREBASE_CONFIG;
    this.app = firebase.initializeApp(firebaseConfig);
  }

  getPrivateKeyBuffer() {
    return this.keyInfo.privateKeyBuffer;
  }

  getPrivateKey() {
    return `0x${this.keyInfo.privateKeyBuffer.toString('hex')}`;
  }

  getPublicKeyBuffer() {
    return this.keyInfo.publicKeyBuffer;
  }

  getPublicKey() {
    return `0x${this.keyInfo.publicKeyBuffer.toString('hex')}`;
  }

  getTimestamp() {
    return firebase.database.ServerValue.TIMESTAMP;
  }

  getApp() {
    return this.app;
  }

  getAddress() {
    return this.keyInfo.address;
  }

  /**
   * Sign Transaction.
   * @param txBody
   */
  signTx(txBody: ainUtil.TransactionBody) {
    const sig = ainUtil.ecSignTransaction(txBody, this.keyInfo.privateKeyBuffer);
    const sigBuffer = ainUtil.toBuffer(sig);
    const lenHash = sigBuffer.length - 65;
    const hashedData = sigBuffer.slice(0, lenHash);
    const txHash = `0x${hashedData.toString('hex')}`;
    return {
      txHash,
      signedTx: {
        protoVer: firebaseInfo.CURRENT_PROTOCOL_VERSION,
        tx_body: txBody,
        signature: sig,
      },
    };
  }

  /**
   * Get Firebase Custom Token using AIN Key.
   */
  private async getAuthToken() {
    const timestamp = Date.now();
    const payload = this.signTx({
      operation: {
        type: firebaseInfo.OPERRATION_TYPE.getAuthToken,
        ref: '',
        value: {
          params: {
            address: this.keyInfo.address,
          },
        },
      },
      timestamp,
      nonce: -1,
    });
    const res = await this.app.functions()
      .httpsCallable(firebaseInfo.FUNCTIONS_NAMES.getAuthToken)(payload.signedTx);
    return res.data.customToken;
  }

  /**
   * signIn using Custom Token.
   */
  async signIn() {
    const token = await this.getAuthToken();
    await this.app.auth()
      .signInWithCustomToken(token);
  }

  /**
   * get payload about transfer.
   * @param payoutAmount - payout amount
   */
  private getPayloadForTransfer(poolAddr: string, payoutAmount: number) {
    const timestamp = Date.now();
    const transaction = {
      operation: {
        type: firebaseInfo.OPERRATION_TYPE.setValue,
        ref: firebaseInfo.getTransferValuePath(this.keyInfo.address, poolAddr, `${timestamp}`),
        value: payoutAmount,
      },
      timestamp,
      nonce: -1,
    };
    return this.signTx(transaction);
  }

  async getPoolAddr() {
    const snap = await this.app.database()
      .ref(firebaseInfo.getPoolAddrPath())
      .once('value');

    let poolAddr;
    for (const [addr, key] of Object.entries(snap.val())) {
      if (key === 'C_AIN_POOL') {
        poolAddr = addr;
      }
    }

    if (!poolAddr) {
      throw new Error('poolAddr Not Exist');
    }

    return poolAddr;
  }

  /**
   * Request to Payout.
   * @param payoutAmount - payout amount
   */
  async payout(payoutAmount: number) {
    const poolAddr = await this.getPoolAddr();
    const payloadForTransfer = this.getPayloadForTransfer(poolAddr, payoutAmount);
    const { timestamp } = payloadForTransfer.signedTx.tx_body;
    const transaction = {
      operation: {
        type: firebaseInfo.OPERRATION_TYPE.setValue,
        ref: `${firebaseInfo.COLLABORATIVE_AI_PREFIX}/${firebaseInfo.getAinPayoutPath(this.keyInfo.address, `${timestamp}`)}`,
        value: {
          eth_address: constants.ETH_ADDRESS,
          amount: payoutAmount,
          status: 'REQUESTED',
          payload: payloadForTransfer.signedTx,
        },
      },
      timestamp,
      nonce: -1,
    };
    await this.app.functions()
      .httpsCallable(firebaseInfo.FUNCTIONS_NAMES.sendSignedTransaction)(this.signTx(transaction)
        .signedTx);
  }

  /**
   * Register ethereum address.
   * @param ethAddress - ethereum address (ex. 0x123~~)
   */
  async registerEthAddr(ethAddress: string) {
    const transaction = {
      operation: {
        type: firebaseInfo.OPERRATION_TYPE.setValue,
        ref: `${firebaseInfo.COLLABORATIVE_AI_PREFIX}${firebaseInfo.getKycAinEthAddrPath(this.keyInfo.address)}`,
        value: ethAddress,
      },
      timestamp: Date.now(),
      nonce: -1,
    };

    await this.app.functions()
      .httpsCallable(firebaseInfo.FUNCTIONS_NAMES.sendSignedTransaction)(this.signTx(transaction)
        .signedTx);
  }

  /**
   * Get kyc_ain value.
   */
  async isAinAddressKycVerified(): Promise<boolean> {
    const res = await this.app.functions()
      .httpsCallable(firebaseInfo.FUNCTIONS_NAMES.isAinAddressKycVerified)({
        ainAddress: this.getAddress(),
      });
    return res.data.isVerified;
  }

  /**
   * Get AI Model Information.
   */
  async getModelInfo(): Promise<types.ModelInfo> {
    const snap = await this.app.database()
      .ref(firebaseInfo.getjobTypesPath())
      .once('value');
    return (snap.exists()) ? snap.val() : undefined;
  }

  /**
   * Get Job Type Information.
   */
  async getJobTypeInfo(jobType: string): Promise<types.JobTypeInfo> {
    const snap = await this.app.database()
      .ref(`${firebaseInfo.getjobTypesPath()}/${jobType}`)
      .once('value');
    return (snap.exists()) ? snap.val() : undefined;
  }

  /**
   * Get Current Balance.
   */
  async getCurrentBalance() {
    const snap = await this.app.database()
      .ref(firebaseInfo.getAccountsBalancePath(this.keyInfo.address))
      .once('value');
    return (snap.exists()) ? snap.val() : undefined;
  }

  /**
   * Set Worker Information.
   * @param workerInfo - {jobType: string}.
   */
  async setWorkerInfo(workerInfo: types.WorkerInfo) {
    const timestamp = Date.now();
    const transaction = JSON.parse(JSON.stringify({
      operation: {
        type: firebaseInfo.OPERRATION_TYPE.setValue,
        ref: firebaseInfo.getWorkerInfoPath(this.keyInfo.address),
        value: {
          updatedAt: timestamp,
          params: {
            address: this.getAddress(),
            eth_address: constants.ETH_ADDRESS,
            ...workerInfo,
          },
        },
      },
      timestamp,
      nonce: -1,
    }));
    await this.app.functions()
      .httpsCallable(firebaseInfo.FUNCTIONS_NAMES.setWorkerInfo)(
        this.signTx(transaction).signedTx,
      );
  }

  /**
   * send Result about inference.
   * @param requestId - request ID.
   * @param value - any
   */
  async sendInferenceResult(requestId: string, value: any) {
    const timestamp = Date.now();
    const transaction = {
      operation: {
        type: firebaseInfo.OPERRATION_TYPE.setValue,
        ref: firebaseInfo.getInferenceResultPath(this.keyInfo.address, requestId),
        value: {
          ...value,
          updatedAt: timestamp,
        },
      },
      timestamp,
      nonce: -1,
    };

    await this.app.functions()
      .httpsCallable(firebaseInfo.FUNCTIONS_NAMES.inferResponse)(this.signTx(transaction).signedTx);
  }

  /**
   * Listen For InferenceRequest.
   */
  listenForInferenceRequest(method: Function) {
    this.app.database()
      .ref(firebaseInfo.getInferencePath(this.keyInfo.address))
      .on('child_added', this.inferenceListenHandler(method));
  }

  /**
   * Handler for inference.
   */
  private inferenceListenHandler = (method: Function) => async (
    data: firebase.database.DataSnapshot) => {
    const requestId = data.key as string;
    const value = data.val();
    let result;

    if (value.data.requestedAt < constants.START_TIME) return;
    try {
      result = {
        statusCode: constants.statusCode.Success,
        result: await method(value),
      };
    } catch (e) {
      result = {
        statusCode: constants.statusCode.Failed,
        errMessage: e.message,
      };
    }
    try {
      await this.sendInferenceResult(requestId, {
        ...result,
        params: {
          ...value.params,
          address: this.getAddress(),
          requestId,
        },
      });
    } catch (error) {
      log.error('[-] Failed to send Inference Result');
    }
  }

  /**
   * Listen For Transaction(user).
   */
  listenTransaction(method: (params: types.UserTransactionParams) => void) {
    this.app.database()
      .ref(firebaseInfo.getUserTransactionsPath(this.keyInfo.address))
      .on('child_added', (snap) => {
        method(snap.val());
      });
  }

  /**
   * download file on Firebase storage.
   * @param storagePath Firebase storage path.
   * @param destPath local path.
   */
  async downloadFile(storagePath: string, destPath: string) {
    const url = await this.app.storage().ref(storagePath).getDownloadURL();
    const file = fs.createWriteStream(destPath);

    return new Promise((resolve, reject) => {
      const request = https.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error('Failed to request'));
        }
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });

        file.on('error', (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
      });
      request.on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    });
  }

  /**
   * Upload File to Firebase Storage.
   * @param storagePath Firebase Storage Path.
   * @param filePath File Path to Upload.
   */
  async uploadFile(storagePath: string, filePath: string) {
    const file = await readFile(filePath);

    return new Promise((resolve, reject) => {
      const uploadTask = this.app.storage().ref(storagePath).put(file);
      uploadTask.on('STATE_CHANGED', undefined,
        (err) => {
        // Error Handler
          reject(err);
        },
        () => {
          // Complate Handler
          resolve(true);
        });
    });
  }

  /**
   * Listen For trainingRequest
   * @param method
   */
  async listenForTrainingRequest(method: Function) {
    this.app.database()
      .ref(firebaseInfo.gettrainingPath(this.keyInfo.address))
      .on('child_added', this.trainingListenHandler(method));
  }

  /**
   * Handler for training.
   */
  private trainingListenHandler = (method: Function) => async (
    data: firebase.database.DataSnapshot) => {
    const trainId = data.key as string;
    const value = data.val();
    let result;
    log.debug(`[+] Request to train(id: ${trainId}) - params: ${JSON.stringify(value, null, 4)}`);

    try {
      const jobTypeInfo = await this.getJobTypeInfo(value.jobType);
      if (!jobTypeInfo || jobTypeInfo.type !== 'training') {
        throw new Error('Invalid Params');
      }
      result = await method(trainId, {
        ...value,
        datasetPath: firebaseInfo.getDatasetPath(value.uid, trainId, value.fileName),
        imagePath: jobTypeInfo.imagePath,
        uploadModelPath: firebaseInfo.getModelUploadPath(trainId,
          this.getAddress(), `${value.jobType}.mar`),
      });
    } catch (e) {
      result = {
        errMessage: e.message,
      };
    }
    try {
      await this.updateTrainingResult(trainId, value.uid, {
        ...result,
        params: {
          ...value.params,
          address: this.getAddress(),
          trainId,
        },
      });
    } catch (error) {
      log.error(`[-] Failed to send training Result - ${error.message}`);
    }
  }

  /**
   * Update Result about Training.
   * @param trainId Train Task Id.
   * @param value Update Data.
   */
  async updateTrainingResult(trainId: string, userAddress: string, value: any) {
    const transaction = {
      operation: {
        type: firebaseInfo.OPERRATION_TYPE.setValue,
        ref: firebaseInfo.getTrainingResultPath(trainId, userAddress, this.keyInfo.address),
        value,
      },
      timestamp: Date.now(),
      nonce: -1,
    };

    await this.app.functions()
      .httpsCallable(firebaseInfo.FUNCTIONS_NAMES.sendSignedTransaction)(this.signTx(transaction)
        .signedTx);
  }
}
