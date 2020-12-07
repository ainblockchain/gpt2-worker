import Dockerode from 'dockerode';
import Logger from '../common/logger';

const log = Logger.createLogger('manager/docker');

export default class Docker {
  private static instance: Docker;

  private dockerode: Dockerode;

  private constructor() {
    this.dockerode = new Dockerode({ socketPath: '/var/run/docker.sock' });
  }

  /**
   * Method For Singleton Pattern.
   */
  static getInstance() {
    if (!Docker.instance) {
      Docker.instance = new Docker();
    }
    return Docker.instance;
  }

  async isNvidiaDocker() {
    try {
      const dockerInfo = await this.dockerode.info();
      return !!dockerInfo.Runtimes.nvidia;
    } catch (err) {
      log.error(`[-] Failed to get Docker Information - ${err.message}`);
      return false;
    }
  }

  /**
   * Runs Docker Dontainer.
   * @param name - Dontainer unique Name.
   * @param image - Docker Image Path
   * @param device - GPU Device Number
   * @param externalPort - External Port
   * @param internalPost - Internal Post
   */
  async run(name: string, image: string,
    deviceNumber: string, externalPort: string, internalPost: string) {
    // Pull Docker Image.
    await this.pullImage(image);

    const container = await this.dockerode.createContainer({
      name,
      ExposedPorts: {
        [`${internalPost}/tcp`]: {},
      },
      Env: [`NVIDIA_VISIBLE_DEVICES=${deviceNumber}`],
      Image: image,
      HostConfig: {
        Runtime: 'nvidia',
        Binds: [],
        PortBindings: {
          [`${internalPost}/tcp`]: [{ HostPort: externalPort }],
        },
      },
    });
    await container.start()
      .catch(async (err) => {
        await container.remove({ force: true });
        throw err;
      });
  }

  /**
   * Pull Docker Image.
   * @param image - Docker Image Path.
   */
  private async pullImage(image: string) {
    if (image.split(':').length === 1) {
      image += ':latest';
    }
    return new Promise<boolean>((resolve, reject) => {
      this.dockerode.pull(image, async (err: any, stream: any) => {
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
          await this.dockerode.modem.followProgress(stream, onFinished);
        }
      });
    });
  }

  /**
   * kills Docker Container.
   * @param name - container unique name.
   */
  async kill(name: string) {
    const containerHandler = this.dockerode.getContainer(name);
    await containerHandler.remove({ force: true });
  }
}
