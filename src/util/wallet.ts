import { mnemonicToSeedSync, generateMnemonic } from 'bip39';
import * as ainUtil from '@ainblockchain/ain-util';
import HDKey from 'hdkey';
import * as fs from 'fs';
import * as constants from '../common/constants';

export default class Wallet {
  private secretKey: string;

  private address: string;

  private privateKey: Buffer;

  private publicKey: Buffer;

  constructor(keystore?: ainUtil.V3Keystore, testPassword?: string) {
    if (!keystore) {
      const keys = HDKey.fromMasterSeed(mnemonicToSeedSync(generateMnemonic()))
        .derive("m/44'/412'/0'/0/0"); /* default wallet address for AIN */
      this.privateKey = keys.privateKey;
      this.publicKey = keys.publicKey;
      if (!testPassword) {
        const newEnv = {
          ...constants.ENV,
          KET_STORE: ainUtil.privateToV3Keystore(this.privateKey, constants.PASSWORD),
        };
        fs.truncateSync('./env.json', 0);
        fs.appendFileSync('./env.json', JSON.stringify(newEnv, null, 2));
      }
    } else {
      this.privateKey = ainUtil.v3KeystoreToPrivate(keystore, constants.PASSWORD || testPassword);
      this.publicKey = ainUtil.privateToPublic(this.privateKey);
    }

    this.secretKey = `0x${this.privateKey.toString('hex')}`;
    this.address = ainUtil.toChecksumAddress(`0x${ainUtil.pubToAddress(this.publicKey, true).toString('hex')}`);
  }

  public getPrivateKey() {
    return this.privateKey;
  }

  public getPublicKey() {
    return this.publicKey;
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
    const sig = ainUtil.ecSignTransaction(tx, this.privateKey);
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
