import { findByProps, findByPropsAll } from "@vendetta/metro";
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

      const badgeModules = findByPropsAll("MAX_BADGES", "MAX_BADGES_TO_DISPLAY");
      badgeModules.forEach((m) => {
        if (m.MAX_BADGES !== undefined) m.MAX_BADGES = 999;
        if (m.MAX_BADGES_TO_DISPLAY !== undefined) m.MAX_BADGES_TO_DISPLAY = 999;
      });

      const profileBadgeComp = findByProps("UserBadges") || findByProps("ProfileBadges") || findByProps("default", "getBadges");
      if (profileBadgeComp) {
        const targetKey = profileBadgeComp.UserBadges ? "UserBadges" : profileBadgeComp.ProfileBadges ? "ProfileBadges" : "default";
        if (typeof profileBadgeComp[targetKey] === "function") {
          unpatches.push(
            before(targetKey, profileBadgeComp, (args) => {
              if (args && args[0]) {
                if (args[0].maxBadges !== undefined) args[0].maxBadges = 999;
                if (args[0].limit !== undefined) args[0].limit = 999;
                if (args[0].badges && Array.isArray(args[0].badges)) {
                  args[0].truncatedBadges = [];
                }
              }
            })
          );
        }
      }

      const renderBadgeUtils = findByProps("renderBadges", "getBadges");
      if (renderBadgeUtils && typeof renderBadgeUtils.renderBadges === "function") {
        unpatches.push(
          before("renderBadges", renderBadgeUtils, (args) => {
            if (args && args[0]) {
              if (args[0].maxBadges !== undefined) args[0].maxBadges = 999;
              if (args[0].limit !== undefined) args[0].limit = 999;
            }
          })
        );
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
