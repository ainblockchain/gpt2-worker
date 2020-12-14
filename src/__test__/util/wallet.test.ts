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
    const result = wallet.buildAinPayoutTxBody(1607950998346, 3000);
    expect(result).toEqual({
      nonce: -1,
      operation: {
        ref: '/ain_payout/0xA0DE48734f4759df97327a98da7a48241173CA78/1607950998346',
        type: 'SET_VALUE',
        value: {
          amount: 3000,
          ethAddress: result.operation.value.ethAddress,
          payload: {
            protoVer: constants.CURRENT_PROTOCOL_VERSION,
            signature: '0x5ec02f0e14e17337208d52e2524b0af8fa5700cade3375cbd74addcb08d089a1ee96c6b8858ba116132a8afabd7aeb37debd8f25d7ea40295aa87931beaf2fdd76ebb3c1a39d1c03ec2eebce969e44c96e7fd5b67e7d6cdaf809eb87a6b0089d1b',
            tx_body: {
              nonce: -1,
              operation: {
                ref: '/transfer/0xA0DE48734f4759df97327a98da7a48241173CA78/0x945bDFa911cf895Bca3F4b5B5816BcfDb5A1480b/1607950998346/value',
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
