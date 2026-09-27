(() => {
  const { patcher, metro } = vendetta;
  const { findByProps, findByStoreName } = metro;

  const unpatches = [];

  // TEST Rozetleri (Discord'un resmi dahili rozetleri)
  const TEST_BADGES = [
    {
      id: "staff",
      key: "staff",
      description: "Discord Staff (Test)",
      icon: "5e74e9b61934fc1f67c65515d1f7e60d",
    },
    {
      id: "active_developer",
      key: "active_developer",
      description: "Active Developer (Test)",
      icon: "848f2a5846061099f089978b7b7d416f",
    },
    {
      id: "hypesquad_house_1",
      key: "hypesquad_house_1",
      description: "HypeSquad Bravery (Test)",
      icon: "8a8822382770222a7f53be55c3c0a525",
    },
  ];

  const injectTestBadges = (badges) => {
    const list = Array.isArray(badges) ? badges : [];
    const clean = list.filter(
      (b) => !TEST_BADGES.some((tb) => tb.id === (b?.id || b?.key))
    );
    return [...clean, ...TEST_BADGES];
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

        // 1. API Verisi Geldiğinde Yakalama (Flux)
        if (FluxDispatcher) {
          unpatches.push(
            patcher.before(FluxDispatcher, "dispatch", (args) => {
              const [event] = args;
              if (event?.type === "USER_PROFILE_FETCH_SUCCESS") {
                const myId = UserStore?.getCurrentUser?.()?.id;
                const targetId = event.user?.id || event.userId;

                if (!myId || targetId === myId) {
                  if (event.badges) event.badges = injectTestBadges(event.badges);
                  if (event.userProfile)
                    event.userProfile.badges = injectTestBadges(
                      event.userProfile.badges
                    );
                  if (event.profile)
                    event.profile.badges = injectTestBadges(event.profile.badges);
                }
              }
            })
          );
        }

        // 2. Profile Store Okunduğunda Yakalama
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
                      profile.badges = injectTestBadges(profile.badges);
                    } catch (_) {
                      Object.defineProperty(profile, "badges", {
                        value: injectTestBadges(profile.badges),
                        writable: true,
                        configurable: true,
                        enumerable: true,
                      });
                    }
                  }
                  return profile;
                })
              );
            }
          });
        }
      } catch (e) {
        console.error("[Badge Test Error]:", e);
      }
    },

    onUnload: () => {
      unpatches.forEach((u) => {
        try {
          if (typeof u === "function") u();
        } catch (_) {}
      });
    },
  };
})();
