export let __DEV__ = process.env.NODE_ENV !== "production";
export let maybeWindow = typeof window !== "undefined" ? window : undefined;
export let isServer = typeof maybeWindow === "undefined" ||
  !maybeWindow.document ||
  !maybeWindow.document.createElement;
