import { findByProps, findByStoreName } from "@vendetta/metro";

const unpatches: Array<() => void> = [];

export default {
  onLoad: () => {
    try {
      const BadgeUtils = findByProps("getBadges", "MAX_BADGES") || findByProps("MAX_BADGES_TO_DISPLAY");
      if (BadgeUtils) {
        if (BadgeUtils.MAX_BADGES !== undefined) BadgeUtils.MAX_BADGES = 99;
        if (BadgeUtils.MAX_BADGES_TO_DISPLAY !== undefined) BadgeUtils.MAX_BADGES_TO_DISPLAY = 99;

        if (typeof BadgeUtils.getBadges === "function") {
          const origGetBadges = BadgeUtils.getBadges;
          BadgeUtils.getBadges = function (...args: any[]) {
            return origGetBadges.apply(this, args);
          };
          unpatches.push(() => { BadgeUtils.getBadges = origGetBadges; });
        }
      }

      const UserProfileStore = findByStoreName("UserProfileStore") || findByProps("getUserProfile");
      if (UserProfileStore) {
        const origGetProfile = UserProfileStore.getUserProfile;
        if (typeof origGetProfile === "function") {
          UserProfileStore.getUserProfile = function (...args: any[]) {
            const profile = origGetProfile.apply(this, args);
            if (profile && Array.isArray(profile.badges)) {
              profile.traitBadges = profile.badges;
            }
            return profile;
          };
          unpatches.push(() => { UserProfileStore.getUserProfile = origGetProfile; });
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
