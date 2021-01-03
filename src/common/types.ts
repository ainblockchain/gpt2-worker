export type EnvType = 'prod' | 'staging';

export type WorkerInfo = {
  jobType: string;
}

export type ModelInfo = {
  [modelName: string]: {
    apiPath: string;
    method: 'post' | 'get';
    healthCheckPath: string;
    imagePath: string;
    port: number;
    framework: 'tensorflow' | 'pytorch';
  }
}

export type UserTransactionParams = {
  timestamp: number,
  // eslint-disable-next-line camelcase
  tx_hash: string,
  type: string,
  value: number
};

export type InferenceHandlerParams = {
  data: {
    inputVector: string,
    numResultsRequest?: number,
    length?: number,
  },
}

export type KycAinValue = {
  // eslint-disable-next-line camelcase
  eth_address: string,
  // eslint-disable-next-line camelcase
  telegram_id: string,
}
