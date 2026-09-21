import { findByProps, findByStoreName } from "@vendetta/metro";

const unpatches: Array<() => void> = [];

export default {
  onLoad: () => {
    try {
      const PermissionStore = findByProps("getGuildPermissionProps", "computePermissions");
      const UserStore = findByProps("getCurrentUser", "getUser") || findByStoreName("UserStore");
      const GuildStore = findByProps("getGuilds", "getGuildsArray") || findByStoreName("GuildStore");
      const UserProfileStore = findByStoreName("UserProfileStore") || findByProps("getUserProfile");
      const ChannelStore = findByStoreName("ChannelStore") || findByProps("getChannel", "hasChannel");
      const GuildChannelStore = findByStoreName("GuildChannelStore") || findByProps("getChannels");

      // [YENİ] 0. Kanal İsimlerini ve Verilerini Zorla Yükleme Patch'i
      // Yetki hilesinden dolayı ismi yüklenemeyen kilitli kanalların orijinal isimlerini Discord belleğinden kurtarır.
      if (GuildChannelStore && ChannelStore) {
        try {
          if (typeof GuildChannelStore.getChannels === "function") {
            const origGetChannels = GuildChannelStore.getChannels;
            GuildChannelStore.getChannels = function (guildId: string) {
              const res = origGetChannels.apply(this, arguments);
              if (res) {
                // SELECTABLE veya normal dizi/obje ayrımı yapmaksızın tüm kanalları tarar
                const list = res.SELECTABLE || (Array.isArray(res) ? res : Object.values(res));
                list.forEach((c: any) => {
                  const item = c?.channel || c;
                  if (item && item.id) {
                    const cacheChannel = ChannelStore.getChannel(item.id);
                    // Eğer kanal ismi boşsa veya yer tutucuysa bellekteki orijinal ismi zorla yazdırır
                    if (cacheChannel?.name && (!item.name || item.name.includes("erişim") || item.name.includes("hidden"))) {
                      if (c.channel) c.channel.name = cacheChannel.name;
                      else c.name = cacheChannel.name;
                    }
                  }
                });
              }
              return res;
            };
            unpatches.push(() => { GuildChannelStore.getChannels = origGetChannels; });
          }
        } catch (e) {}
      }

      // 1. Yetki Patching (Orijinal Yapı Korundu)
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

      // 2. Sunucu Sahibi Patching (Orijinal Yapı Korundu)
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

      // 3. Rozet Patching (Birebir Orijinal Discord Hiyerarşisi Korundu)
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

                  const LocaleStore = findByStoreName("LocaleStore") || findByProps("locale");
                  const locale = (LocaleStore?.locale || "en").toLowerCase();
                  const isTurkish = locale.startsWith("tr");

                  const staffLabel = isTurkish ? "Discord Personeli" : "Discord Staff";
                  const bugHunterLabel = isTurkish ? "Discord Bug Hunter" : "Discord Bug Hunter";

                  const staffBadge = {
                    id: "staff",
                    key: "staff",
                    flags: 1,
                    description: staffLabel,
                    icon: "5e74e9b61934fc1f67c65515d1f7e60d",
                    link: "https://discord.com"
                  };

                  const nitroFireBadge = {
                    id: "nitro",
                    key: "nitro_fire",
                    description: "Nitro Fire",
                    icon: "cff7119d4417261c3f52fde8a94ba8e5",
                    link: "https://discord.com"
                  };

                  const bugHunterBadge = {
                    id: "bug_hunter",
                    key: "bug_hunter",
                    flags: 4,
                    description: bugHunterLabel,
                    icon: "2717692c7dca7289b35297368a940dd0",
                    link: "https://discord.com"
                  };

                  badges = badges.filter((b: any) => b && b.id !== "staff" && b.id !== "bug_hunter" && b.id !== "nitro_fire" && b.id !== "premium");

                  const getPriority = (badge: any) => {
                    const id = (badge?.id || badge?.key || "").toLowerCase();
                    if (id.includes("staff")) return 1;
                    if (id.includes("nitro") || id.includes("premium")) return 2;
                    if (id.includes("partner")) return 3;
                    if (id.includes("certified_moderator") || id.includes("mod")) return 4;
                    if (id.includes("hypesquad")) return 5;
                    if (id.includes("bug_hunter")) return 6;
                    if (id.includes("developer") || id.includes("dev")) return 7;
                    if (id.includes("early")) return 8;
                    if (id.includes("booster") || id.includes("guild")) return 9;
                    return 99;
                  };

                  const updatedBadges = [staffBadge, bugHunterBadge, nitroFireBadge, ...badges];
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
