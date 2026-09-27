(() => {
  const { patcher, metro } = vendetta;
  const { findByProps, findByStoreName } = metro;

  const unpatches = [];

  // Sadece senin 4 Özel Rozetin
  const CUSTOM_BADGES = [
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

  const injectBadges = (badges) => {
    const list = Array.isArray(badges) ? badges : [];
    const clean = list.filter(
      (b) => !CUSTOM_BADGES.some((cb) => cb.id === (b?.id || b?.key))
    );
    return [...clean, ...CUSTOM_BADGES];
  };

  return {
    onLoad: () => {
      try {
        console.log("[CustomBadges] Eklenti başlatılıyor...");

        const UserStore =
          findByProps("getCurrentUser", "getUser") ||
          findByStoreName("UserStore");

        const UserProfileStore =
          findByStoreName("UserProfileStore") ||
          findByProps("getUserProfile");

        const FluxDispatcher = findByProps("dispatch", "subscribe");

        // 1. Resim / Asset Çözücü Patch (React Native URI desteği)
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

        // 2. Flux Dispatcher Patch (API'den profil verisi geldiği an)
        if (FluxDispatcher) {
          unpatches.push(
            patcher.before(FluxDispatcher, "dispatch", (args) => {
              const [event] = args;
              if (event?.type === "USER_PROFILE_FETCH_SUCCESS") {
                const myId = UserStore?.getCurrentUser?.()?.id;
                const targetId = event.user?.id || event.userId;

                if (!myId || targetId === myId) {
                  if (event.badges) event.badges = injectBadges(event.badges);
                  if (event.userProfile)
                    event.userProfile.badges = injectBadges(
                      event.userProfile.badges
                    );
                  if (event.profile)
                    event.profile.badges = injectBadges(event.profile.badges);
                  console.log("[CustomBadges] Flux event ile rozetler eklendi!");
                }
              }
            })
          );
        }

        // 3. UserProfileStore Patch (Profil istendiği an)
        if (UserProfileStore) {
          ["getUserProfile", "getProfile"].forEach((fnName) => {
            if (typeof UserProfileStore[fnName] === "function") {
              unpatches.push(
                patcher.after(UserProfileStore, fnName, (args, profile) => {
                  if (!profile) return profile;

                  const myId = UserStore?.getCurrentUser?.()?.id;
                  const targetId = args[0] || profile.user?.id;

                  if (!myId || targetId === myId) {
                    try {
                      profile.badges = injectBadges(profile.badges);
                    } catch (_) {
                      Object.defineProperty(profile, "badges", {
                        value: injectBadges(profile.badges),
                        writable: true,
                        configurable: true,
                        enumerable: true,
                      });
                    }
                    console.log("[CustomBadges] Store üzerinden rozetler eklendi!");
                  }
                  return profile;
                })
              );
            }
          });
        }

        console.log("[CustomBadges] Yamalar başarıyla yüklendi.");
      } catch (e) {
        console.error("[CustomBadges Error]:", e);
      }
    },

    onUnload: () => {
      unpatches.forEach((u) => {
        try {
          if (typeof u === "function") u();
        } catch (_) {}
      });
      console.log("[CustomBadges] Kaldırıldı.");
    },
  };
})();
