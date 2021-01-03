import * as sinon from 'sinon';
import Worker from '../../handler/worker';

describe('handler/worker', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('requestToPayout', async () => {
    const worker = new Worker(true);
    let result = false;
    (worker as any).ainConnect = {
      getCurrentBalance: async () => 10000,
      isAinAddressKycVerified: async () => true,
      payout: () => {
        result = true;
      },
    };
    await worker.requestToPayout();
    expect(true).toEqual(result);
  });

  it('requestToPayout [balance < THRESHOLD_AMOUNT]', async () => {
    const worker = new Worker(true);
    let result = false;
    (worker as any).ainConnect = {
      getCurrentBalance: async () => 10,
      isAinAddressKycVerified: async () => true,
      payout: () => {
        result = true;
      },
    };
    await worker.requestToPayout();
    expect(false).toEqual(result);
  });
});
