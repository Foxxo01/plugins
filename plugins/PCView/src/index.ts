import { patcher, metro } from "@revenge-mod/imports";

const LayoutStore = metro.findByProps("isTablet", "isMobile");
const Dimensions = metro.common?.ReactNative?.Dimensions;

let unpatches = [];

export default {
  onLoad: () => {
    if (LayoutStore) {
      unpatches.push(
        patcher.after("isMobile", LayoutStore, () => false),
        patcher.after("isTablet", LayoutStore, () => true)
      );
    }

    if (Dimensions) {
      unpatches.push(
        patcher.after("get", Dimensions, (args, res) => {
          if (args[0] === "window" || args[0] === "screen") {
            return {
              ...res,
              width: Math.max(res.width, 1024)
            };
          }
          return res;
        })
      );
    }
  },

  onUnload: () => {
    for (const unpatch of unpatches) {
      if (typeof unpatch === "function") unpatch();
    }
    unpatches = [];
  }
};
