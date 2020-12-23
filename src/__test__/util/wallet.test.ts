import Wallet from '../../util/wallet';
import * as constants from '../../common/constants';

const privateKey = '0x5c0007bc424332798b2c077e54bb6fe334749781c88f6f9abba3e9724b13e471';
const address = '0x9d035EFC3F50B259B970EF737167243B08f9f7c0';
const wallet = new Wallet(privateKey, true);

describe('util/wallet', () => {
  it('getAddress', () => {
    const result = wallet.getAddress();
    expect(result).toEqual(address);
  });

  it('getPrivateKey', () => {
    const result = wallet.getPrivateKey();
    expect(result.toString('hex')).toEqual(
      '5c0007bc424332798b2c077e54bb6fe334749781c88f6f9abba3e9724b13e471',
    );
  });

  it('getPublicKey', () => {
    const result = wallet.getPublicKey();
    expect(result.toString('hex')).toEqual(
      '1f8ccb98fb87d26b5f42b1fbf5ac33ec246afb5a5b8dfba1602cb4930855bc8abf0f371f8ae02bd3a5f9a0284e2ae176903f387a0e0b289373b46176224894be',
    );
  });

  it('buildTransferTxBody', () => {
    const result = wallet.buildAinPayoutTxBody(1607950998346, 3000);
    expect(result).toEqual({
      nonce: -1,
      operation: {
        ref: `/apps/collaborative_ai/ain_payout/${address}/1607950998346`,
        type: 'SET_VALUE',
        value: {
          amount: 3000,
          ethAddress: result.operation.value.ethAddress,
          payload: {
            protoVer: constants.CURRENT_PROTOCOL_VERSION,
            signature: '0x2cfeeb0bd561f1dbdef67d3256f56f1a1fe806f5d4db4c4b3cd64f803eb6791de45c1e581652f2a6d7de05e19c89602f28b1191001d933caf5b66a35a3833bb444f628a866f1278db32dec29c163f3b63903e9ae1defd288520de59afd85942b1c',
            tx_body: {
              nonce: -1,
              operation: {
                ref: `/transfer/${address}/0x945bDFa911cf895Bca3F4b5B5816BcfDb5A1480b/1607950998346/value`,
                type: 'SET_VALUE',
                value: 3000,
              },
              timestamp: 1607950998346,
            },
          },
          status: 'REQUESTED',
        },
      },
      timestamp: 1607950998346,
    });
  });

  it('signaturePayload', () => {
    const result = wallet.signaturePayload(
      '1', 'worker/', 'SET_VALUE',
    );
    expect(result).toEqual({
      signedTx: {
        protoVer: constants.CURRENT_PROTOCOL_VERSION,
        signature: result.signedTx.signature,
        tx_body: {
          nonce: -1,
          operation: {
            ref: 'worker/',
            type: 'SET_VALUE',
            value: '1',
          },
          timestamp: result.signedTx.tx_body.timestamp,
        },
      },
      txHash: result.txHash,
    });
  });
});
