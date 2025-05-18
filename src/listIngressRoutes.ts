import { CustomObjectsApi, KubeConfig } from "@kubernetes/client-node";
import type { GVR } from "./types.d.ts";

export default async (kc: KubeConfig, gvr: GVR): Promise<string[]> => {
  try {
    const customObjectsApi = kc.makeApiClient(CustomObjectsApi);
    const res = await customObjectsApi.listCustomObjectForAllNamespaces(gvr);

    const routes = res.items
      .map((item: any) =>
        item.spec.routes.map(
          (route: any) => route.match.match(/Host\(["'`]?([^"'`)]+)["'`]?\)/)[1]
        )
      )
      .reduce((all: string[], current: string[]) => [...all, ...current], []);

    return Array.from(new Set(routes));
  } catch (error) {
    console.error("Error listing IngressRoutes:", error);
    return [];
  }
};
