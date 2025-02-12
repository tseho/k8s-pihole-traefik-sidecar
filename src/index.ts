import { KubeConfig } from "@kubernetes/client-node";
import watchIngressRoutes from "./watchIngressRoutes.ts";

const kc = new KubeConfig();
kc.loadFromDefault();

watchIngressRoutes(
  kc,
  {
    group: "traefik.containo.us",
    version: "v1alpha1",
    plural: "ingressroutes",
  },
  {
    name: process.env.CONFIG_MAP_NAME || "ingressroutes",
    namespace: process.env.CONFIG_MAP_NAMESPACE || "default",
  }
);
