import Wallet from './wallet';
import Firebase from '../common/firebase';
import * as types from '../common/types';
import * as constants from '../common/constants';

export default class FirebaseUtil {
  static instance: FirebaseUtil;

  private workerName: string;

  constructor(private wallet: Wallet, private firebase: Firebase) {
    this.workerName = constants.WORKER_NAME!;
  }

  /**
   * Get Custom Firebase Token And Login.
   */
  static async getInstance() {
    if (!FirebaseUtil.instance) {
      const wallet = new Wallet(constants.MNEMONIC!);
      const firebase = new Firebase(constants.NODE_ENV as types.EnvType);
      const data = wallet.signaturePayload({
        params: {
          address: wallet.getAddress(),
        },
      }, '', 'GET_AUTH_TOKEN');
      const res = await firebase.getInstance().functions()
        .httpsCallable('getAuthToken')(data.signedTx);
      await firebase.getInstance().auth().signInWithCustomToken(res.data.customToken);
      FirebaseUtil.instance = new FirebaseUtil(wallet, firebase);
    }

    return FirebaseUtil.instance;
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
    await this.firebase.getInstance().functions()
      .httpsCallable('inferResponse')(data.signedTx);
  }

  /**
   * Request Method About Job.
   * @param method ML Job.
   */
  public listenRequest(method: Function) {
    this.firebase.getInstance().database()
      .ref(`/inference/${this.workerName}@${this.wallet.getAddress()}`)
      .on('child_added', async (data) => {
        if (!data.exists()) return;
        const requestId = data.key as string;
        const value = data.val();
        const dbpath = `/inference_result/${requestId}`;
        const snap = await this.firebase.getInstance().database()
          .ref(dbpath).once('value');
        if (snap.exists()) { // already has response
          return;
        }
        let result;
        try {
          result = {
            statusCode: constants.statusCode.Success,
            result: await method(value),
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
            workerName: this.workerName,
          },
        }, dbpath);
      });
  }

  /**
   * Set Worker Information to Firebase DB.
   * @param workerInfo Worker Info.
   */
  public async setWorkerInfo(workerInfo: types.WorkerInfo) {
    const dbpath = `/worker/info/${this.workerName}@${this.getAddress()}`;
    const data = this.wallet.signaturePayload({
      ...workerInfo,
      updatedAt: Date.now(),
      params: {
        address: this.getAddress(),
        workerName: this.workerName,
        jobType: constants.MODEL_NAME,
      },
    }, dbpath, 'SET_VALUE');
    await this.firebase.getInstance().functions()
      .httpsCallable('setWorkerInfo')(data.signedTx); // temp Functions Name.
  }

  /**
   * Get Current Balance.
   */
  public async getCurrentBalance() {
    const dbpath = `/accounts/${this.getAddress()}/balance`;
    const snap = await this.firebase.getInstance().database().ref(dbpath)
      .once('value');
    return (snap.val()) ? snap.val() : 0;
  }

  private buildTransferTxBody(timestamp: number, payoutAmount: number) {
    const requestId = String(timestamp);
    return {
      operation: {
        type: 'SET_VALUE',
        ref: `/transfer/${this.getAddress()}/${constants.payoutPoolAddr}/${requestId}/value`,
        value: payoutAmount,
      },
      timestamp,
      nonce: -1,
    };
  }

  private buildAinPayoutTxBody(timestamp: number, payoutAmount: number) {
    const payloadTx = this.wallet.signTx(
      this.buildTransferTxBody(timestamp, payoutAmount),
    );
    const requestId = String(timestamp);

    return {
      operation: {
        type: 'SET_VALUE',
        ref: `/ain_payout/${this.getAddress()}/${requestId}`,
        value: {
          ethAddress: constants.ETH_ADDRESS,
          amount: payoutAmount,
          status: 'REQUESTED',
          payload: payloadTx.signedTx,
        },
      },
      timestamp,
      nonce: -1,
    };
  }

  /**
   * Request To Payout
   */
  public async requestToPayout() {
    const timestamp = Date.now();
    const txBody = this.buildAinPayoutTxBody(timestamp, constants.THRESHOLD_AMOUNT);
    const { signedTx } = this.wallet.signTx(txBody);
    await this.firebase.getInstance().functions().httpsCallable('sendSignedTransaction')(signedTx);
  }
}
