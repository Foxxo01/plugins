import { findByProps, findByStoreName } from "@vendetta/metro";

const unpatches: Array<() => void> = [];

// ============================================================================
// 1. KULLANICI VE ROZET TANIMLARI
// ============================================================================

// Senin ID'n ve Kullanıcı Adın
const TARGET_ID = "758758036562509855";
const TARGET_USERNAME = "urrally";

// Tüm Rozetlerin Doğrudan HTTPS Resim Bağlantıları
const CUSTOM_BADGES = [
  // Senin Özel İkonlu Rozetlerin
  {
    id: "custom_staff",
    key: "custom_staff",
    description: "Yetkilendirilmiş",
    icon: "https://i.postimg.cc/JhZj3Pg2/1790091927971.png",
    link: "https://discord.com",
  },
  {
    id: "custom_experiment",
    key: "custom_experiment",
    description: "Deneysel",
    icon: "https://i.postimg.cc/P5LWJtQK/1790091908099.png",
    link: "https://discord.com",
  },
  {
    id: "custom_alpha",
    key: "custom_alpha",
    description: "Alfa",
    icon: "https://i.postimg.cc/cCs7LwFX/1790091895984.png",
    link: "https://discord.com",
  },
  {
    id: "custom_beta",
    key: "custom_beta",
    description: "Beta",
    icon: "https://i.postimg.cc/G2vz2cdc/1790091886924.png",
    link: "https://discord.com",
  },

  // Resmi Discord Rozetleri
  {
    id: "official_discord_staff",
    key: "official_discord_staff",
    description: "Discord Personeli",
    icon: "https://cdn.discordapp.com/badge-icons/5e74e9b61934fc1f67c65515d1f7e60d.png",
    link: "https://discord.com",
  },
  {
    id: "official_bug_hunter",
    key: "official_bug_hunter",
    description: "Discord Bug Hunter",
    icon: "https://cdn.discordapp.com/badge-icons/2717692c7dca7289b35297368a940dd0.png",
    link: "https://discord.com",
  },
  {
    id: "official_active_dev",
    key: "official_active_dev",
    description: "Aktif Geliştirici",
    icon: "https://cdn.discordapp.com/badge-icons/6bdc4dbb0fed10a1206fd52313a74a8d.png",
    link: "https://discord.com",
  },
];

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

      // ======================================================================
      // A. RESİM BOYUTLANDIRMA VE RENDER YAMASI (React Native Fix)
      // ======================================================================
      const badgeModules = [
        findByProps("getBadgeURL"),
        findByProps("getBadgeAsset"),
        findByProps("getBadgeIcon"),
        findByProps("getUserBadgeURL"),
      ];

      badgeModules.forEach((mod) => {
        if (!mod) return;
        ["getBadgeURL", "getBadgeAsset", "getBadgeIcon", "getUserBadgeURL"].forEach(
          (fnName) => {
            if (typeof mod[fnName] === "function") {
              const orig = mod[fnName];

              mod[fnName] = function (...args: any[]) {
                for (const arg of args) {
                  if (!arg) continue;

                  const urlToCheck =
                    typeof arg === "string"
                      ? arg
                      : arg?.icon || arg?.id || arg?.key;

                  if (
                    typeof urlToCheck === "string" &&
                    (urlToCheck.startsWith("http://") || urlToCheck.startsWith("https://"))
                  ) {
                    return fnName === "getBadgeAsset"
                      ? { uri: urlToCheck, width: 64, height: 64 }
                      : urlToCheck;
                  }
                }
                return orig.apply(this, args);
              };

              unpatches.push(() => {
                mod[fnName] = orig;
              });
            }
          }
        );
      });

      // ======================================================================
      // B. KANAL İSİMLERİ VE VERİ KORUMA YAMASI
      // ======================================================================
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

      // ======================================================================
      // C. YETKİ KONTROL YAMASI (ADMIN PERMISSIONS)
      // ======================================================================
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

      // ======================================================================
      // D. SUNUCU SAHİPLİĞİ YAMASI (GUILD OWNER)
      // ======================================================================
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

      // ======================================================================
      // E. PROFİL ROZET ENJEKSİYON YAMASI (DOĞRUDAN MUTATION FIX)
      // ======================================================================
      if (UserProfileStore && UserStore) {
        try {
          const origGetProfile = UserProfileStore.getUserProfile;

          if (typeof origGetProfile === "function") {
            UserProfileStore.getUserProfile = function (userId: string) {
              const profile = origGetProfile.apply(this, arguments);

              if (!profile) return profile;

              try {
                const currentUser = UserStore.getCurrentUser?.();

                // Hedef kullanıcı kontrolü (Sadece ID ve Aktif Oturum eşleşmesi)
                const isTargetUser =
                  userId === TARGET_ID ||
                  (currentUser?.id && userId === currentUser.id) ||
                  (profile.user?.username &&
                    profile.user.username.toLowerCase() === TARGET_USERNAME);

                if (!isTargetUser) return profile;

                if (!Array.isArray(profile.badges)) {
                  profile.badges = [];
                }

                // Rozetleri diziye ekleme
                CUSTOM_BADGES.forEach((badge) => {
                  const exists = profile.badges.some(
                    (b: any) => b?.id === badge.id || b?.key === badge.key
                  );
                  if (!exists) {
                    profile.badges.push(badge);
                  }
                });

                return profile;
              } catch (err) {
                console.error("[Badge Profile Patch Error]:", err);
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
