import Wallet from './wallet';
import Firebase from '../common/firebase';
import * as types from '../common/types';
import * as constants from '../common/constants';

export default class Worker {
  private wallet: Wallet;

  private firebase: Firebase;

  private workerName: string

  constructor(mnemonic: string, workerName: string, env: types.EnvType) {
    this.wallet = new Wallet(mnemonic);
    this.workerName = workerName;
    this.firebase = new Firebase(env);
  }

  public getAddress() {
    return this.wallet.getAddress();
  }

  public async response(value: any, dbpath: string) {
    const data = this.wallet.signaturePayload(value, dbpath);
    await this.firebase.getInstance().functions()
      .httpsCallable('inferResponse')(data.signedTx);
  }

  public listenRequest(method: Function) {
    this.firebase.getInstance().database()
      .ref(`/inference/${this.workerName}@${this.wallet.getAddress()}`)
      .on('child_added', async (data) => {
        if (!data.exists()) return;
        const requestId = data.key as string;
        const value = data.val();
        const dbpath = `/inference_result/${requestId}/${this.workerName}@${this.wallet.getAddress()}`;
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
            address: this.getAddress(),
            requestId,
            workerName: this.workerName,
          },
        }, dbpath);
      });
  }

  public async setWorkerInfo(workerInfo: types.WorkerInfo) {
    // const path = `/worker/info/${this.workerName}@${this.getAddress()}`;
    // eslint-disable-next-line no-console
    console.log(workerInfo);
    // TODO
  }
}
