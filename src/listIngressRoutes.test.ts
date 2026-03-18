import { describe, it, expect, jest } from '@jest/globals';
import type { KubeConfig } from '@kubernetes/client-node';
import listIngressRoutes from './listIngressRoutes.ts';
import type { GVR } from './types.d.ts';

const gvr: GVR = { group: 'traefik.io', version: 'v1alpha1', plural: 'ingressroutes' };

function makeKc(items: unknown[]): KubeConfig {
  return {
    makeApiClient: jest.fn().mockReturnValue({
      listCustomObjectForAllNamespaces: jest.fn().mockResolvedValue({ items }),
    }),
  } as unknown as KubeConfig;
}

describe('listIngressRoutes', () => {
  it('extracts hosts from IngressRoutes', async () => {
    const kc = makeKc([
      { spec: { routes: [{ match: 'Host(`foo.example.com`)' }] } },
      { spec: { routes: [{ match: 'Host(`bar.example.com`)' }] } },
    ]);

    const result = await listIngressRoutes(kc, gvr);

    expect(result).toEqual(['foo.example.com', 'bar.example.com']);
  });

  it('extracts multiple hosts from a single IngressRoute', async () => {
    const kc = makeKc([
      {
        spec: {
          routes: [
            { match: 'Host(`foo.example.com`)' },
            { match: 'Host(`bar.example.com`)' },
          ],
        },
      },
    ]);

    const result = await listIngressRoutes(kc, gvr);

    expect(result).toEqual(['foo.example.com', 'bar.example.com']);
  });

  it('deduplicates hosts across IngressRoutes', async () => {
    const kc = makeKc([
      { spec: { routes: [{ match: 'Host(`foo.example.com`)' }] } },
      { spec: { routes: [{ match: 'Host(`foo.example.com`)' }] } },
    ]);

    const result = await listIngressRoutes(kc, gvr);

    expect(result).toEqual(['foo.example.com']);
  });

  it('returns empty array when no IngressRoutes exist', async () => {
    const kc = makeKc([]);

    const result = await listIngressRoutes(kc, gvr);

    expect(result).toEqual([]);
  });
});
