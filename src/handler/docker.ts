import Dockerode from 'dockerode';
import * as types from '../common/types';

export default class Docker {
  private static dockerode = new Dockerode({ socketPath: '/var/run/docker.sock' });

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
    await Docker.pullImage(image);

    const env = (option.gpuDeviceNumber) ? [`NVIDIA_VISIBLE_DEVICES=${option.gpuDeviceNumber}`] : [];
    const createContainerOptions = {
      name,
      ExposedPorts: {},
      Env: (option.env) ? env.concat(option.env) : env,
      Image: image,
      Labels: {
        comcom: '',
      },
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
  static async pullImage(image: string) {
    if (image.split(':').length === 1) {
      image += ':latest';
    }
    return new Promise<boolean>((resolve, reject) => {
      Docker.dockerode.pull(image, async (err: any, stream: any) => {
        function onFinished() {
          if (err) {
            reject(err);
          } else {
            resolve(true);
          }
        }
        if (err) {
          reject(err);
        } else {
          await Docker.dockerode.modem.followProgress(stream, onFinished);
        }
      });
    });
  }

  /**
   * Kill Docker Container.
   * @param name - Container Name.
   */
  static async killContainer(name: string) {
    const containerHandler = Docker.dockerode.getContainer(name);
    await containerHandler.remove({ force: true });
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
