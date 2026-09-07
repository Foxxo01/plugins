import { findByProps } from "@vendetta/metro";

const unpatches: Array<() => void> = [];

export default {
  onLoad: () => {
    try {
      
      const BadgeUtils = findByProps("getBadges", "MAX_BADGES") || findByProps("MAX_BADGES_TO_DISPLAY");
      
      if (BadgeUtils) {
        if (BadgeUtils.MAX_BADGES !== undefined) {
          const origMax = BadgeUtils.MAX_BADGES;
          BadgeUtils.MAX_BADGES = 99;
          unpatches.push(() => { BadgeUtils.MAX_BADGES = origMax; });
        }

        if (BadgeUtils.MAX_BADGES_TO_DISPLAY !== undefined) {
          const origMaxToDisplay = BadgeUtils.MAX_BADGES_TO_DISPLAY;
          BadgeUtils.MAX_BADGES_TO_DISPLAY = 99;
          unpatches.push(() => { BadgeUtils.MAX_BADGES_TO_DISPLAY = origMaxToDisplay; });
        }
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
