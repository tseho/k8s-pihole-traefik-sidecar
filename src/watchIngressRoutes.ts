import { KubeConfig, Watch } from "@kubernetes/client-node";
import listIngressRoutes from "./listIngressRoutes.ts";
import updateConfigMap from "./updateConfigMap.ts";
import type { ConfigMapDestination, GVR } from "./types.d.ts";
import queue from "./queue.ts";

const watchIngressRoutes = (
  kc: KubeConfig,
  gvr: GVR,
  dest: ConfigMapDestination
) => {
  console.log("Watching IngressRoute resources across all namespaces...");
  console.log(`/apis/${gvr.group}/${gvr.version}/${gvr.plural}`);

  const watch = new Watch(kc);
  watch.watch(
    `/apis/${gvr.group}/${gvr.version}/${gvr.plural}`,
    {}, // Empty query to watch all namespaces
    async (_type, _obj) => {
      queue.enqueue(async () => {
        console.log("IngressRoute changed, updating ConfigMap...");
        const ingressRoutes = await listIngressRoutes(kc, gvr);
        await updateConfigMap(kc, dest, ingressRoutes);
      });
    },
    (err) => {
      console.error("Error watching IngressRoutes:", err);
    }
  );
};

export default watchIngressRoutes;
