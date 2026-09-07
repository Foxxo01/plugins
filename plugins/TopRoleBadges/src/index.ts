import { findByProps } from "@vendetta/metro";
import { after } from "@vendetta/patcher";
import { getTopRole } from "./utils/roles";
import { createRoleTagElement } from "./components/RoleTag";

const unpatches: Array<() => void> = [];

export default {
  onLoad: () => {
    try {
      const UsernameModule = findByProps("Username") || findByProps("renderUsername") || findByProps("NameWithWithWithRole");

      if (UsernameModule) {
        Object.keys(UsernameModule).forEach((methodName) => {
          if (typeof UsernameModule[methodName] === "function") {
            unpatches.push(
              after(methodName, UsernameModule, (args, res) => {
                try {
                  const props = args[0] || {};
                  const guildId = props.guildId || props.message?.guild_id || props.channel?.guild_id;
                  const userId = props.userId || props.user?.id || props.message?.author?.id;

                  const topRole = getTopRole(guildId, userId);

                  if (topRole && res && res.props) {
                    const roleTagElement = createRoleTagElement(topRole);

                    if (Array.isArray(res.props.children)) {
                      res.props.children.push(roleTagElement);
                    } else if (res.props.children) {
                      res.props.children = [res.props.children, roleTagElement];
                    }
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
