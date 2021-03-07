import Dockerode from 'dockerode';
import * as types from '../common/types';

export default class Docker {
  private static dockerode = new Dockerode({ socketPath: '/var/run/docker.sock' });

  private static streamDict = {};

  /**
   * Run Docker GPU Container.
   * @param name - Container Name.
   * @param image - Docker Image Path.
   * @param option - (publishPorts...)
   */
  static async runContainerWithGpu(name: string,
    image: string,
    option: types.CreateContainerOption) {
    // Pull Docker Container Image.
    await Docker.pullImage(name, image);

    const env = (option.gpuDeviceNumber) ? [`NVIDIA_VISIBLE_DEVICES=${option.gpuDeviceNumber}`] : [];
    const createContainerOptions = {
      name,
      ExposedPorts: {},
      Env: (option.env) ? env.concat(option.env) : env,
      Image: image,
      Labels: option.labels,
      HostConfig: {
        AutoRemove: true,
        Binds: option.binds,
        PortBindings: {},
        DeviceRequests: (option.gpuDeviceNumber) ? [
          {
            Driver: '',
            Count: 0,
            DeviceIDs: option.gpuDeviceNumber.split(','),
            Capabilities: [['gpu']],
            Options: {},
          },
        ] : [],
      },
    };

    if (option.publishPorts) {
      for (const [externalPort, internalPort] of Object.entries(option.publishPorts)) {
        createContainerOptions.ExposedPorts[`${internalPort}/tcp`] = {};
        createContainerOptions.HostConfig.PortBindings[`${internalPort}/tcp`] = [{ HostPort: externalPort }];
      }
    }

    // Create Docker Containe.
    await (await Docker.dockerode.createContainer(createContainerOptions)).start();
  }

  /**
   * Pull Docker Image.
   * @param image - Docker Image Path.
   */
  static async pullImage(name: string, image: string) {
    if (image.split(':').length === 1) {
      image += ':latest';
    }
    return new Promise<boolean>((resolve, reject) => {
      Docker.dockerode.pull(image, async (err: any, stream: any) => {
        Docker.streamDict[name] = stream;
        function onFinished() {
          if (err) {
            delete Docker.streamDict[name];
            reject(err);
          } else {
            if (!Docker.streamDict[name]) {
              reject(new Error('canceled'));
              return;
            }
            delete Docker.streamDict[name];
            resolve(true);
          }
        }
        if (err) {
          delete Docker.streamDict[name];
          reject(err);
        } else {
          await Docker.dockerode.modem.followProgress(stream, onFinished);
        }
      });
    });
  }

  static cancelPullImage(name: string) {
    if (Docker.streamDict[name]) {
      Docker.streamDict[name].destroy();
      delete Docker.streamDict[name];
    }
  }

  /**
   * Kill Docker Container.
   * @param name - Container Name.
   */
  static async killContainer(name: string) {
    const containerHandler = Docker.dockerode.getContainer(name);
    await containerHandler.remove({ force: true });
  }

  static async execContainer(name:string, command: string) {
    const containerHandler = Docker.dockerode.getContainer(name);
    const exec = await containerHandler.exec({
      Cmd: ['/bin/bash', '-c', command],
      AttachStderr: true,
      AttachStdout: true,
    });
    const stream = await exec.start({
      stdin: true,
    });
    return new Promise<any>((resolve, _reject) => {
      stream
        .on('end', () => {
          resolve(true);
        });
    });
  }

  /**
   * Method to check if container exists.
   * @param name - Container Name.
   */
  static existContainer(name: string) {
    return !!Docker.dockerode.getContainer(name);
  }

  /**
   * Method to get container log.
   * @param name Container Name.
   * @param dataHandler Callback function to process log data.
   * @param endHandler Callback function called when log streaming is finished.
   */
  static containerLog(name: string,
    dataHandler: Function,
    endHandler: Function) {
    const container = Docker.dockerode.getContainer(name);
    container.logs({
      stdout: true,
      stderr: true,
      follow: true,
    }, async (err, stream) => {
      if (err || !stream) {
        await endHandler(err || 'Stream Not Exists');
        return;
      }

      stream.on('data', async (chunk) => {
        await dataHandler((chunk.toString() as string).slice(8));
      });
      stream.on('end', async () => {
        await endHandler();
      });
    });
  }
}
