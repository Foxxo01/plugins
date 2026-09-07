import { findByProps, findByPropsAll } from "@vendetta/metro";
import { after, before } from "@vendetta/patcher";

const unpatches: Array<() => void> = [];

export default {
  onLoad: () => {
    try {
      const badgeUtils = findByPropsAll("MAX_BADGES", "MAX_BADGES_TO_DISPLAY");
      badgeUtils.forEach((m) => {
        if (m.MAX_BADGES !== undefined) m.MAX_BADGES = 999;
        if (m.MAX_BADGES_TO_DISPLAY !== undefined) m.MAX_BADGES_TO_DISPLAY = 999;
      });

      const profileBadgesModule = findByProps("UserProfileBadges") || findByProps("ProfileBadges") || findByProps("UserBadges");
      
      if (profileBadgesModule) {
        Object.keys(profileBadgesModule).forEach((key) => {
          if (typeof profileBadgesModule[key] === "function") {
            unpatches.push(
              before(key, profileBadgesModule, (args) => {
                if (args && args[0]) {
                  args[0].maxBadges = 999;
                  args[0].limit = 999;
                  args[0].displayAllBadges = true;
                  if (args[0].badges && Array.isArray(args[0].badges)) {
                    args[0].badges = args[0].badges.map((b: any) => ({
                      ...b,
                      truncated: false
                    }));
                  }
                }
              })
            );

            unpatches.push(
              after(key, profileBadgesModule, (_, res) => {
                try {
                  if (res?.props?.children) {
                    const removeOverflow = (child: any) => {
                      if (!child) return;
                      if (child.props) {
                        if (child.props.overflowCount !== undefined) child.props.overflowCount = 0;
                        if (child.props.truncated !== undefined) child.props.truncated = false;
                        if (child.props.hasMore !== undefined) child.props.hasMore = false;
                        if (child.props.children) {
                          if (Array.isArray(child.props.children)) {
                            child.props.children.forEach(removeOverflow);
                          } else {
                            removeOverflow(child.props.children);
                          }
                        }
                      }
                    };
                    removeOverflow(res);
                  }
                } catch (e) {}
                return res;
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
