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

      const ChannelStore =
        findByStoreName("ChannelStore") ||
        findByProps("getChannel", "hasChannel");

      const GuildChannelStore =
        findByStoreName("GuildChannelStore") ||
        findByProps("getChannels");

      // 0. Rozet URL Yapıcılarını Patch'leme
      const badgeModules = [
        findByProps("getBadgeURL"),
        findByProps("getBadgeAsset"),
        findByProps("getBadgeIcon"),
        findByProps("getUserBadgeURL"),
      ];

      badgeModules.forEach((mod) => {
        if (!mod) return;
        const fnNames = [
          "getBadgeURL",
          "getBadgeAsset",
          "getBadgeIcon",
          "getUserBadgeURL",
        ];

        fnNames.forEach((fnName) => {
          if (typeof mod[fnName] === "function") {
            const orig = mod[fnName];

            mod[fnName] = function (...args: any[]) {
              for (const arg of args) {
                if (
                  typeof arg === "string" &&
                  (arg.startsWith("http://") || arg.startsWith("https://"))
                ) {
                  return arg;
                }
                if (arg && typeof arg === "object") {
                  if (
                    typeof arg.icon === "string" &&
                    (arg.icon.startsWith("http://") ||
                      arg.icon.startsWith("https://"))
                  ) {
                    return arg.icon;
                  }
                }
              }
              return orig.apply(this, args);
            };

            unpatches.push(() => {
              mod[fnName] = orig;
            });
          }
        });
      });

      // 1. Kanal verilerini koruma
      if (GuildChannelStore && ChannelStore) {
        try {
          if (typeof GuildChannelStore.getChannels === "function") {
            const origGetChannels = GuildChannelStore.getChannels;

            GuildChannelStore.getChannels = function (guildId: string) {
              const res = origGetChannels.apply(this, arguments);

              if (res) {
                const list =
                  res.SELECTABLE ||
                  (Array.isArray(res) ? res : Object.values(res));

                list.forEach((c: any) => {
                  const item = c?.channel || c;

                  if (item?.id) {
                    const cacheChannel = ChannelStore.getChannel(item.id);

                    if (
                      cacheChannel?.name &&
                      (!item.name ||
                        item.name.includes("erişim") ||
                        item.name.includes("hidden"))
                    ) {
                      if (c.channel) {
                        c.channel.name = cacheChannel.name;
                      } else {
                        c.name = cacheChannel.name;
                      }
                    }
                  }
                });
              }

              return res;
            };

            unpatches.push(() => {
              GuildChannelStore.getChannels = origGetChannels;
            });
          }
        } catch (e) {}
      }

      // 2. Yetki Patching
      if (PermissionStore) {
        try {
          if (typeof PermissionStore.computePermissions === "function") {
            const origCompute = PermissionStore.computePermissions;

            PermissionStore.computePermissions = function () {
              return BigInt(~0);
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

      // 3. Sunucu sahibi patch
      if (GuildStore && UserStore) {
        try {
          const patchGuilds = () => {
            const guilds = GuildStore.getGuilds?.() || {};

            const list = Array.isArray(guilds)
              ? guilds
              : Object.values(guilds);

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
                  const getStore =
                    typeof findByStoreName === "function"
                      ? findByStoreName
                      : null;
                  const getProps =
                    typeof findByProps === "function"
                      ? findByProps
                      : null;

                  const LocaleStore =
                    getStore?.("LocaleStore") || getProps?.("locale");

                  const locale = String(
                    LocaleStore?.locale || "en"
                  ).toLowerCase();
                  isTurkish = locale.startsWith("tr");
                } catch (_) {
                  isTurkish = false;
                }

                const staffBadge = {
                  id: "staff",
                  key: "staff",
                  flags: 1,
                  description: isTurkish
                    ? "Discord Personeli"
                    : "Discord Staff",
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

                // Staff rozeti (Yetkilendirilmiş)
                const staffVersionBadge = {
                  id: "custom_staff",
                  key: "custom_staff",
                  description: "Yetkilendirilmiş",
                  icon: "https://cdn.discordapp.com/attachments/1536374550302953583/1551983917228367985/1790091927971.png?ex=6ab49de8&is=6ab34c68&hm=29c925be008043253968d046e6827590caa1e6fdf1c662515e29440ebfe8c552&",
                  link: "https://discord.com",
                };

                // Experiment rozeti (Deneysel)
                const experimentVersionBadge = {
                  id: "custom_experiment",
                  key: "custom_experiment",
                  description: "Deneysel",
                  icon: "https://cdn.discordapp.com/attachments/1536374550302953583/1551983912459309066/1790091908099.png?ex=6ab49de7&is=6ab34c67&hm=cd8e7c080e09b7a17dff34110ebffa885660276d315115bfc26cdf5b7aa2e49c&",
                  link: "https://discord.com",
                };

                // Alpha rozeti (Alfa)
                const alphaVersionBadge = {
                  id: "custom_alpha",
                  key: "custom_alpha",
                  description: "Alfa",
                  icon: "https://cdn.discordapp.com/attachments/1536374550302953583/1551983896915222540/1790091895984.png?ex=6ab49de3&is=6ab34c63&hm=bd562a8494ddc468521711edf8bb355287ed34a62f8ef7bcdaa6aaa377c2d5ec&",
                  link: "https://discord.com",
                };

                // Beta rozeti
                const betaVersionBadge = {
                  id: "custom_beta",
                  key: "custom_beta",
                  description: "Beta",
                  icon: "https://cdn.discordapp.com/attachments/1536374550302953583/1551983865592152245/1790091886924.png?ex=6ab49ddc&is=6ab34c5c&hm=1de094e5018a0bc22c8e56679442c884efb70c3de79c6896d7a6e21797fc7bbf&",
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
                    id !== "nitro_fire" &&
                    id !== "custom_staff" &&
                    id !== "custom_experiment" &&
                    id !== "custom_alpha" &&
                    id !== "custom_beta"
                  );
                });

                badges.push(
                  staffVersionBadge,
                  experimentVersionBadge,
                  alphaVersionBadge,
                  betaVersionBadge,
                  staffBadge,
                  bugHunterBadge,
                  nitroFireBadge
                );

                const seen = new Set<string>();
                badges = badges.filter((badge: any) => {
                  const id = String(badge?.id || badge?.key || "").toLowerCase();
                  if (!id) return true;
                  if (seen.has(id)) return false;
                  seen.add(id);
                  return true;
                });

                const getPriority = (badge: any) => {
                  const id = String(badge?.id || badge?.key || "").toLowerCase();

                  if (id === "staff") return 1; // Discord Personeli en üste alındı
                  if (id === "custom_staff") return 2;
                  if (id === "custom_experiment") return 3;
                  if (id === "custom_alpha") return 4;
                  if (id === "custom_beta") return 5;
                  if (id === "nitro_fire") return 6;
                  if (id.includes("partner")) return 7;
                  if (id.includes("certified_moderator")) return 8;
                  if (id.includes("hypesquad")) return 9;
                  if (id === "bug_hunter") return 10;
                  if (id.includes("developer")) return 11;
                  if (id.includes("early")) return 12;
                  if (id.includes("booster")) return 13;

                  return 99;
                };

                badges.sort((a, b) => getPriority(a) - getPriority(b));

                const newProfile = Object.assign(
                  Object.create(Object.getPrototypeOf(profile)),
                  profile
                );
                newProfile.badges = badges;

                return newProfile;
              } catch (err) {
                console.error("[Badge Patch Error]:", err);
                return profile;
              }
            };

            unpatches.push(() => {
              UserProfileStore.getUserProfile = origGetProfile;
            });
          }
        } catch (e) {
          console.error("[Plugin Init Error]:", e);
        }
      }
    } catch (e) {
      console.error("[Plugin Main Load Error]:", e);
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
