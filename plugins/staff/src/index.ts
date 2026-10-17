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

      const UserProfileStore =
        findByStoreName("UserProfileStore") ||
        findByProps("getUserProfile");

      const GuildMemberStore =
        findByStoreName("GuildMemberStore") ||
        findByProps("getMember", "getSelfMember");

      const AssetUtils = findByProps("getAssetIDByName");

      const getIconAsset = (iconName: string) => {
        if (!AssetUtils?.getAssetIDByName) return iconName;
        return (
          AssetUtils.getAssetIDByName(iconName) ||
          AssetUtils.getAssetIDByName(iconName.replace("Icon", "")) ||
          AssetUtils.getAssetIDByName(`ic_${iconName.toLowerCase()}`) ||
          iconName
        );
      };

      // 0. Dahili UI İkonlarını Rozet Sistemine Bağlayan Patch
      const patchBadgeModule = (fnName: string) => {
        const mod = findByProps(fnName);
        if (!mod || typeof mod[fnName] !== "function") return;

        const orig = mod[fnName];
        mod[fnName] = function (...args: any[]) {
          const arg = args[0];
          if (!arg) return orig.apply(this, args);

          const iconName = typeof arg === "string" ? arg : arg?.icon || arg?.key;

          if (
            typeof iconName === "string" &&
            (iconName.endsWith("Icon") || iconName.startsWith("ic_"))
          ) {
            const assetId = getIconAsset(iconName);
            if (assetId !== undefined && assetId !== null) {
              return assetId;
            }
          }

          return orig.apply(this, args);
        };

        unpatches.push(() => {
          mod[fnName] = orig;
        });
      };

      ["getBadgeAsset", "getUserBadgeURL", "getBadgeURL", "getBadgeIcon"].forEach(
        (fnName) => patchBadgeModule(fnName)
      );

      // ActionSheet (Rozet/Profil Menüleri) Entegrasyonu
      try {
        const ActionSheet = findByProps("openActionSheet", "hideActionSheet");
        if (ActionSheet && typeof ActionSheet.openActionSheet === "function") {
          const origOpen = ActionSheet.openActionSheet;
          ActionSheet.openActionSheet = function (...args: any[]) {
            // ActionSheet açıldığında tetiklenen tetikleyici
            return origOpen.apply(this, args);
          };
          unpatches.push(() => {
            ActionSheet.openActionSheet = origOpen;
          });
        }
      } catch (e) {}

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
