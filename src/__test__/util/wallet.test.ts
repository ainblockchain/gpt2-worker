import Wallet from '../../util/wallet';
import * as constants from '../../common/constants';

const keystore = {
  version: 3 as 3,
  id: '54129241-38a5-4d9b-bf91-b89ffe835557',
  address: 'a0de48734f4759df97327a98da7a48241173ca78',
  crypto: {
    ciphertext: '590962730e560ce6cfd1c7158143e2db8149f70325bb0aeda4430710561c8665',
    cipherparams: { iv: 'cf91fcca6a269c9dd735612b02fcbdd8' },
    cipher: 'aes-128-ctr',
    kdf: 'scrypt',
    kdfparams: {
      dklen: 32,
      salt: '69a9d1a5f759433d7b961c9641248bbc4c0ac55b5a5e8fc9ee8a448874da2de0',
      n: 262144,
      r: 8,
      p: 1,
    },
    mac: 'dfcd2e0dd93fa9ce8c60e581358af3b88741026ac6b9a7a1d4785eeee636ef3c',
  },
};
const password = 'comcom';
const wallet = new Wallet(keystore, password);

describe('util/wallet', () => {
  it('getAddress', () => {
    const result = wallet.getAddress();
    expect(result).toEqual('0xA0DE48734f4759df97327a98da7a48241173CA78');
  });

  it('getPrivateKey', () => {
    const result = wallet.getPrivateKey();
    expect(result.toString('hex')).toEqual(
      '1b85b823974ad8d1c1a2039b6617a196353fb05e987c8a8a64466a215ddc51dd',
    );
  });

  it('getPublicKey', () => {
    const result = wallet.getPublicKey();
    expect(result.toString('hex')).toEqual(
      '77e50647fb8692c2257f58e40bf070a71884ee4d76e6b52431adbd1001fc7e00fa1e4fa7e069005816f65f36943756637e948661e4503b82fb72c0a6e8327406',
    );
  });

  it('buildTransferTxBody', () => {
    const result = wallet.buildAinPayoutTxBody(33, 3000);
    expect(result).toEqual({
      nonce: -1,
      operation: {
        ref: '/ain_payout/0xA0DE48734f4759df97327a98da7a48241173CA78/33',
        type: 'SET_VALUE',
        value: {
          amount: 3000,
          ethAddress: result.operation.value.ethAddress,
          payload: {
            protoVer: constants.CURRENT_PROTOCOL_VERSION,
            signature: '0x958277b887469d302b1ebf84ca79613dd34af4dad33c451ab3022b04cd799ce029b854902214265783cb71651fbe0934dcff617b1194d6b141d3ecbada8e05365da81a74e2af38f36316d99e5bf1267e5a5273d58d795a2c52f157dbc36465581c',
            tx_body: {
              nonce: -1,
              operation: {
                ref: '/transfer/0xA0DE48734f4759df97327a98da7a48241173CA78/0x945bDFa911cf895Bca3F4b5B5816BcfDb5A1480b/33/value',
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
