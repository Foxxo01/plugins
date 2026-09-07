import { findByProps, findByStoreName } from "@vendetta/metro";

const unpatches: Array<() => void> = [];

// Discord'un resmi rozet öncelik sırası
const BADGE_ORDER: Record<string, number> = {
  staff: 1,
  partner: 2,
  certified_moderator: 3,
  hypesquad: 4,
  bug_hunter_level_2: 5,
  bug_hunter: 6, // Bug Hunter Level 1
  active_developer: 7,
  early_supporter: 8,
  premium: 9, // Nitro
  guild_booster: 10, // Boost
};

export default {
  onLoad: () => {
    try {
      const PermissionStore = findByProps("getGuildPermissionProps", "computePermissions");
      const UserStore = findByProps("getCurrentUser", "getUser") || findByStoreName("UserStore");
      const GuildStore = findByProps("getGuilds", "getGuildsArray") || findByStoreName("GuildStore");
      const UserProfileStore = findByStoreName("UserProfileStore") || findByProps("getUserProfile");

      // 1. Yetki Patching
      if (PermissionStore) {
        try {
          if (typeof PermissionStore.computePermissions === "function") {
            const origCompute = PermissionStore.computePermissions;
            PermissionStore.computePermissions = function () { return BigInt(~0); };
            unpatches.push(() => { PermissionStore.computePermissions = origCompute; });
          }

          if (typeof PermissionStore.can === "function") {
            const origCan = PermissionStore.can;
            PermissionStore.can = function () { return true; };
            unpatches.push(() => { PermissionStore.can = origCan; });
          }
        } catch (e) {}
      }

      // 2. Sunucu Sahibi Patching
      if (GuildStore && UserStore) {
        try {
          const patchGuilds = () => {
            const guilds = GuildStore.getGuilds?.() || {};
            const list = Array.isArray(guilds) ? guilds : Object.values(guilds);
            const user = UserStore.getCurrentUser?.();
            if (user?.id) {
              list.forEach((g: any) => { if (g && typeof g === "object") g.ownerId = user.id; });
            }
          };

          if (typeof GuildStore.addChangeListener === "function") {
            GuildStore.addChangeListener(patchGuilds);
            unpatches.push(() => {
              try { GuildStore.removeChangeListener(patchGuilds); } catch (e) {}
            });
          }
          patchGuilds();
        } catch (e) {}
      }

      // 3. Rozet Patching (Discord Resmi Sıralamasına Göre)
      if (UserProfileStore && UserStore) {
        try {
          const origGetProfile = UserProfileStore.getUserProfile;
          if (typeof origGetProfile === "function") {
            UserProfileStore.getUserProfile = function (userId: string) {
              const profile = origGetProfile.apply(this, arguments);
              try {
                const currentUser = UserStore.getCurrentUser?.();
                if (profile && currentUser?.id && userId === currentUser.id) {
                  if (!Array.isArray(profile.badges)) profile.badges = [];

                  const customBadges = [
                    { id: "staff", description: "Discord Staff", icon: "5e74e9b61934fc1f67c65515d1f7e60d", link: "https://discord.com/company" },
                    { id: "bug_hunter", description: "Discord Bug Hunter", icon: "2717692c7dca7289b35297368a940dd0", link: "https://support.discord.com" }
                  ];

                  // Özel rozetleri ekle
                  customBadges.forEach((b) => {
                    if (!profile.badges.some((x: any) => x && x.id === b.id)) {
                      profile.badges.push(b);
                    }
                  });

                  // Tüm rozetleri Discord hiyerarşisine göre sırala
                  profile.badges.sort((a: any, b: any) => {
                    const orderA = BADGE_ORDER[a?.id] ?? 99;
                    const orderB = BADGE_ORDER[b?.id] ?? 99;
                    return orderA - orderB;
                  });
                }
              } catch (e) {}
              return profile;
            };
            unpatches.push(() => { UserProfileStore.getUserProfile = origGetProfile; });
          }
        } catch (e) {}
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
