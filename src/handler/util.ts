import * as util from 'util';
import * as fs from 'fs';
// eslint-disable-next-line camelcase
import child_process from 'child_process';
import * as types from '../common/types';

export const exec = util.promisify(child_process.exec);

export const fileExists = (filePath: string) => fs.existsSync(filePath);

export async function getGpuInfo(): Promise<types.GPUInfo> {
  const command = 'nvidia-smi --query-gpu=name,driver_version,memory.used,memory.total --format=csv,noheader';
  const { stdout } = await exec(command);
  const infoList = stdout.split('\n');
  infoList.pop();
  const result = {};
  let idx = 0;
  for (const info of infoList) {
    const dataList = info.split(',').map((item: string) => item.replace(' ', ''));
    result[`${dataList[0]}-${idx}`] = {
      gpuName: dataList[0],
      driverVersion: dataList[1],
      memoryUsed: dataList[2],
      memoryTotal: dataList[3],
    };
    idx += 1;
  }
  return result;
}

export async function delay(ms: number) {
  const result = await new Promise((resolve) => setTimeout(resolve, ms));
  return result;
}

export function editJsonFile(filePath: string, jsonData: Object) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '');
  }
  fs.truncateSync(filePath, 0);
  fs.appendFileSync(filePath, JSON.stringify(jsonData, null, 2));
}

export function watchJsonFile(jsonFilePath: string, callback: Function) {
  fs.writeFileSync(jsonFilePath, '');
  return fs.watch(jsonFilePath, async () => {
    try {
      const data = String(fs.readFileSync(jsonFilePath));
      if (data === '') {
        return;
      }
      const json = JSON.parse(data);
      await callback(json);
    } catch (err) {
      await callback(null, err.message);
    }
  });
}
