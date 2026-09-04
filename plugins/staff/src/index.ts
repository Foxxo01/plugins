import { findByProps, findByStoreName } from "@vendetta/metro";

const unpatches: (() => void)[] = [];

export default {
  onLoad: () => {
    // 1. Adım: Metro bulucu
    let metro: any = null;
    try {
      metro = (typeof vendetta !== 'undefined' ? vendetta.metro : null) || 
              (typeof revenge !== 'undefined' ? revenge.metro : null) || 
              (typeof global !== 'undefined' ? (global as any).vendetta?.metro : null);
    } catch(e) {}

    if (!metro) {
      try {
        const modules = (window as any).__r?.() || (global as any).__r?.() || {};
        const metroKey = Object.keys(modules).find(k => modules[k]?.exports?.findByProps);
        if (metroKey) metro = modules[metroKey].exports;
      } catch(e) {}
    }

    const findModuleByProps = (...props: string[]) => {
      if (!metro) return null;
      try {
        if (typeof metro.findByProps === "function") return metro.findByProps(...props);
        if (typeof metro.find === "function") return metro.find((m: any) => props.every(p => p in (m?.exports || m)));
      } catch (e) {}
      return null;
    };

    if (!metro) return;

    const PermissionStore = findModuleByProps("getGuildPermissionProps", "computePermissions");
    const UserStore = findModuleByProps("getCurrentUser", "getUser");
    const GuildStore = findModuleByProps("getGuilds", "getGuildsArray") || findModuleByProps("getGuilds");

    if (!PermissionStore || !GuildStore || !UserStore) return;

    const setProtoFields = (obj: any, fields: string[], value: any) => {
      fields.forEach(field => {
        try { Object.getPrototypeOf(obj)[field] = value; } catch(e) {}
      });
    };

    let permissionProps = {};
    try {
      const rawProps = PermissionStore.getGuildPermissionProps({ id: "0" }) || {};
      permissionProps = Object.fromEntries(Object.keys(rawProps).map(key => [key, true]));
    } catch(e) {
      permissionProps = { ADMINISTRATOR: true, ADMIN: true };
    }

    // Enjeksiyon aşaması
    setProtoFields(PermissionStore, ["getGuildPermissions", "getChannelPermissions", "computePermissions", "computeBasicPermissions"], () => ~0n);
    setProtoFields(PermissionStore, ["getGuildPermissionProps"], (guild: any) => ({ ...permissionProps, guild }));
    setProtoFields(PermissionStore, ["can", "canAccessGuildSettings", "canAccessMemberSafetyPage", "canBasicChannel", "canImpersonateRole", "canManageUser", "canWithPartialContext", "isRoleHigher"], () => true);
    
    if (typeof PermissionStore.emitChange === "function") PermissionStore.emitChange();

    try {
      const applyOwnerOverride = () => {
        const guildsObj = GuildStore.getGuilds?.() || {};
        const guildsArray = GuildStore.getGuildsArray?.() || Object.values(guildsObj);
        const currentUser = UserStore.getCurrentUser?.();
        if (guildsArray && currentUser) {
          guildsArray.forEach((g: any) => { if (g) g.ownerId = currentUser.id; });
        }
      };
      if (typeof GuildStore.addChangeListener === "function") GuildStore.addChangeListener(applyOwnerOverride);
      applyOwnerOverride();
    } catch(e) {}

    if (typeof GuildStore.emitChange === "function") GuildStore.emitChange();

    // Rozet Ekleme Aşaması
    try {
      const UserProfileStore = metro.findByStoreName ? metro.findByStoreName("UserProfileStore") : findModuleByProps("getUserProfile");

      if (!UserProfileStore || !UserStore) return;

      function addBadgesMobile(badges: any[], insertAtIndex: number | null = null) {
          const original = UserProfileStore.getUserProfile;
          
          UserProfileStore.getUserProfile = function (userId: string) {
              const profile = original.apply(this, arguments);
              const currentUser = UserStore.getCurrentUser();
              
              if (profile && userId === currentUser?.id) {
                  if (!profile.badges) profile.badges = [];
                  
                  badges.forEach(({ id, description, icon, link }) => {
                      const alreadyExists = profile.badges.some((b: any) => b.id === id);
                      if (!alreadyExists) {
                          const newBadge = { id, description, icon, link };
                          if (typeof insertAtIndex === "number") {
                              profile.badges.splice(insertAtIndex, 0, newBadge);
                          } else {
                              profile.badges.push(newBadge);
                          }
                      }
                  });
              }
              return profile;
          };

          unpatches.push(() => {
            UserProfileStore.getUserProfile = original;
          });
      }

      addBadgesMobile([
          { id: "staff", description: "Discord Personeli", icon: "5e74e9b61934fc1f67c65515d1f7e60d", link: "https://discord.com/company" },
          { id: "bug_hunter", description: "Discord Bug Hunter", icon: "2717692c7dca7289b35297368a940dd0", link: "https://support.discord.com" }
      ], 0);

    } catch(e) {}
  },

  onUnload: () => {
    for (const unpatch of unpatches) unpatch();
  }
};
