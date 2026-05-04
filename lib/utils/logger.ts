export const logDev = (namespace: string, ...args: any[]) => {
  // Easy to grep and remove after release: search for "logDev("
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEV:${namespace}]`, ...args);
  }
};
