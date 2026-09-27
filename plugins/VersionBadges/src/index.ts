(() => {
  const { patcher, metro } = vendetta;
  const { findByProps, findByStoreName } = metro;

  const unpatches = [];

  const TARGET_USERNAME = "urrally";

  // Emoji URL'si temizlenerek doğrudan PNG formatına çevrildi
  const EMOJI_BADGE_URL = "https://cdn.discordapp.com/emojis/1325885158905352303.png";

  const CUSTOM_BADGES = [
    {
      id: "custom_debug_emoji",
      key: "custom_debug_emoji",
      description: "Custom Debug Badge",
      icon: EMOJI_BADGE_URL,
      link: "https://discord.com",
    },
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
  ];

  const injectBadges = (badgesArr) => {
    const list = Array.isArray(badgesArr) ? badgesArr : [];
    const clean = list.filter((b) => {
      const id = String(b?.id || b?.key || "").toLowerCase();
      return !CUSTOM_BADGES.some((cb) => cb.id === id);
    });
    return [...clean, ...CUSTOM_BADGES];
  };

  return {
    onLoad: () => {
      try {
        const UserStore =
          findByProps("getCurrentUser", "getUser") ||
          findByStoreName("UserStore");

        const UserProfileStore =
          findByStoreName("UserProfileStore") ||
          findByProps("getUserProfile");

        const FluxDispatcher = findByProps("dispatch", "subscribe");

        // Resim URL Çözücülerini Yamalama
        const badgeResolvers = [
          "getBadgeAsset",
          "getUserBadgeURL",
          "getBadgeURL",
          "getBadgeIcon",
        ];

        badgeResolvers.forEach((fnName) => {
          const mod = findByProps(fnName);
          if (!mod || typeof mod[fnName] !== "function") return;

          unpatches.push(
            patcher.instead(mod, fnName, (args, orig) => {
              const arg = args[0];
              const iconStr =
                typeof arg === "string"
                  ? arg
                  : arg?.icon || arg?.key || arg?.id;

              if (typeof iconStr === "string" && iconStr.startsWith("http")) {
                return fnName === "getBadgeAsset" ? { uri: iconStr } : iconStr;
              }

              const found = CUSTOM_BADGES.find(
                (b) =>
                  b.id === iconStr || b.key === iconStr || b.icon === iconStr
              );
              if (found) {
                return fnName === "getBadgeAsset"
                  ? { uri: found.icon }
                  : found.icon;
              }

              return orig.apply(mod, args);
            })
          );
        });

        // Flux Dispatcher Yaması
        if (FluxDispatcher) {
          unpatches.push(
            patcher.before(FluxDispatcher, "dispatch", (args) => {
              const [event] = args;
              if (event?.type === "USER_PROFILE_FETCH_SUCCESS") {
                const username = (event.user?.username || "").toLowerCase();
                const currentUser = UserStore?.getCurrentUser?.();
                const currentUsername = (currentUser?.username || "").toLowerCase();

                if (
                  username === TARGET_USERNAME.toLowerCase() ||
                  currentUsername === TARGET_USERNAME.toLowerCase()
                ) {
                  if (event.badges) event.badges = injectBadges(event.badges);
                  if (event.userProfile)
                    event.userProfile.badges = injectBadges(
                      event.userProfile.badges
                    );
                  if (event.profile)
                    event.profile.badges = injectBadges(
                      event.profile.badges
                    );
                }
              }
            })
          );
        }

        // UserProfileStore Yaması
        if (UserProfileStore) {
          const targetFns = ["getUserProfile", "getProfile"];
          targetFns.forEach((fnName) => {
            if (typeof UserProfileStore[fnName] === "function") {
              unpatches.push(
                patcher.after(
                  UserProfileStore,
                  fnName,
                  (args, profile) => {
                    if (!profile) return profile;

                    const username = (
                      profile.user?.username ||
                      UserStore?.getCurrentUser?.()?.username ||
                      ""
                    ).toLowerCase();

                    if (username === TARGET_USERNAME.toLowerCase()) {
                      profile.badges = injectBadges(profile.badges);
                    }
                    return profile;
                  }
                )
              );
            }
          });
        }
      } catch (e) {
        console.error("[Custom Badges Error]:", e);
      }
    },

    onUnload: () => {
      unpatches.forEach((unpatch) => {
        try {
          if (typeof unpatch === "function") unpatch();
        } catch (e) {}
      });
    },
  };
})();
