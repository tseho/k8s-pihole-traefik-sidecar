import { KubeConfig, CoreV1Api, V1ConfigMap } from "@kubernetes/client-node";
import type { ConfigMapDestination } from "./types.d.ts";

export default async (
  kc: KubeConfig,
  dest: ConfigMapDestination,
  ingressRoutes: string[]
) => {
  const k8sApi = kc.makeApiClient(CoreV1Api);
  const data = {
    "99-traefik.conf": ingressRoutes
      .map((url) => `host-record=${url},${process.env.TRAEFIK_IP || '127.0.0.1'}`)
      .join("\n"),
  };

  try {
    const configMap = await k8sApi.readNamespacedConfigMap(dest);
    configMap.data = data;
    await k8sApi.replaceNamespacedConfigMap({
      name: dest.name,
      namespace: dest.namespace,
      body: configMap,
    });
    console.log("Updated ConfigMap with IngressRoutes");
  } catch (error: any) {
    if (error.code && error.code === 404) {
      const configMap = new V1ConfigMap();
      configMap.metadata = dest;
      configMap.data = data;

      await k8sApi.createNamespacedConfigMap({
        namespace: dest.namespace,
        body: configMap,
      });

      console.log("Created ConfigMap with IngressRoutes");
    } else {
      console.error("Error updating ConfigMap:", error);
      throw error;
    }
  }
};
