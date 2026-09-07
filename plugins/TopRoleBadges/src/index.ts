import { findByProps, findByStoreName } from "@vendetta/metro";
import { after } from "@vendetta/patcher";

const unpatches: Array<() => void> = [];

export default {
  onLoad: () => {
    try {
      const GuildMemberStore = findByStoreName("GuildMemberStore");
      const RoleStore = findByStoreName("RoleStore");

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

                  if (!guildId || !userId) return res;

                  const member = GuildMemberStore?.getMember(guildId, userId);
                  const guildRoles = RoleStore?.getRoles(guildId);

                  if (member && member.roles && member.roles.length > 0 && guildRoles) {
                    const sortedRoles = member.roles
                      .map((rId: string) => guildRoles[rId])
                      .filter(Boolean)
                      .sort((a: any, b: any) => b.position - a.position);

                    const topRole = sortedRoles[0];

                    if (topRole && res && res.props) {
                      const hexColor = topRole.color
                        ? `#${topRole.color.toString(16).padStart(6, "0")}`
                        : "#b9bbbe";

                      const roleTagElement = {
                        $$typeof: Symbol.for("react.element"),
                        type: findByProps("View")?.View || "View",
                        key: `top-role-${topRole.id}`,
                        props: {
                          style: {
                            flexDirection: "row",
                            alignItems: "center",
                            backgroundColor: `${hexColor}20`,
                            borderColor: hexColor,
                            borderWidth: 1,
                            borderRadius: 4,
                            paddingHorizontal: 4,
                            paddingVertical: 1,
                            marginLeft: 6
                          },
                          children: [
                            topRole.icon && {
                              $$typeof: Symbol.for("react.element"),
                              type: findByProps("Image")?.Image || "Image",
                              key: "role-icon",
                              props: {
                                source: { uri: `https://cdn.discordapp.com/role-icons/${topRole.id}/${topRole.icon}.png` },
                                style: { width: 12, height: 12, marginRight: 3 }
                              }
                            },
                            {
                              $$typeof: Symbol.for("react.element"),
                              type: findByProps("Text")?.Text || "Text",
                              key: "role-text",
                              props: {
                                style: {
                                  color: hexColor,
                                  fontSize: 10,
                                  fontWeight: "bold"
                                },
                                children: topRole.name
                              }
                            }
                          ].filter(Boolean)
                        }
                      };

                      if (Array.isArray(res.props.children)) {
                        res.props.children.push(roleTagElement);
                      } else if (res.props.children) {
                        res.props.children = [res.props.children, roleTagElement];
                      }
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
