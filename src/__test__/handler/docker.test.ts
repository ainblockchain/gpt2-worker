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
      getKycAin: async () => ({
        eth_address: 'eth_address',
        telegram_id: 'telegram_id',
      }),
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
      getKycAin: async () => ({
        eth_address: 'eth_address',
        telegram_id: 'telegram_id',
      }),
      payout: () => {
        result = true;
      },
    };
    await worker.requestToPayout();
    expect(false).toEqual(result);
  });
});
