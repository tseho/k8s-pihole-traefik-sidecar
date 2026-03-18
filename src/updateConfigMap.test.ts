import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import type { KubeConfig } from '@kubernetes/client-node';
import updateConfigMap from './updateConfigMap.ts';
import type { ConfigMapDestination } from './types.d.ts';

const dest: ConfigMapDestination = { name: 'pihole-custom-dnsmasq', namespace: 'pihole' };
const routes = ['foo.example.com', 'bar.example.com'];

function makeKc(overrides: Record<string, unknown> = {}): { kc: KubeConfig; api: Record<string, jest.Mock> } {
  const api = {
    readNamespacedConfigMap: jest.fn<() => Promise<unknown>>(),
    replaceNamespacedConfigMap: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    createNamespacedConfigMap: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    ...overrides,
  };
  const kc = {
    makeApiClient: jest.fn().mockReturnValue(api),
  } as unknown as KubeConfig;
  return { kc, api };
}

describe('updateConfigMap', () => {
  const originalTraefikIp = process.env.TRAEFIK_IP;

  beforeEach(() => {
    delete process.env.TRAEFIK_IP;
  });

  afterEach(() => {
    if (originalTraefikIp !== undefined) {
      process.env.TRAEFIK_IP = originalTraefikIp;
    } else {
      delete process.env.TRAEFIK_IP;
    }
  });

  it('replaces existing ConfigMap when it exists', async () => {
    const existingConfigMap = { metadata: dest, data: {} };
    const { kc, api } = makeKc({
      readNamespacedConfigMap: jest.fn<() => Promise<unknown>>().mockResolvedValue(existingConfigMap),
    });

    await updateConfigMap(kc, dest, routes);

    expect(api.replaceNamespacedConfigMap).toHaveBeenCalledWith({
      name: dest.name,
      namespace: dest.namespace,
      body: existingConfigMap,
    });
    expect(api.createNamespacedConfigMap).not.toHaveBeenCalled();
  });

  it('creates ConfigMap when it does not exist (404)', async () => {
    const { kc, api } = makeKc({
      readNamespacedConfigMap: jest.fn<() => Promise<unknown>>().mockRejectedValue({ code: 404 }),
    });

    await updateConfigMap(kc, dest, routes);

    expect(api.createNamespacedConfigMap).toHaveBeenCalledWith({
      namespace: dest.namespace,
      body: expect.objectContaining({
        metadata: dest,
        data: expect.any(Object),
      }),
    });
    expect(api.replaceNamespacedConfigMap).not.toHaveBeenCalled();
  });

  it('generates correct dnsmasq host-record lines using TRAEFIK_IP', async () => {
    process.env.TRAEFIK_IP = '192.168.1.100';
    const existingConfigMap = { metadata: dest, data: {} };
    const { kc, api } = makeKc({
      readNamespacedConfigMap: jest.fn<() => Promise<unknown>>().mockResolvedValue(existingConfigMap),
    });

    await updateConfigMap(kc, dest, routes);

    expect(existingConfigMap.data).toEqual({
      '99-traefik.conf':
        'host-record=foo.example.com,192.168.1.100\nhost-record=bar.example.com,192.168.1.100',
    });
    expect(api.replaceNamespacedConfigMap).toHaveBeenCalled();
  });

  it('generates correct dnsmasq host-record lines using TRAEFIK_IP with multiple values', async () => {
    process.env.TRAEFIK_IP = '192.168.1.100,192.168.1.101';
    const existingConfigMap = { metadata: dest, data: {} };
    const { kc, api } = makeKc({
      readNamespacedConfigMap: jest.fn<() => Promise<unknown>>().mockResolvedValue(existingConfigMap),
    });

    await updateConfigMap(kc, dest, routes);

    expect(existingConfigMap.data).toEqual({
      '99-traefik.conf':
        'host-record=foo.example.com,192.168.1.100\nhost-record=foo.example.com,192.168.1.101\nhost-record=bar.example.com,192.168.1.100\nhost-record=bar.example.com,192.168.1.101',
    });
    expect(api.replaceNamespacedConfigMap).toHaveBeenCalled();
  });

  it('falls back to 127.0.0.1 when TRAEFIK_IP is not set', async () => {
    const existingConfigMap = { metadata: dest, data: {} };
    const { kc } = makeKc({
      readNamespacedConfigMap: jest.fn<() => Promise<unknown>>().mockResolvedValue(existingConfigMap),
    });

    await updateConfigMap(kc, dest, ['foo.example.com']);

    expect(existingConfigMap.data).toEqual({
      '99-traefik.conf': 'host-record=foo.example.com,127.0.0.1',
    });
  });

  it('produces empty config file when no routes are provided', async () => {
    const existingConfigMap = { metadata: dest, data: {} };
    const { kc } = makeKc({
      readNamespacedConfigMap: jest.fn<() => Promise<unknown>>().mockResolvedValue(existingConfigMap),
    });

    await updateConfigMap(kc, dest, []);

    expect(existingConfigMap.data).toEqual({ '99-traefik.conf': '' });
  });
});
