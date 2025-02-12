import { CustomObjectsApi, KubeConfig } from "@kubernetes/client-node";
import type { GVR } from "./types.d.ts";

export default async (kc: KubeConfig, gvr: GVR): Promise<string[]> => {
  try {
    const customObjectsApi = kc.makeApiClient(CustomObjectsApi);
    const res = await customObjectsApi.listCustomObjectForAllNamespaces(gvr);

    return res.items
      .map((item: any) =>
        item.spec.routes.map(
          (route: any) => route.match.match(/Host\(["'`]?([^"'`)]+)["'`]?\)/)[1]
        )
      )
      .reduce((all: string[], current: string[]) => [...all, ...current], []);
    // console.log(urls);
    // console.log(urls);

    // .reduce((all: string[], current: string) => all.push(current), [])
    // console.log(res.body.items.map((item: any) => item.spec));

    // return [];
    // return (res.body as any).items.map(
    //   (item: any) => `${item.metadata.namespace}/${item.metadata.name}`
    // );
  } catch (error) {
    console.error("Error listing IngressRoutes:", error);
    return [];
  }
};
