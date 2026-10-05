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

      const ChannelStore =
        findByStoreName("ChannelStore") ||
        findByProps("getChannel", "hasChannel");

      const GuildChannelStore =
        findByStoreName("GuildChannelStore") ||
        findByProps("getChannels");

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

      // 1. Üye Yetkileri ve Rol Patch (EKLENDİ: Arayüzde Yetkilerin Aktifleşmesi İçin)
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
                  permissions: "8589934591", // FULL ADMINISTRATOR PERMISSIONS
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
              return BigInt("8589934591"); // Tüm izinlerin biti
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

      // 4. Rozet Ekleme Patching
      if (UserProfileStore && UserStore) {
        try {
          const origGetProfile = UserProfileStore.getUserProfile;

          if (typeof origGetProfile === "function") {
            UserProfileStore.getUserProfile = function (userId: string) {
              const profile = origGetProfile.apply(this, arguments);

              if (!profile) return profile;

              try {
                const currentUser = UserStore.getCurrentUser?.();

                if (!currentUser?.id || userId !== currentUser.id) {
                  return profile;
                }

                let isTurkish = false;
                try {
                  const LocaleStore =
                    findByStoreName("LocaleStore") || findByProps("locale");
                  const locale = String(LocaleStore?.locale || "en").toLowerCase();
                  isTurkish = locale.startsWith("tr");
                } catch (_) {
                  isTurkish = false;
                }

                const staffBadge = {
                  id: "staff",
                  key: "staff",
                  flags: 1,
                  description: isTurkish ? "Discord Personeli" : "Discord Staff",
                  icon: "5e74e9b61934fc1f67c65515d1f7e60d",
                  link: "https://discord.com",
                };

                const bugHunterBadge = {
                  id: "bug_hunter",
                  key: "bug_hunter",
                  flags: 4,
                  description: "Discord Bug Hunter",
                  icon: "2717692c7dca7289b35297368a940dd0",
                  link: "https://discord.com",
                };

                const nitroFireBadge = {
                  id: "nitro_fire",
                  key: "nitro_fire",
                  description: "Nitro Fire",
                  icon: "cff7119d4417261c3f52fde8a94ba8e5",
                  link: "https://discord.com",
                };

                const existingBadges = Array.isArray(profile.badges)
                  ? [...profile.badges]
                  : [];

                let badges = existingBadges.filter((b: any) => {
                  const id = String(b?.id || b?.key || "").toLowerCase();
                  return (
                    id !== "staff" &&
                    id !== "bug_hunter" &&
                    id !== "nitro_fire"
                  );
                });

                badges.push(staffBadge, bugHunterBadge, nitroFireBadge);

                const seen = new Set<string>();
                badges = badges.filter((badge: any) => {
                  const id = String(badge?.id || badge?.key || "").toLowerCase();
                  if (!id) return true;
                  if (seen.has(id)) return false;
                  seen.add(id);
                  return true;
                });

                Object.defineProperty(profile, "badges", {
                  value: badges,
                  writable: true,
                  configurable: true,
                  enumerable: true,
                });

                return profile;
              } catch (err) {
                return profile;
              }
            };

            unpatches.push(() => {
              UserProfileStore.getUserProfile = origGetProfile;
            });
          }
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
