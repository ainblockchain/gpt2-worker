import * as sinon from 'sinon';
import Docker from '../../manager/docker';

const dockerApi = Docker.getInstance();

describe('manager/docker', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('run', async () => {
    sinon.stub(dockerApi, 'pullImage' as any)
      .callsFake(async () => true);
    const result = {};
    (dockerApi as any).dockerode = {
      createContainer: async (option: Object) => {
        result['option'] = option;
        return {
          start: async () => {},
        };
      },
    };
    await dockerApi.run('name', 'image', '1', '1000', '1000');
    expect(result).toEqual({
      option: {
        Env: ['NVIDIA_VISIBLE_DEVICES=1'],
        ExposedPorts: { '1000/tcp': {} },
        HostConfig: {
          Binds: [],
          PortBindings: {
            '1000/tcp': [{
              HostPort: '1000',
            }],
          },
          Runtime: 'nvidia',
        },
        Image: 'image',
        name: 'name',
      },
    });
  });
});
