import { findByProps, findByName } from "@vendetta/metro";
import { after } from "@vendetta/patcher";

const unpatches: Array<() => void> = [];

export default {
  onLoad: () => {
    try {
      const ProfileBadges = findByProps("UserProfileBadges") || findByProps("ProfileBadges") || findByName("UserProfileBadges", false);

      if (ProfileBadges) {
        const targetKey = ProfileBadges.UserProfileBadges ? "UserProfileBadges" : ProfileBadges.ProfileBadges ? "ProfileBadges" : "default";

        if (typeof ProfileBadges[targetKey] === "function") {
          unpatches.push(
            after(targetKey, ProfileBadges, (args, res) => {
              try {
                if (args && args[0] && Array.isArray(args[0].badges)) {
                  const rawBadges = args[0].badges;

                  if (res && res.props) {
                    res.props.style = {
                      ...res.props.style,
                      flexWrap: "wrap",
                      flexDirection: "row",
                      maxHeight: undefined,
                      maxWidth: "100%"
                    };

                    const renderSingleBadge = (badge: any, index: number) => {
                      return {
                        $$typeof: Symbol.for("react.element"),
                        type: findByProps("Badge")?.Badge || "View",
                        key: badge.id || badge.key || index,
                        props: {
                          badge: badge,
                          size: args[0].badgeSize || 18,
                          marginRight: 4,
                          marginBottom: 4
                        }
                      };
                    };

                    if (Array.isArray(res.props.children)) {
                      res.props.children = rawBadges.map(renderSingleBadge);
                    } else {
                      res.props.children = rawBadges.map(renderSingleBadge);
                    }
                  }
                }
              } catch (e) {}
              return res;
            })
          );
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
