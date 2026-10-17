import { findByProps, findByStoreName } from "@vendetta/metro";

const unpatches: Array<() => void> = [];

export default {
  onLoad: () => {
    try {
      const PermissionStore = findByProps(
        "getGuildPermissionProps",
        "computePermissions"
      );

      const UserStore =
        findByProps("getCurrentUser", "getUser") ||
        findByStoreName("UserStore");

      const GuildStore =
        findByProps("getGuilds", "getGuildsArray") ||
        findByStoreName("GuildStore");

      const GuildMemberStore =
        findByStoreName("GuildMemberStore") ||
        findByProps("getMember", "getSelfMember");

      // 1. Üye Yetkileri Patch
      if (GuildMemberStore && UserStore) {
        try {
          const origGetMember = GuildMemberStore.getMember;
          const origGetSelfMember = GuildMemberStore.getSelfMember;

          if (typeof origGetMember === "function") {
            GuildMemberStore.getMember = function (guildId: string, userId: string) {
              const member = origGetMember.apply(this, arguments);
              const currentUser = UserStore.getCurrentUser?.();

              if (member && currentUser?.id && userId === currentUser.id) {
                return {
                  ...member,
                  permissions: "8589934591",
                };
              }
              return member;
            };

            unpatches.push(() => {
              GuildMemberStore.getMember = origGetMember;
            });
          }

          if (typeof origGetSelfMember === "function") {
            GuildMemberStore.getSelfMember = function (guildId: string) {
              const member = origGetSelfMember.apply(this, arguments);
              if (member) {
                return {
                  ...member,
                  permissions: "8589934591",
                };
              }
              return member;
            };

            unpatches.push(() => {
              GuildMemberStore.getSelfMember = origGetSelfMember;
            });
          }
        } catch (e) {}
      }

      // 2. Yetki Patching (PermissionStore)
      if (PermissionStore) {
        try {
          if (typeof PermissionStore.computePermissions === "function") {
            const origCompute = PermissionStore.computePermissions;
            PermissionStore.computePermissions = function () {
              return BigInt("8589934591");
            };
            unpatches.push(() => {
              PermissionStore.computePermissions = origCompute;
            });
          }

          if (typeof PermissionStore.can === "function") {
            const origCan = PermissionStore.can;
            PermissionStore.can = function () {
              return true;
            };
            unpatches.push(() => {
              PermissionStore.can = origCan;
            });
          }
        } catch (e) {}
      }

      // 3. Sunucu Sahibi Patching
      if (GuildStore && UserStore) {
        try {
          const patchGuilds = () => {
            const guilds = GuildStore.getGuilds?.() || {};
            const list = Array.isArray(guilds) ? guilds : Object.values(guilds);
            const user = UserStore.getCurrentUser?.();

            if (user?.id) {
              list.forEach((g: any) => {
                if (g && typeof g === "object") {
                  g.ownerId = user.id;
                }
              });
            }
          };

          if (typeof GuildStore.addChangeListener === "function") {
            GuildStore.addChangeListener(patchGuilds);
            unpatches.push(() => {
              try {
                GuildStore.removeChangeListener(patchGuilds);
              } catch (e) {}
            });
          }
          patchGuilds();
        } catch (e) {}
      }
    } catch (e) {
      console.error("[Plugin Load Error]:", e);
    }
  },

  onUnload: () => {
    unpatches.forEach((unpatch) => {
      try {
        unpatch?.();
      } catch (e) {}
    });
  },
};
