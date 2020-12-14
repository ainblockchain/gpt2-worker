import { mnemonicToSeedSync, generateMnemonic } from 'bip39';
import * as ainUtil from '@ainblockchain/ain-util';
import HDKey from 'hdkey';
import * as fs from 'fs';
import Logger from '../common/logger';
import * as constants from '../common/constants';

const log = Logger.createLogger('manager.worker');

export default class Wallet {
  private wallet: any;

  private mnemonic: string;

  private secretKey: string;

  private address: string;

  private privateKey: string;

  constructor(mnemonic?: string) {
    if (!mnemonic) {
      this.mnemonic = generateMnemonic();
      log.info(`[+] Create mnemonic: ${this.mnemonic}`);
      const newEnv = {
        ...constants.ENV,
        MNEMONIC: this.mnemonic,
      };
      fs.writeFileSync('./env.json', JSON.stringify(newEnv));
    } else {
      this.mnemonic = mnemonic;
    }

    const key = HDKey.fromMasterSeed(mnemonicToSeedSync(this.mnemonic));
    this.wallet = key.derive("m/44'/412'/0'/0/0"); /* default wallet address for AIN */
    this.privateKey = this.wallet.privateKey;
    this.secretKey = `0x${this.wallet.privateKey.toString('hex')}`;
    this.address = ainUtil.toChecksumAddress(`0x${ainUtil.pubToAddress(this.wallet.publicKey, true).toString('hex')}`);
  }

  public getWallet() {
    return this.wallet;
  }

  public getMnemonic() {
    return this.mnemonic;
  }

  public getSecretKey() {
    return this.secretKey;
  }

  public getAddress() {
    return this.address;
  }

  /**
   * Sign Transaction.
   * @param tx
   */
  public signTx(tx: ainUtil.TransactionBody) {
    const keyBuffer = Buffer.from(this.privateKey, 'hex');
    const sig = ainUtil.ecSignTransaction(tx, keyBuffer);
    const sigBuffer = ainUtil.toBuffer(sig);
    const lenHash = sigBuffer.length - 65;
    const hashedData = sigBuffer.slice(0, lenHash);
    const txHash = `0x${hashedData.toString('hex')}`;
    return {
      txHash,
      signedTx: {
        protoVer: constants.CURRENT_PROTOCOL_VERSION,
        tx_body: tx,
        signature: sig,
      },
    };
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

  public buildAinPayoutTxBody(timestamp: number, payoutAmount: number) {
    const payloadTx = this.signTx(
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

  public buildEthAddrRegisterTxBody(timestamp: number, ethAddress: string) {
    return {
      operation: {
        type: 'SET_VALUE',
        ref: `/kyc_ain/${this.address}/eth_address`,
        value: ethAddress,
      },
      timestamp,
      nonce: -1,
    };
  }

  /**
   * Get Signature Payload.
   * @param value
   * @param ref
   * @param type
   */
  public signaturePayload(value: any, ref: string, type: string) {
    const transaction = {
      operation: {
        type,
        ref,
        value,
      },
      timestamp: Date.now(),
      nonce: -1,
    };
    const result = this.signTx(transaction);
    return result;
  }
}
