import { findByProps } from "@vendetta/metro";
import { after } from "@vendetta/patcher";

const unpatches: Array<() => void> = [];

export default {
  onLoad: () => {
    try {
      const BadgeModules = findByProps("UserProfileBadges") || findByProps("ProfileBadges") || findByProps("UserBadges");

      if (BadgeModules) {
        Object.keys(BadgeModules).forEach((key) => {
          if (typeof BadgeModules[key] === "function") {
            unpatches.push(
              after(key, BadgeModules, (args, res) => {
                try {
                  if (args && args[0] && Array.isArray(args[0].badges)) {
                    const allBadges = args[0].badges;

                    const fixTree = (node: any): any => {
                      if (!node) return node;

                      if (node.props) {
                        if (node.props.overflow || node.props.overflowCount || node.props.badgeCount) {
                          node.props.overflow = undefined;
                          node.props.overflowCount = 0;
                          node.props.badgeCount = undefined;
                        }

                        if (Array.isArray(node.props.children)) {
                          node.props.children = node.props.children
                            .filter((child: any) => {
                              if (!child) return false;
                              const isOverflowComponent = 
                                child.type?.name?.includes("Overflow") || 
                                child.props?.text?.includes("+") || 
                                child.props?.ariaLabel?.includes("+");
                              return !isOverflowComponent;
                            })
                            .map(fixTree);
                        } else if (node.props.children) {
                          node.props.children = fixTree(node.props.children);
                        }
                      }
                      return node;
                    };

                    return fixTree(res);
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
