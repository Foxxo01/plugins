import { findByProps, findByStoreName } from "@vendetta/metro";
import { after } from "@vendetta/patcher";

const unpatches: Array<() => void> = [];

export default {
  onLoad: () => {
    try {
      const GuildMemberStore = findByStoreName("GuildMemberStore");
      const RoleStore = findByStoreName("RoleStore");
      const UsernameComponent = findByProps("NameWithWithWithRole") || findByProps("UsernameWithBadge") || findByProps("renderUsername");

      if (UsernameComponent) {
        const targetKey = UsernameComponent.renderUsername ? "renderUsername" : "default";

        if (typeof UsernameComponent[targetKey] === "function") {
          unpatches.push(
            after(targetKey, UsernameComponent, (args, res) => {
              try {
                const { guildId, userId } = args[0] || {};
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
                    const roleBadgeElement = {
                      $$typeof: Symbol.for("react.element"),
                      type: findByProps("View")?.View || "View",
                      key: "custom-top-role",
                      props: {
                        style: {
                          flexDirection: "row",
                          alignItems: "center",
                          backgroundColor: topRole.color ? `#${topRole.color.toString(16)}22` : "#2f3136",
                          borderColor: topRole.color ? `#${topRole.color.toString(16)}` : "#4f545c",
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
                              style: { width: 14, height: 14, marginRight: 4 }
                            }
                          },
                          {
                            $$typeof: Symbol.for("react.element"),
                            type: findByProps("Text")?.Text || "Text",
                            key: "role-name",
                            props: {
                              style: {
                                color: topRole.color ? `#${topRole.color.toString(16)}` : "#ffffff",
                                fontSize: 11,
                                fontWeight: "bold"
                              },
                              children: topRole.name
                            }
                          }
                        ].filter(Boolean)
                      }
                    };

                    if (Array.isArray(res.props.children)) {
                      res.props.children.push(roleBadgeElement);
                    } else if (res.props.children) {
                      res.props.children = [res.props.children, roleBadgeElement];
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
