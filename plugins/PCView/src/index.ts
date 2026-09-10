(() => {
  const revengeApi = typeof revenge !== "undefined" ? revenge : (globalThis.revenge || {});
  const patcher = revengeApi.patcher || window.revenge?.patcher;
  const metro = revengeApi.metro || window.revenge?.metro;

  let unpatches = [];

  return {
    onLoad: () => {
      if (!patcher || !metro) return;

      // 1. Ekran boyutunu yatay geniş modda (1280x800) tut
      const Dimensions = metro.common?.ReactNative?.Dimensions;
      if (Dimensions) {
        unpatches.push(
          patcher.after("get", Dimensions, (args, res) => {
            return {
              width: 1280,
              height: 720,
              scale: res?.scale || 1,
              fontScale: res?.fontScale || 1
            };
          })
        );
      }

      // 2. Discord'un layout ve oryantasyon servislerini yamala
      const LayoutModule = metro.find(m => m?.useLayoutMode || m?.getLayoutMode);
      if (LayoutModule) {
        if (LayoutModule.useLayoutMode) {
          unpatches.push(patcher.instead("useLayoutMode", LayoutModule, () => 2)); // 2 = Split/Desktop Mode
        }
        if (LayoutModule.getLayoutMode) {
          unpatches.push(patcher.instead("getLayoutMode", LayoutModule, () => 2));
        }
      }

      // 3. Media/Device store yaması
      const DeviceStore = metro.find(m => m?.isMobileLayout || m?.getDeviceType);
      if (DeviceStore) {
        if (DeviceStore.isMobileLayout) {
          unpatches.push(patcher.instead("isMobileLayout", DeviceStore, () => false));
        }
      }
    },

    onUnload: () => {
      for (const unpatch of unpatches) {
        if (typeof unpatch === "function") unpatch();
      }
      unpatches = [];
    }
  };
})();
