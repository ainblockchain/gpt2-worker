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
