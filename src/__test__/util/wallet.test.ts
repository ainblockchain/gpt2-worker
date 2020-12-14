import Wallet from '../../util/wallet';
import * as constants from '../../common/constants';

const mnemonic = 'onion spot come parent agree zoo quote harbor swift awake smart thank';
const address = '0x28653A33E5E6e983F426B9321f51939B367Dd40d';
const getSecretKey = '0x50623bc1a119ce804294f2faf704713193311ed6889ff368c96cc9fc3096327d';
const wallet = new Wallet(mnemonic);

describe('util/wallet', () => {
  it('getAddress', () => {
    const result = wallet.getAddress();
    expect(result).toEqual(address);
  });

  it('getMnemonic', () => {
    const result = wallet.getMnemonic();
    expect(result).toEqual(mnemonic);
  });

  it('getSecretKey', () => {
    const result = wallet.getSecretKey();
    expect(result).toEqual(getSecretKey);
  });

  it('buildTransferTxBody', () => {
    const result = wallet.buildAinPayoutTxBody(33, 3000);
    expect(result).toEqual({
      nonce: -1,
      operation: {
        ref: '/ain_payout/0x28653A33E5E6e983F426B9321f51939B367Dd40d/33',
        type: 'SET_VALUE',
        value: {
          amount: 3000,
          ethAddress: undefined,
          payload: {
            protoVer: constants.CURRENT_PROTOCOL_VERSION,
            signature: '0x7e2024efb7d791f969c5a765171acb778e0f17b70637aee4529a2b17a2b9a6304eaad79b08ba0fd4dedd433bedb52a5168fb7e16922c13a5b3bb77cac230f1aa7a8b9dace953f7e67c16545f99931e71de02ad362b1face069079f31551cdf1f1b',
            tx_body: {
              nonce: -1,
              operation: {
                ref: '/transfer/0x28653A33E5E6e983F426B9321f51939B367Dd40d/0x945bDFa911cf895Bca3F4b5B5816BcfDb5A1480b/33/value',
                type: 'SET_VALUE',
                value: 3000,
              },
              timestamp: 33,
            },
          },
          status: 'REQUESTED',
        },
      },
      timestamp: 33,
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
