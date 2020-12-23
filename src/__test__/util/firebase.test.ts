import * as sinon from 'sinon';
import Firebase from '../../util/firebase';

const firebase = Firebase.getInstance();

describe('util/firebase', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('inferenceHandler: Unprocessed Request', async () => {
    (firebase as any).app = {
      database: (_: Object) => ({
        ref: () => ({
          once: () => ({
            exists: () => false,
          }),
        }),
      }),
    };

    (firebase as any).wallet = {
      getAddress: () => 'address',
    };
    const result = {};
    sinon.stub(firebase, 'response' as any)
      .callsFake(async (params: Object, dppath: string) => {
        result['params'] = params;
        result['dppath'] = dppath;
      });

    const input = {
      exists: () => true,
      key: 'requestId',
      val: () => ({
        output: ['test'],
        data: {
          requestedAt: 9999999999999,
        },
      }),
    };
    await (firebase as any).inferenceHandler(() => ({
      output: ['test'],
    }))(input as any);
    expect(result).toEqual({
      dppath: '/inference_result/requestId/address',
      params: {
        params: {
          address: 'address',
          requestId: 'requestId',
        },
        result: {
          output: ['test'],
        },
        statusCode: 0,
        updatedAt: result['params'].updatedAt,
      },
    });
  });

  it('setWorkerInfo', async () => {
    (firebase as any).app = {
      functions: (_: Object) => ({
        httpsCallable: () => async () => true,
      }),
    };
    const result = {};
    (firebase as any).wallet = {
      getAddress: () => 'address',
      signaturePayload: (params: Object, dbpath: string, type: string) => {
        result['params'] = params;
        result['dbpath'] = dbpath;
        result['type'] = type;
        return { signedTx: 'signedTx' };
      },
    };
    await firebase.setWorkerInfo({
      jobType: 'model',
    });
    expect(result).toEqual({
      dbpath: '/worker/info/address',
      params: {
        jobType: 'model',
        params: {
          address: 'address',
          jobType: 'model',
          eth_address: result['params'].params.eth_address,
        },
        updatedAt: result['params'].updatedAt,
      },
      type: 'SET_VALUE',
    });
  });
});
