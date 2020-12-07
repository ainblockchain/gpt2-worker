import Wallet from '../../util/wallet';

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
            protoVer: 'CURRENT_PROTOCOL_VERSION',
            signature: '0x5d055f03889d55475471e34fbf6f2de11226059bcc8b695d89691dc98f2599cf94a27dd90d26e6c6279a07ac46e824b6e92def2a840e199b7074cc3f3c8682031b037500f3a5ff260cd1ef5419ad5f8491cccb7cbf1d42e1e6990ff5debe763c1c',
            transaction: {
              nonce: -1,
              operation: {
                ref: '/transfer/0x28653A33E5E6e983F426B9321f51939B367Dd40d/0x07B0bd9b3583Ec5864807cfD768733A250301a07/33/value',
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
        protoVer: 'CURRENT_PROTOCOL_VERSION',
        signature: result.signedTx.signature,
        transaction: {
          nonce: -1,
          operation: {
            ref: 'worker/',
            type: 'SET_VALUE',
            value: '1',
          },
          timestamp: result.signedTx.transaction.timestamp,
        },
      },
      txHash: result.txHash,
    });
  });
});
