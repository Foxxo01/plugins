import { findByProps, findByName } from "@vendetta/metro";
import { before, after } from "@vendetta/patcher";

const unpatches: Array<() => void> = [];

export default {
  onLoad: () => {
    try {
      const BadgeUtils = findByProps("getBadges", "MAX_BADGES") || findByProps("MAX_BADGES_TO_DISPLAY");
      if (BadgeUtils) {
        if (BadgeUtils.MAX_BADGES !== undefined) BadgeUtils.MAX_BADGES = 999;
        if (BadgeUtils.MAX_BADGES_TO_DISPLAY !== undefined) BadgeUtils.MAX_BADGES_TO_DISPLAY = 999;
      }

      const UserBadges = findByProps("UserBadges") || findByProps("ProfileBadges") || findByName("UserBadges", false);
      if (UserBadges) {
        const target = UserBadges.UserBadges ? "UserBadges" : UserBadges.ProfileBadges ? "ProfileBadges" : "default";
        if (typeof UserBadges[target] === "function") {
          unpatches.push(
            before(target, UserBadges, (args) => {
              if (args && args[0]) {
                args[0].maxBadges = 999;
                args[0].limit = 999;
                if (Array.isArray(args[0].badges)) {
                  const origSlice = args[0].badges.slice;
                  args[0].badges.slice = function (start?: number, end?: number) {
                    if (start === 0 && (end === 6 || end === 5)) {
                      return this;
                    }
                    return origSlice.apply(this, arguments as any);
                  };
                }
              }
            })
          );
        }
      }

      const RenderUtils = findByProps("renderBadges") || findByProps("getDisplayBadges");
      if (RenderUtils) {
        Object.keys(RenderUtils).forEach((key) => {
          if (typeof RenderUtils[key] === "function") {
            unpatches.push(
              before(key, RenderUtils, (args) => {
                if (args && args[0] && Array.isArray(args[0])) {
                  const origSlice = args[0].slice;
                  args[0].slice = function (start?: number, end?: number) {
                    if (start === 0 && (end === 6 || end === 5)) {
                      return this;
                    }
                    return origSlice.apply(this, arguments as any);
                  };
                }
              })
            );
          }
        });
      }
    } catch (e) {}
  },

  onUnload: () => {
    unpatches.forEach((u) => {
      try { u(); } catch (e) {}
    });
    unpatches.length = 0;
  }
};
