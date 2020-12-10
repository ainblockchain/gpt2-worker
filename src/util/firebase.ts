import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/database';
import 'firebase/functions';
import Wallet from './wallet';
import * as types from '../common/types';
import * as constants from '../common/constants';
import Logger from '../common/logger';

const log = Logger.createLogger('manager/docker');

export default class Firebase {
  static instance: Firebase;

  private app: firebase.app.App;

  private wallet: Wallet

  /**
   * Method For Singleton Pattern.
   */
  static getInstance() {
    if (!Firebase.instance) {
      Firebase.instance = new Firebase();
    }

    return Firebase.instance;
  }

  async start() {
    this.wallet = new Wallet(constants.MNEMONIC!);
    const data = this.wallet.signaturePayload({
      params: {
        address: this.wallet.getAddress(),
      },
    }, '', 'GET_AUTH_TOKEN');
    const firebaseConfig = (constants.NODE_ENV === 'prod') ? constants.PROD_FIREBASE_CONFIG : constants.STAGING_FIREBASE_CONFIG;
    this.app = await firebase.initializeApp(firebaseConfig);
    const res = await this.app.functions()
      .httpsCallable('getAuthToken')(data.signedTx);
    await this.app.auth().signInWithCustomToken(res.data.customToken);
  }

  public getAddress() {
    return this.wallet.getAddress();
  }

  /**
   * Call Firebase Functions for sending Job output.
   * @param value Job output.
   * @param dbpath Firebase DB Path.
   */
  public async response(value: any, dbpath: string) {
    const data = this.wallet.signaturePayload(value, dbpath, 'SET_VALUE');
    const res = await this.app.functions()
      .httpsCallable('inferResponse')(data.signedTx);
    if (res.data !== true) {
      log.debug(res.data);
    }
  }

  /**
   * Request Method About Job.
   * @param method ML Job.
   */
  public listenRequest(method: Function) {
    this.app.database()
      .ref(`/inference/${this.wallet.getAddress()}`)
      .on('child_added', this.inferenceHandler(method));
  }

  private inferenceHandler = (method: Function) => async (data: firebase.database.DataSnapshot) => {
    if (!data.exists()) return;
    const requestId = data.key as string;
    const value = data.val();
    const rootDbpath = `/inference_result/${requestId}`;
    const snap = await this.app.database()
      .ref(rootDbpath).once('value');
    if (snap.exists()) { // already has response
      return;
    }
    const dbpath = `/inference_result/${requestId}/${this.wallet.getAddress()}`;
    let result;
    try {
      result = {
        statusCode: constants.statusCode.Success,
        result: await method(requestId, value),
      };
    } catch (e) {
      result = {
        statusCode: constants.statusCode.Failed,
        errMessage: String(e),
      };
    }
    await this.response({
      ...result,
      updatedAt: Date.now(),
      params: {
        ...value.params,
        address: this.getAddress(),
        requestId,
      },
    }, dbpath);
  }

  /**
   * Set Worker Information to Firebase DB.
   * @param workerInfo Worker Info.
   */
  public async setWorkerInfo(workerInfo: types.WorkerInfo) {
    const dbpath = `/worker/info/${this.getAddress()}`;
    const data = this.wallet.signaturePayload({
      ...workerInfo,
      updatedAt: Date.now(),
      params: {
        address: this.getAddress(),
        jobType: workerInfo.jobType,
      },
    }, dbpath, 'SET_VALUE');
    await this.app.functions()
      .httpsCallable('setWorkerInfo')(data.signedTx); // temp Functions Name.
  }

  /**
   * Get Current Balance.
   */
  public async getCurrentBalance() {
    const dbpath = `/accounts/${this.getAddress()}/balance`;
    const snap = await this.app.database().ref(dbpath)
      .once('value');
    return (snap.val()) ? snap.val() : 0;
  }

  /**
   * Request To Payout
   */
  public async requestToPayout() {
    const timestamp = Date.now();
    const txBody = this.wallet.buildAinPayoutTxBody(timestamp, constants.THRESHOLD_AMOUNT);
    const { signedTx } = this.wallet.signTx(txBody);
    await this.app.functions().httpsCallable('sendSignedTransaction')(signedTx);
  }

  public getTimestamp() {
    return firebase.database.ServerValue.TIMESTAMP;
  }

  public getApp() {
    return this.app;
  }
}
