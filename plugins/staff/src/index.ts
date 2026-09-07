import { findByProps, findByStoreName } from "@vendetta/metro";

const unpatches: Array<() => void> = [];

export default {
  onLoad: () => {
    try {
      const PermissionStore = findByProps("getGuildPermissionProps", "computePermissions");
      const UserStore = findByProps("getCurrentUser", "getUser") || findByStoreName("UserStore");
      const GuildStore = findByProps("getGuilds", "getGuildsArray") || findByStoreName("GuildStore");
      const UserProfileStore = findByStoreName("UserProfileStore") || findByProps("getUserProfile");
      
      // Discord'un resmi dil / çeviri modülünü bul
      const i18n = findByProps("Messages") || findByProps("getMessage");

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

      // 3. Çok Dilli ve Resmi Sıralamalı Rozet Patching
      if (UserProfileStore && UserStore) {
        try {
          const origGetProfile = UserProfileStore.getUserProfile;
          if (typeof origGetProfile === "function") {
            UserProfileStore.getUserProfile = function (userId: string) {
              const profile = origGetProfile.apply(this, arguments);
              try {
                const currentUser = UserStore.getCurrentUser?.();
                if (profile && currentUser?.id && userId === currentUser.id) {
                  let badges = Array.isArray(profile.badges) ? [...profile.badges] : [];

                  // Dil metinlerini çek (Bulamazsa varsayılan İngilizceyi kullanır)
                  const staffText = i18n?.Messages?.STAFF_BADGE_OFFICIAL || i18n?.Messages?.PROFILE_BADGE_STAFF || "Discord Staff";
                  const bugHunterText = i18n?.Messages?.BUG_HUNTER_BADGE_LEVEL_1 || i18n?.Messages?.PROFILE_BADGE_BUG_HUNTER || "Discord Bug Hunter";

                  const staffBadge = {
                    id: "staff",
                    key: "staff",
                    description: staffText,
                    icon: "5e74e9b61934fc1f67c65515d1f7e60d",
                    link: "https://discord.com/company"
                  };

                  const bugHunterBadge = {
                    id: "bug_hunter",
                    key: "bug_hunter",
                    description: bugHunterText,
                    icon: "2717692c7dca7289b35297368a940dd0",
                    link: "https://support.discord.com"
                  };

                  // Eski/Çakışan rozetleri temizle
                  badges = badges.filter((b: any) => b && b.id !== "staff" && b.id !== "bug_hunter");

                  // Resmi Öncelik Haritası
                  const getPriority = (badge: any) => {
                    const id = (badge?.id || badge?.key || "").toLowerCase();
                    if (id.includes("staff")) return 1;
                    if (id.includes("partner")) return 2;
                    if (id.includes("certified_moderator") || id.includes("mod")) return 3;
                    if (id.includes("hypesquad")) return 4;
                    if (id.includes("bug_hunter")) return 5;
                    if (id.includes("developer") || id.includes("dev")) return 6;
                    if (id.includes("early")) return 7;
                    if (id.includes("premium") || id.includes("nitro")) return 8;
                    if (id.includes("booster") || id.includes("guild")) return 9;
                    return 99;
                  };

                  const updatedBadges = [staffBadge, bugHunterBadge, ...badges];
                  updatedBadges.sort((a, b) => getPriority(a) - getPriority(b));

                  profile.badges = updatedBadges;
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
