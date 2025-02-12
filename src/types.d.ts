// GroupVersionResource
export type GVR = {
  group: string;
  version: string;
  plural: string;
};

export type ConfigMapDestination = {
  name: string;
  namespace: string;
};
