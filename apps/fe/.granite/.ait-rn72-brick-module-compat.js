const __appsInTossReverseCompatIsHost = false;
const __appsInTossReverseCompatPreloadedReactNative = (() => { try { return require('react-native'); } catch { return undefined; } })();
const MINI_APP_CONSTANT_KEYS = ["groupId","operationalEnvironment","tossAppVersion","deviceId"];
const MINI_APP_EVENT_NAMES = ["updateLocation","visibilityChangedByTransparentServiceWeb","appBridgeCallback"];
const APP_BRIDGE_AD_METHODS = ["loadAppsInTossAdmob","showAppsInTossAdmob","getCachedStatusAppsInTossAdmob","loadTossAdOrAdmob","showTossAdOrAdmob","fetchTossAd"];
function isRecord(value) {
  return value != null && typeof value === "object";
}
function getReactNative(globalRef) {
  function getReactNativeFromSharedOrProxy() {
    if (isRecord(globalRef.__reactNativeProxy)) {
      return globalRef.__reactNativeProxy;
    }
    const sharedReactNative = globalRef.__MICRO_FRONTEND__?.__SHARED__?.["react-native"]?.get?.();
    if (isRecord(sharedReactNative)) {
      return sharedReactNative;
    }
    return void 0;
  }
  function getReactNativeFromNativeModuleProxy() {
    const nativeModuleProxy = isRecord(globalRef.nativeModuleProxy) ? globalRef.nativeModuleProxy : void 0;
    const turboModuleProxy = typeof globalRef.__turboModuleProxy === "function" ? globalRef.__turboModuleProxy : void 0;
    if (nativeModuleProxy != null || turboModuleProxy != null) {
      const turboRegistry = {
        get(name) {
          if (nativeModuleProxy?.[name] != null) {
            return nativeModuleProxy[name];
          }
          if (turboModuleProxy != null) {
            try {
              return turboModuleProxy(name);
            } catch {
              return void 0;
            }
          }
          return void 0;
        },
        getEnforcing(name) {
          const moduleRef = turboRegistry.get?.(name);
          if (moduleRef != null) {
            return moduleRef;
          }
          throw new Error(
            `[react-native-reverse-compatibility-plugin] TurboModule "${name}" is not available through nativeModuleProxy`
          );
        }
      };
      return {
        NativeModules: nativeModuleProxy,
        TurboModuleRegistry: turboRegistry
      };
    }
    return void 0;
  }
  if (isRecord(__appsInTossReverseCompatPreloadedReactNative)) {
    return __appsInTossReverseCompatPreloadedReactNative;
  }
  if (__appsInTossReverseCompatIsHost) {
    const reactNativeFromNativeModuleProxy = getReactNativeFromNativeModuleProxy();
    if (reactNativeFromNativeModuleProxy != null) {
      return reactNativeFromNativeModuleProxy;
    }
    const reactNativeFromSharedOrProxy = getReactNativeFromSharedOrProxy();
    if (reactNativeFromSharedOrProxy != null) {
      return reactNativeFromSharedOrProxy;
    }
  } else {
    const reactNativeFromSharedOrProxy = getReactNativeFromSharedOrProxy();
    if (reactNativeFromSharedOrProxy != null) {
      return reactNativeFromSharedOrProxy;
    }
    const reactNativeFromNativeModuleProxy = getReactNativeFromNativeModuleProxy();
    if (reactNativeFromNativeModuleProxy != null) {
      return reactNativeFromNativeModuleProxy;
    }
  }
  throw new Error(
    `[react-native-reverse-compatibility-plugin] cannot resolve react-native runtime (isHost=${__appsInTossReverseCompatIsHost})`
  );
}
function getTurboModule(reactNative, name) {
  const registry = reactNative.TurboModuleRegistry;
  if (!isRecord(registry)) {
    return void 0;
  }
  if (typeof registry.get === "function") {
    const mod = registry.get(name);
    if (mod != null) {
      return mod;
    }
  }
  if (typeof registry.getEnforcing === "function") {
    try {
      const mod = registry.getEnforcing(name);
      if (mod != null) {
        return mod;
      }
    } catch {
    }
  }
  return void 0;
}
function getNativeModule(reactNative, names) {
  const nativeModules = isRecord(reactNative.NativeModules) ? reactNative.NativeModules : void 0;
  for (const name of names) {
    const mod = nativeModules?.[name] ?? getTurboModule(reactNative, name);
    if (mod != null) {
      return mod;
    }
  }
  return void 0;
}
function getRequiredNativeModule(reactNative, names, label) {
  const mod = getNativeModule(reactNative, names);
  if (mod == null) {
    throw new Error(
      `[react-native-reverse-compatibility-plugin] ${label} is not available in NativeModules/TurboModuleRegistry`
    );
  }
  return mod;
}
function extractAppBridgePayload(input) {
  if (!isRecord(input)) {
    return null;
  }
  if (!("params" in input) && !("callbacks" in input)) {
    return null;
  }
  const payload = input;
  return {
    params: payload.params ?? {},
    callbacks: payload.callbacks ?? {}
  };
}
function getMiniAppConstants(moduleRef) {
  if (typeof moduleRef.getConstants === "function") {
    const constants = moduleRef.getConstants();
    return isRecord(constants) ? constants : {};
  }
  return MINI_APP_CONSTANT_KEYS.reduce((prev, key) => {
    if (key in moduleRef) {
      prev[key] = moduleRef[key];
    }
    return prev;
  }, {});
}
function callMiniAppMethod(moduleRef, methodName, params, callbacks) {
  const payload = extractAppBridgePayload(params);
  const payloadParams = payload?.params ?? params;
  const payloadCallbacks = callbacks != null && isRecord(callbacks) ? { ...isRecord(payload?.callbacks) ? payload.callbacks : {}, ...callbacks } : payload?.callbacks ?? {};
  const directMethod = moduleRef[methodName];
  if (typeof directMethod !== "function") {
    throw new Error(
      `[react-native-reverse-compatibility-plugin] MiniAppModule.${methodName} is not available in AppsInTossModule`
    );
  }
  const hasCallbacks = isRecord(payloadCallbacks) && Object.keys(payloadCallbacks).length > 0;
  const isAppBridgePayload = payload != null;
  if (hasCallbacks || isAppBridgePayload || APP_BRIDGE_AD_METHODS.includes(methodName)) {
    return directMethod({
      params: payloadParams ?? {},
      callbacks: payloadCallbacks
    });
  }
  return directMethod(payloadParams);
}
function createNoopSubscription() {
  return {
    remove() {
    }
  };
}
function getMiniAppEventEmitter(reactNative, moduleRef) {
  const nativeEventEmitterCtor = reactNative.NativeEventEmitter;
  if (typeof nativeEventEmitterCtor === "function") {
    try {
      const emitter = new nativeEventEmitterCtor(moduleRef);
      if (isRecord(emitter) && typeof emitter.addListener === "function") {
        return emitter;
      }
    } catch {
    }
  }
  const deviceEventEmitter = reactNative.DeviceEventEmitter;
  if (isRecord(deviceEventEmitter) && typeof deviceEventEmitter.addListener === "function") {
    return deviceEventEmitter;
  }
  return null;
}
function createOnSendEventCompat(moduleRef, reactNative) {
  return (listener) => {
    if (typeof listener !== "function") {
      return createNoopSubscription();
    }
    const onSendEvent = moduleRef.onSendEvent;
    if (typeof onSendEvent === "function") {
      const subscription = onSendEvent(listener);
      if (isRecord(subscription) && typeof subscription.remove === "function") {
        return subscription;
      }
      return createNoopSubscription();
    }
    const emitter = getMiniAppEventEmitter(reactNative, moduleRef);
    if (emitter == null) {
      return createNoopSubscription();
    }
    const subscriptions = [];
    for (const eventName of MINI_APP_EVENT_NAMES) {
      try {
        const subscription = emitter.addListener(eventName, (body) => {
          listener({
            eventName,
            body
          });
        });
        if (isRecord(subscription) && typeof subscription.remove === "function") {
          subscriptions.push(subscription);
        }
      } catch {
      }
    }
    return {
      remove() {
        for (const subscription of subscriptions) {
          try {
            subscription.remove?.();
          } catch {
          }
        }
      }
    };
  };
}
function createMiniAppModuleCompat(moduleRef, reactNative) {
  const onSendEventCompat = createOnSendEventCompat(moduleRef, reactNative);
  return new Proxy(moduleRef, {
    get(target, prop) {
      if (prop === "moduleName") {
        return "MiniAppModule";
      }
      if (prop === "getConstants") {
        return () => getMiniAppConstants(target);
      }
      if (prop === "postMessage") {
        return (methodName, params, callbacks) => {
          if (typeof methodName !== "string" || methodName.length === 0) {
            throw new Error(
              "[react-native-reverse-compatibility-plugin] MiniAppModule.postMessage requires methodName"
            );
          }
          return Promise.resolve(callMiniAppMethod(target, methodName, params, callbacks));
        };
      }
      if (prop === "postMessageSync") {
        return (methodName, params, callbacks) => {
          if (typeof methodName !== "string" || methodName.length === 0) {
            throw new Error(
              "[react-native-reverse-compatibility-plugin] MiniAppModule.postMessageSync requires methodName"
            );
          }
          return callMiniAppMethod(target, methodName, params, callbacks);
        };
      }
      if (prop === "onSendEvent") {
        return onSendEventCompat;
      }
      if (typeof prop === "string" && MINI_APP_CONSTANT_KEYS.includes(prop)) {
        const constants = getMiniAppConstants(target);
        return constants[prop];
      }
      if (typeof prop === "string") {
        const current = target[prop];
        if (typeof current === "function") {
          return current.bind(target);
        }
        if (current !== void 0) {
          return current;
        }
        return (params) => callMiniAppMethod(target, prop, params);
      }
      return Reflect.get(target, prop);
    }
  });
}
function createBedrockModuleCompat(moduleRef) {
  return new Proxy(moduleRef, {
    get(target, prop) {
      if (prop === "moduleName") {
        return "CommonModule";
      }
      if (prop === "DeviceInfo") {
        if (typeof target.getConstants === "function") {
          const constants = target.getConstants();
          const locale = isRecord(constants) ? constants.locale : void 0;
          return { locale: typeof locale === "string" ? locale : "" };
        }
        return { locale: "" };
      }
      if (prop === "schemeUri") {
        if (typeof target.getConstants === "function") {
          const constants = target.getConstants();
          return isRecord(constants) ? constants.schemeUri : void 0;
        }
        return void 0;
      }
      const current = Reflect.get(target, prop);
      return typeof current === "function" ? current.bind(target) : current;
    }
  });
}
function createGraniteBrownfieldModuleCompat(moduleRef, reactNative) {
  const bedrockCompat = createBedrockModuleCompat(moduleRef);
  return new Proxy(bedrockCompat, {
    get(target, prop) {
      if (prop === "moduleName") {
        return "GraniteBrownfieldModule";
      }
      if (prop === "onVisibilityChanged") {
        return (listener) => {
          if (typeof listener !== "function") {
            return createNoopSubscription();
          }
          const coreModule = getNativeModule(reactNative, ["BedrockCoreModule", "GraniteCoreModule"]);
          if (coreModule == null) {
            return createNoopSubscription();
          }
          const emitter = getMiniAppEventEmitter(reactNative, coreModule);
          if (emitter == null) {
            return createNoopSubscription();
          }
          const subscription = emitter.addListener("visibilityChanged", (nextVisible) => {
            listener({ visible: nextVisible });
          });
          if (isRecord(subscription) && typeof subscription.remove === "function") {
            return subscription;
          }
          return createNoopSubscription();
        };
      }
      if (prop === "closeView") {
        const closeView = Reflect.get(target, prop);
        if (typeof closeView === "function") {
          return (...args) => Promise.resolve(closeView(...args));
        }
      }
      const current = Reflect.get(target, prop);
      return typeof current === "function" ? current.bind(target) : current;
    }
  });
}
function createTossCoreModuleCompat(reactNative, miniAppModule) {
  const tossCoreModule = getNativeModule(reactNative, ["TossCoreModule"]);
  if (isRecord(tossCoreModule)) {
    return tossCoreModule;
  }
  return {
    moduleName: "TossCoreModule",
    eventLog: (params) => Promise.resolve(callMiniAppMethod(miniAppModule, "eventLog", params))
  };
}
function createBrickModuleCompat(globalRef) {
  const cache = /* @__PURE__ */ new Map();
  let reactNativeCache = null;
  const getReactNativeRuntime = () => {
    if (reactNativeCache != null) {
      return reactNativeCache;
    }
    reactNativeCache = getReactNative(globalRef);
    return reactNativeCache;
  };
  const getMiniAppModule = () => getRequiredNativeModule(getReactNativeRuntime(), ["AppsInTossModule", "MiniAppModule"], "AppsInTossModule");
  const moduleFactories = {
    CommonModule: () => createBedrockModuleCompat(
      getRequiredNativeModule(
        getReactNativeRuntime(),
        ["BedrockModule", "GraniteModule"],
        "BedrockModule/GraniteModule"
      )
    ),
    GraniteBrownfieldModule: () => createGraniteBrownfieldModuleCompat(
      getRequiredNativeModule(
        getReactNativeRuntime(),
        ["BedrockModule", "GraniteModule"],
        "BedrockModule/GraniteModule"
      ),
      getReactNativeRuntime()
    ),
    MiniAppModule: () => createMiniAppModuleCompat(getMiniAppModule(), getReactNativeRuntime()),
    TossCoreModule: () => createTossCoreModuleCompat(getReactNativeRuntime(), getMiniAppModule()),
    MiniAppBundleLoader: () => getRequiredNativeModule(
      getReactNativeRuntime(),
      ["BedrockCoreModule", "GraniteCoreModule"],
      "BedrockCoreModule/GraniteCoreModule"
    )
  };
  return {
    get(moduleName) {
      if (cache.has(moduleName)) {
        return cache.get(moduleName);
      }
      const factory = moduleFactories[moduleName];
      if (typeof factory !== "function") {
        throw new Error(
          `[react-native-reverse-compatibility-plugin] Unsupported BrickModule.get("${moduleName}") in RN72 target`
        );
      }
      const moduleInstance = factory();
      cache.set(moduleName, moduleInstance);
      return moduleInstance;
    },
    getRegisteredModules() {
      return Object.keys(moduleFactories);
    },
    clearCache() {
      cache.clear();
    }
  };
}
function applyReverseBrickModuleCompat(globalObject, moduleObject) {
  const globalRef = globalObject;
  const brickModule = createBrickModuleCompat(globalRef);
  moduleObject.exports = {
    __esModule: true,
    default: brickModule,
    BrickModule: brickModule,
    BrickError: Error,
    BrickModuleError: Error,
    Any: void 0,
    AnyObject: void 0
  };
}
(applyReverseBrickModuleCompat)(typeof globalThis !== 'undefined' ? globalThis : typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : this, module);