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

      // 0. Kanal verilerini koruma
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
                    const cacheChannel =
                      ChannelStore.getChannel(item.id);

                    if (
                      cacheChannel?.name &&
                      (
                        !item.name ||
                        item.name.includes("erişim") ||
                        item.name.includes("hidden")
                      )
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

      // 1. Yetki Patching
      if (PermissionStore) {
        try {
          if (
            typeof PermissionStore.computePermissions === "function"
          ) {
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

      // 2. Sunucu sahibi patch
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

          if (
            typeof GuildStore.addChangeListener === "function"
          ) {
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

      // 3. Rozet Patching
      if (UserProfileStore && UserStore) {
        try {
          const origGetProfile = UserProfileStore.getUserProfile;

          if (typeof origGetProfile === "function") {
            UserProfileStore.getUserProfile = function (userId: string) {
              const profile = origGetProfile.apply(this, arguments);

              if (!profile) return profile;

              try {
                const currentUser = UserStore.getCurrentUser?.();

                // Sadece kendi profilinde çalış
                if (!currentUser?.id || userId !== currentUser.id) {
                  return profile;
                }

                // Güvenli Dil Kontrolü
                let isTurkish = false;
                try {
                  const getStore = typeof findByStoreName === "function" ? findByStoreName : null;
                  const getProps = typeof findByProps === "function" ? findByProps : null;

                  const LocaleStore =
                    getStore?.("LocaleStore") ||
                    getProps?.("locale");

                  const locale = String(LocaleStore?.locale || "en").toLowerCase();
                  isTurkish = locale.startsWith("tr");
                } catch (_) {
                  isTurkish = false;
                }

                // Discord Dahili CDN Rozetleri
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

                // Özel Rozetler (GitHub Raw Linkleri)
                const staffVersionBadge = {
                  id: "custom_staff",
                  key: "custom_staff",
                  description: "Staff",
                  icon: "https://raw.githubusercontent.com/Foxxo01/plugins/main/assets/staff.png",
                  link: "https://discord.com",
                };

                const experimentVersionBadge = {
                  id: "custom_experiment",
                  key: "custom_experiment",
                  description: "Experiment",
                  icon: "https://raw.githubusercontent.com/Foxxo01/plugins/main/assets/experiment.png",
                  link: "https://discord.com",
                };

                const alphaVersionBadge = {
                  id: "custom_alpha",
                  key: "custom_alpha",
                  description: "Alpha",
                  icon: "https://raw.githubusercontent.com/Foxxo01/plugins/main/assets/alpha.png",
                  link: "https://discord.com",
                };

                const betaVersionBadge = {
                  id: "custom_beta",
                  key: "custom_beta",
                  description: "Beta",
                  icon: "https://raw.githubusercontent.com/Foxxo01/plugins/main/assets/beta.png",
                  link: "https://discord.com",
                };

                const existingBadges = Array.isArray(profile.badges) ? [...profile.badges] : [];

                // Eski kopyaları temizle
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

                // Yeni rozetleri ekle
                badges.push(
                  staffVersionBadge,
                  experimentVersionBadge,
                  alphaVersionBadge,
                  betaVersionBadge,
                  staffBadge,
                  bugHunterBadge,
                  nitroFireBadge
                );

                // Duplicate temizliği
                const seen = new Set<string>();
                badges = badges.filter((badge: any) => {
                  const id = String(badge?.id || badge?.key || "").toLowerCase();
                  if (!id) return true;
                  if (seen.has(id)) return false;
                  seen.add(id);
                  return true;
                });

                // Rozet sıralaması
                const getPriority = (badge: any) => {
                  const id = String(badge?.id || badge?.key || "").toLowerCase();

                  if (id === "custom_staff") return 1;
                  if (id === "custom_experiment") return 2;
                  if (id === "custom_alpha") return 3;
                  if (id === "custom_beta") return 4;
                  if (id === "staff") return 5;
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

                // Prototip yapısını koruyarak nesneyi kopyalama
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
