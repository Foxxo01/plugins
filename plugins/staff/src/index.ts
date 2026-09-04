import { findByProps, findByStoreName } from "@vendetta/metro";

const unpatches = [];

export default {
  onLoad: () => {
    try {
      const PermissionStore = findByProps("getGuildPermissionProps", "computePermissions");
      const UserStore = findByProps("getCurrentUser", "getUser") || findByStoreName("UserStore");
      const GuildStore = findByProps("getGuilds", "getGuildsArray") || findByStoreName("GuildStore");
      const UserProfileStore = findByStoreName("UserProfileStore") || findByProps("getUserProfile");

      // 1. Yetki Patching
      if (PermissionStore) {
        const setProtoFields = (obj, fields, value) => {
          fields.forEach((field) => {
            try { Object.getPrototypeOf(obj)[field] = value; } catch (e) {}
          });
        };

        let permissionProps = {};
        try {
          const rawProps = PermissionStore.getGuildPermissionProps({ id: "0" }) || {};
          permissionProps = Object.fromEntries(Object.keys(rawProps).map((key) => [key, true]));
        } catch (e) {
          permissionProps = { ADMINISTRATOR: true, ADMIN: true };
        }

        setProtoFields(PermissionStore, ["getGuildPermissions", "getChannelPermissions", "computePermissions", "computeBasicPermissions"], () => ~0n);
        setProtoFields(PermissionStore, ["getGuildPermissionProps"], (guild) => ({ ...permissionProps, guild }));
        setProtoFields(PermissionStore, ["can", "canAccessGuildSettings", "canAccessMemberSafetyPage", "canBasicChannel", "canImpersonateRole", "canManageUser", "canWithPartialContext", "isRoleHigher"], () => true);

        if (typeof PermissionStore.emitChange === "function") PermissionStore.emitChange();
      }

      // 2. Guild Owner Override
      if (GuildStore && UserStore) {
        const applyOwnerOverride = () => {
          const guildsObj = GuildStore.getGuilds?.() || {};
          const guildsArray = GuildStore.getGuildsArray?.() || Object.values(guildsObj);
          const currentUser = UserStore.getCurrentUser?.();
          if (guildsArray && currentUser) {
            guildsArray.forEach((g) => { if (g) g.ownerId = currentUser.id; });
          }
        };

        if (typeof GuildStore.addChangeListener === "function") {
          GuildStore.addChangeListener(applyOwnerOverride);
          unpatches.push(() => {
            try { GuildStore.removeChangeListener(applyOwnerOverride); } catch (e) {}
          });
        }
        applyOwnerOverride();
        if (typeof GuildStore.emitChange === "function") GuildStore.emitChange();
      }

      // 3. Rozet Enjeksiyonu (Staff + Bug Hunter)
      if (UserProfileStore && UserStore) {
        const originalGetUserProfile = UserProfileStore.getUserProfile;
        UserProfileStore.getUserProfile = function (userId) {
          const profile = originalGetUserProfile.apply(this, arguments);
          const currentUser = UserStore.getCurrentUser();

          if (profile && userId === currentUser?.id) {
            if (!profile.badges) profile.badges = [];

            const customBadges = [
              { id: "staff", description: "Discord Personeli", icon: "5e74e9b61934fc1f67c65515d1f7e60d", link: "https://discord.com/company" },
              { id: "bug_hunter", description: "Discord Bug Hunter", icon: "2717692c7dca7289b35297368a940dd0", link: "https://support.discord.com" }
            ];

            customBadges.forEach((badge) => {
              if (!profile.badges.some((b) => b.id === badge.id)) {
                profile.badges.unshift(badge);
              }
            });
          }
          return profile;
        };

        unpatches.push(() => {
          UserProfileStore.getUserProfile = originalGetUserProfile;
        });
      }
    } catch (e) {}
  },

  onUnload: () => {
    for (const unpatch of unpatches) {
      try { unpatch(); } catch (e) {}
    }
  }
};
