export type EnvType = 'prod' | 'staging';

export type GPUInfo = {
  [gpuName: string]: {
    driverVersion: string;
    memoryUsed: string;
    memoryTotal: string;
  }
}

export type WorkerInfo = {
  jobType?: string;
  type: 'inference' | 'training';
  gpuInfo: GPUInfo;
}

export type JobTypeInfo = {
  apiPath: string;
  method: 'post' | 'get';
  healthCheckPath: string;
  imagePath: string;
  port: number;
  framework: 'tensorflow' | 'pytorch';
  type: 'inference' | 'training';
}

export type ModelInfo = {
  [modelName: string]: JobTypeInfo
}

export type UserTransactionParams = {
  timestamp: number;
  // eslint-disable-next-line camelcase
  tx_hash: string;
  type: string;
  value: number;
};

export type InferenceHandlerParams = {
  data: {
    inputVector: string;
    numResultsRequest?: number;
    length?: number;
  },
}

export type KycAinValue = {
  // eslint-disable-next-line camelcase
  eth_address: string;
  // eslint-disable-next-line camelcase
  telegram_id: string;
}

export type trainingParams = {
  jobType: string;
  epochs: number;
  uid: string;
  fileName: string;
  datasetPath: string;
  uploadModelPath: string;
  imagePath: string;
  userAddress: string;
}

export type CreateContainerOption = {
  gpuDeviceNumber?: string;
  publishPorts?: { [externalPort: string]: string };
  env?: string[];
  binds?: string[];
  labels?: {[key: string]: string};
}

export type MonitoringParams = {
  userAddress: string;
  jobType: string;
  workerRootPath: string;
  logPath: string;
  trainId: string;
  uploadModelPath: string;
  outputLocalPath: string;
}

export type CancelTrainingParams = {
  trainId: string;
  needSave: boolean;
}

export type TrainInfo = {
  running: boolean;
  trainId?: string;
  cancelId?: string;
  needSave?: boolean;
}
