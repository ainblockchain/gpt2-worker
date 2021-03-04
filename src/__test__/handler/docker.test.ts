import * as sinon from 'sinon';
import Docker from '../../handler/docker';

describe('handler/docker', () => {
  beforeAll(() => {
    (Docker as any).pullImage = () => {};
    (Docker as any).killContainer = () => {};
  });

  afterEach(() => {
    sinon.restore();
  });

  it('runContainerWithGpu', async () => {
    let result;
    (Docker as any).dockerode = {
      createContainer: async (createContainerOptions: any) => {
        result = createContainerOptions;
        return {
          start: () => {},
        };
      },
    };
    const name = 'containerName';
    const image = 'imagePath:latest';
    const gpuDeviceNumber = '2';
    const publishPorts = {
      80: '80',
    };
    await Docker.runContainerWithGpu(
      name,
      image, {
        gpuDeviceNumber,
        publishPorts,
      },
    );

    expect(result).toEqual({
      name,
      ExposedPorts: {
        [`${publishPorts[80]}/tcp`]: {},
      },
      Env: [`NVIDIA_VISIBLE_DEVICES=${gpuDeviceNumber}`],
      Image: image,
      Labels: {
        comcom: '',
      },
      HostConfig: {
        AutoRemove: true,
        Binds: undefined,
        PortBindings: {
          [`${publishPorts[80]}/tcp`]: [{ HostPort: '80' }],
        },
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
    });
  });
});
