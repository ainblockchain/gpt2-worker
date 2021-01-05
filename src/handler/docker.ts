import Dockerode from 'dockerode';

export default class Docker {
  private static dockerode = new Dockerode({ socketPath: '/var/run/docker.sock' });

  /**
   * Run Docker GPU Container.
   * @param name - Container Name.
   * @param image - Docker Image Path.
   * @param gpuDeviceNumber - GPU Device Number.
   * @param publishPorts - Publish a container's port(s) to the host.
   */
  static async runContainerWithGpu(name: string,
    image: string,
    gpuDeviceNumber: string,
    publishPorts?: { [externalPort: string]: string }) {
    // Pull Docker Container Image.
    await Docker.pullImage(image);

    const createContainerOptions = {
      name,
      ExposedPorts: {},
      Env: [`NVIDIA_VISIBLE_DEVICES=${gpuDeviceNumber}`],
      Image: image,
      HostConfig: {
        AutoRemove: true,
        PortBindings: {},
        DeviceRequests: [
          {
            Driver: '',
            Count: 0,
            DeviceIDs: [gpuDeviceNumber],
            Capabilities: [['gpu']],
            Options: {},
          },
        ],
      },
    };

    if (publishPorts) {
      for (const [externalPort, internalPort] of Object.entries(publishPorts)) {
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
}
