import { mnemonicToSeedSync, generateMnemonic } from 'bip39';
import * as ainUtil from '@ainblockchain/ain-util';
import HDKey from 'hdkey';
import * as fs from 'fs';
import * as constants from '../common/constants';

export default class Wallet {
  private secretKey: string;

  private privateKey: Buffer;

  private address: string;

  private publicKey: Buffer;

  constructor(secretKey?: string, test?: boolean) {
    if (!secretKey) {
      const keys = HDKey.fromMasterSeed(mnemonicToSeedSync(generateMnemonic()))
        .derive("m/44'/412'/0'/0/0"); /* default wallet address for AIN */
      this.privateKey = keys.privateKey;
      this.publicKey = ainUtil.privateToPublic(this.privateKey);
      this.secretKey = `0x${keys.privateKey.toString('hex')}`;
      if (!test) {
        const newEnv = {
          ...constants.ENV,
          PRIVATE_KEY: this.secretKey,
        };
        fs.truncateSync(constants.ENV_PATH, 0);
        fs.appendFileSync(constants.ENV_PATH, JSON.stringify(newEnv, null, 2));
      }
    } else {
      this.secretKey = secretKey;
      this.privateKey = ainUtil.toBuffer(this.secretKey);
      this.publicKey = ainUtil.privateToPublic(this.privateKey);
    }

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
   * @param txBody
   */
  public signTx(txBody: ainUtil.TransactionBody) {
    const sig = ainUtil.ecSignTransaction(txBody, this.privateKey);
    const sigBuffer = ainUtil.toBuffer(sig);
    const lenHash = sigBuffer.length - 65;
    const hashedData = sigBuffer.slice(0, lenHash);
    const txHash = `0x${hashedData.toString('hex')}`;
    return {
      txHash,
      signedTx: {
        protoVer: constants.CURRENT_PROTOCOL_VERSION,
        tx_body: txBody,
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
