import * as sinon from 'sinon';
import * as ainUtil from '@ainblockchain/ain-util';
import AinConnect from '../../interface/ainConnect';
import * as firebaseInfo from '../../interface/firebaseInfo';

const PRIVATE_KEY = '0xd560a2e62284cf6a22b55ca16c7ff9205ac4e3419df3fe54625134e3d1829904';

describe('interface/ainConnect', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('Check KeyInfo [with private key]', () => {
    const ainConnect = new AinConnect(PRIVATE_KEY, true);

    const privateKeyBuffer = ainConnect.getPrivateKeyBuffer();
    const privateKey = ainConnect.getPrivateKey();
    const publicKeyBuffer = ainConnect.getPublicKeyBuffer();
    const publicKey = ainConnect.getPublicKey();
    const address = ainConnect.getAddress();

    const answerPrivateKey = '0xd560a2e62284cf6a22b55ca16c7ff9205ac4e3419df3fe54625134e3d1829904';
    const answerAddress = '0x8bdd9aa9fFcFDc4b09D41649C7Ac802E21b544Cb';
    const answerPublicKey = '0x63e335220784b9ab84ce6a2133578735d8d9eb91dbea838a59ec99e7b45cfeb11a621292708f0e9947564b92ed215c8378ba4d74658e4e56aa9ef0dc3c3dc2c9';

    expect(answerPrivateKey).toEqual(ainUtil.bufferToHex(privateKeyBuffer));
    expect(answerPrivateKey).toEqual(privateKey);
    expect(answerPublicKey).toEqual(ainUtil.bufferToHex(publicKeyBuffer));
    expect(answerPublicKey).toEqual(publicKey);
    expect(answerAddress).toEqual(address);
  });

  it('Check KeyInfo [without private key]', () => {
    const ainConnect = new AinConnect(undefined, true);

    const privateKeyBuffer = ainConnect.getPrivateKeyBuffer();
    const publicKeyBuffer = ainConnect.getPublicKeyBuffer();
    const address = ainConnect.getAddress();
    expect(true).toEqual(ainUtil.isValidPrivate(privateKeyBuffer));
    expect(true).toEqual(ainUtil.isValidPublic(publicKeyBuffer));
    expect(true).toEqual(ainUtil.isValidAddress(address));
    expect(address).toEqual(ainUtil.privateToAddress(privateKeyBuffer));
    expect(publicKeyBuffer).toEqual(ainUtil.privateToPublic(privateKeyBuffer));
  });

  it('getAuthToken', () => {
    const ainConnect = new AinConnect(PRIVATE_KEY, true);
    let resultParams = {};
    let resultFunctionsName = '';
    (ainConnect as any).app = {
      functions: () => ({
        httpsCallable: (functionsName: string) => async (params: any) => {
          resultFunctionsName = functionsName;
          resultParams = params;
          return {
            data: {
              customToken: '',
            },
          };
        },
      }),
    };
    (ainConnect as any).getAuthToken();
    expect(firebaseInfo.FUNCTIONS_NAMES.getAuthToken).toEqual(resultFunctionsName);
    expect(firebaseInfo.CURRENT_PROTOCOL_VERSION).toEqual(resultParams['protoVer']);
    expect({
      ref: '',
      type: 'GET_AUTH_TOKEN',
      value: {
        params: {
          address: '0x8bdd9aa9fFcFDc4b09D41649C7Ac802E21b544Cb',
        },
      },
    }).toEqual(resultParams['tx_body']['operation']);
  });

  it('payout', async () => {
    const ainConnect = new AinConnect(PRIVATE_KEY, true);
    let resultParams = {};
    let resultFunctionsName = '';
    const amount = 3000;
    (ainConnect as any).app = {
      functions: () => ({
        httpsCallable: (functionsName: string) => async (params: any) => {
          resultFunctionsName = functionsName;
          resultParams = params;
        },
      }),
    };
    (ainConnect as any).getPoolAddr = async () => '0x744Cb74A78Ac6dae46ebdaCa43e38ED60F965B8';
    await (ainConnect as any).payout(amount);
    const { timestamp } = resultParams['tx_body'];
    // eslint-disable-next-line camelcase
    const { eth_address } = resultParams['tx_body']['operation']['value'];
    const transferSignature = resultParams['tx_body']['operation']['value']['payload']['signature'];
    expect(firebaseInfo.FUNCTIONS_NAMES.sendSignedTransaction).toEqual(resultFunctionsName);
    expect({
      protoVer: firebaseInfo.CURRENT_PROTOCOL_VERSION,
      signature: resultParams['signature'],
      tx_body: {
        nonce: -1,
        operation: {
          ref: `/apps/collaborative_ai/ain_payout/0x8bdd9aa9fFcFDc4b09D41649C7Ac802E21b544Cb/${timestamp}`,
          type: firebaseInfo.OPERRATION_TYPE.setValue,
          value: {
            amount,
            eth_address,
            payload: {
              protoVer: firebaseInfo.CURRENT_PROTOCOL_VERSION,
              signature: transferSignature,
              tx_body: {
                nonce: -1,
                operation: {
                  ref: `/transfer/0x8bdd9aa9fFcFDc4b09D41649C7Ac802E21b544Cb/0x744Cb74A78Ac6dae46ebdaCa43e38ED60F965B8/${timestamp}/value`,
                  type: firebaseInfo.OPERRATION_TYPE.setValue,
                  value: amount,
                },
                timestamp,
              },
            },
            status: 'REQUESTED',
          },
        },
        timestamp,
      },
    }).toEqual(resultParams);
  });

  it('registerEthAddr', () => {
    const ainConnect = new AinConnect(PRIVATE_KEY, true);
    // eslint-disable-next-line camelcase
    const eth_address = '0x123123123';
    let resultParams = {};
    let resultFunctionsName = '';
    (ainConnect as any).app = {
      functions: () => ({
        httpsCallable: (functionsName: string) => async (params: any) => {
          resultFunctionsName = functionsName;
          resultParams = params;
        },
      }),
    };
    (ainConnect as any).registerEthAddr(eth_address);
    expect(firebaseInfo.FUNCTIONS_NAMES.sendSignedTransaction).toEqual(resultFunctionsName);
    expect({
      protoVer: firebaseInfo.CURRENT_PROTOCOL_VERSION,
      signature: resultParams['signature'],
      tx_body: {
        nonce: -1,
        operation: {
          ref: '/apps/collaborative_ai/kyc_ain/0x8bdd9aa9fFcFDc4b09D41649C7Ac802E21b544Cb/eth_address',
          type: firebaseInfo.OPERRATION_TYPE.setValue,
          value: eth_address,
        },
        timestamp: resultParams['tx_body']['timestamp'],
      },
    }).toEqual(resultParams);
  });

  it('setWorkerInfo', () => {
    const ainConnect = new AinConnect(PRIVATE_KEY, true);
    const workerInfo = {
      jobType: 'gpt-2-large-torch-serving',
    };
    let resultParams = {};
    let resultFunctionsName = '';
    (ainConnect as any).app = {
      functions: () => ({
        httpsCallable: (functionsName: string) => async (params: any) => {
          resultFunctionsName = functionsName;
          resultParams = params;
        },
      }),
    };
    (ainConnect as any).setWorkerInfo(workerInfo);
    expect(firebaseInfo.FUNCTIONS_NAMES.setWorkerInfo).toEqual(resultFunctionsName);
    expect(workerInfo.jobType).toEqual(resultParams['tx_body']['operation']['value']['params']['jobType']);
  });

  it('sendInferenceResult', () => {
    const ainConnect = new AinConnect(PRIVATE_KEY, true);
    const resultRequestId = 'testRequestId';
    const resultValue = {
      outputVector: [111],
    };
    let resultParams = {};
    let resultFunctionsName = '';
    (ainConnect as any).app = {
      functions: () => ({
        httpsCallable: (functionsName: string) => async (params: any) => {
          resultFunctionsName = functionsName;
          resultParams = params;
        },
      }),
    };
    (ainConnect as any).sendInferenceResult(resultRequestId, resultValue);
    expect(firebaseInfo.FUNCTIONS_NAMES.inferResponse).toEqual(resultFunctionsName);
    expect({
      nonce: -1,
      operation: {
        ref: '/inference_result/testRequestId/0x8bdd9aa9fFcFDc4b09D41649C7Ac802E21b544Cb',
        type: firebaseInfo.OPERRATION_TYPE.setValue,
        value: {
          outputVector: resultValue.outputVector,
          updatedAt: resultParams['tx_body']['operation']['value']['updatedAt'],
        },
      },
      timestamp: resultParams['tx_body']['timestamp'],
    }).toEqual(resultParams['tx_body']);
  });

  it('inferenceListenHandler', async () => {
    const ainConnect = new AinConnect(PRIVATE_KEY, true);
    const requestId = 'requestId';
    const data = {
      key: requestId,
      val: () => ({
        data: {
          requestedAt: 99999999999999,
        },
      }),
    };

    const method = async () => 'success';
    let result;
    (ainConnect as any).sendInferenceResult = async (_: string, value: any) => {
      result = value;
    };
    await (ainConnect as any).inferenceListenHandler(method)(data);

    expect({
      params: {
        address: '0x8bdd9aa9fFcFDc4b09D41649C7Ac802E21b544Cb',
        requestId,
      },
      result: 'success',
      statusCode: 0,
    }).toEqual(result);
  });

  it('inferenceListenHandler [value.data.requestedAt < constants.START_TIME]', async () => {
    const ainConnect = new AinConnect(PRIVATE_KEY, true);
    const requestId = 'requestId';
    const data = {
      key: requestId,
      val: () => ({
        data: {
          requestedAt: 10000000,
        },
      }),
    };

    const method = async () => 'success';
    let result;
    (ainConnect as any).sendInferenceResult = async (_: string, value: any) => {
      result = value;
    };
    await (ainConnect as any).inferenceListenHandler(method)(data);

    expect(undefined).toEqual(result);
  });

  it('inferenceListenHandler [method error]', async () => {
    const ainConnect = new AinConnect(PRIVATE_KEY, true);
    const requestId = 'requestId';
    const data = {
      key: requestId,
      val: () => ({
        data: {
          requestedAt: 99999999999999,
        },
      }),
    };

    const method = async () => {
      throw new Error('error');
    };
    let result;
    (ainConnect as any).sendInferenceResult = async (_: string, value: any) => {
      result = value;
    };
    await (ainConnect as any).inferenceListenHandler(method)(data);

    expect({
      errMessage: 'error',
      params: {
        address: '0x8bdd9aa9fFcFDc4b09D41649C7Ac802E21b544Cb',
        requestId,
      },
      statusCode: 1,
    }).toEqual(result);
  });

  it('trainingListenHandler', async () => {
    const ainConnect = new AinConnect(PRIVATE_KEY, true);
    const trainId = 'trainId';
    const data = {
      key: trainId,
      val: () => ({
        requestedAt: 99999999999999,
        uid: 'uid',
        jobType: 'jobType',
        fileName: 'fileName',
      }),
    };

    const method = async () => ({
      status: 'success',
    });
    let result;
    (ainConnect as any).getJobTypeInfo = async (_: string, value: any) => ({
      type: 'training',
    });
    (ainConnect as any).updateTrainingResult = async (_: string,
      userAddress: string, value: any) => {
      result = value;
    };
    await (ainConnect as any).trainingListenHandler(method)(data);

    expect({
      params: {
        address: '0x8bdd9aa9fFcFDc4b09D41649C7Ac802E21b544Cb',
        trainId,
      },
      status: 'success',
    }).toEqual(result);
  });

  it('trainingListenHandler [Error: Invalid Params]', async () => {
    const ainConnect = new AinConnect(PRIVATE_KEY, true);
    const trainId = 'trainId';
    const data = {
      key: trainId,
      val: () => ({
        requestedAt: 99999999999999,
        uid: 'uid',
        jobType: 'jobType',
        fileName: 'fileName',
      }),
    };

    const method = async () => ({
      status: 'success',
    });
    let result;
    (ainConnect as any).getJobTypeInfo = async (_: string, value: any) => ({
      type: 'inference',
    });
    (ainConnect as any).updateTrainingResult = async (_: string,
      userAddress: string, value: any) => {
      result = value;
    };
    await (ainConnect as any).trainingListenHandler(method)(data);

    expect({
      params: {
        address: '0x8bdd9aa9fFcFDc4b09D41649C7Ac802E21b544Cb',
        trainId,
      },
      errMessage: 'Invalid Params',
      status: 'failed',
    }).toEqual(result);
  });
});
