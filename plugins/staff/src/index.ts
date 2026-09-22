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
        const origCompute =  
          PermissionStore.computePermissions;  

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
        const guilds =  
          GuildStore.getGuilds?.() || {};  

        const list = Array.isArray(guilds)  
          ? guilds  
          : Object.values(guilds);  

        const user =  
          UserStore.getCurrentUser?.();  

        if (user?.id) {  
          list.forEach((g: any) => {  
            if (  
              g &&  
              typeof g === "object"  
            ) {  
              g.ownerId = user.id;  
            }  
          });  
        }  
      };  

      if (  
        typeof GuildStore.addChangeListener ===  
        "function"  
      ) {  
        GuildStore.addChangeListener(  
          patchGuilds  
        );  

        unpatches.push(() => {  
          try {  
            GuildStore.removeChangeListener(  
              patchGuilds  
            );  
          } catch (e) {}  
        });  
      }  

      patchGuilds();  
    } catch (e) {}  
  }  

  // 3. Rozet Patching  
 if (UserProfileStore && UserStore) {
    try {
      const origGetProfile =
        UserProfileStore.getUserProfile;

      if (
        typeof origGetProfile === "function"
      ) {
        UserProfileStore.getUserProfile =
          function (userId: string) {
            const profile =
              origGetProfile.apply(
                this,
                arguments
              );

            try {
              const currentUser =
                UserStore.getCurrentUser?.();

              // Sadece kendi profilinde çalış
              if (
                !profile ||
                !currentUser?.id ||
                userId !== currentUser.id
              ) {
                return profile;
              }

              const newProfile = {
                ...profile,
                badges: Array.isArray(
                  profile.badges
                )
                  ? [...profile.badges]
                  : [],
              };

              const LocaleStore =
                findByStoreName(
                  "LocaleStore"
                ) ||
                findByProps("locale");

              const locale = String(
                LocaleStore?.locale || "en"
              ).toLowerCase();

              const isTurkish =
                locale.startsWith("tr");

              const staffBadge = {
                id: "staff",
                key: "staff",
                flags: 1,
                description: isTurkish
                  ? "Discord Personeli"
                  : "Discord Staff",
                icon:
                  "5e74e9b61934fc1f67c65515d1f7e60d",
                link: "https://discord.com",
              };

              const bugHunterBadge = {
                id: "bug_hunter",
                key: "bug_hunter",
                flags: 4,
                description:
                  "Discord Bug Hunter",
                icon:
                  "2717692c7dca7289b35297368a940dd0",
                link: "https://discord.com",
              };

              const nitroFireBadge = {
                id: "nitro_fire",
                key: "nitro_fire",
                description: "Nitro Fire",
                icon:
                  "cff7119d4417261c3f52fde8a94ba8e5",
                link: "https://discord.com",
              };

              const staffVersionBadge = {
                id: "custom_staff",
                key: "custom_staff",
                description: "Staff",
                icon:
                  "https://cdn.discordapp.com/attachments/1536374550302953583/1551983917228367985/1790091927971.png?ex=6ab3f528&is=6ab2a3a8&hm=b2cb35148f1fbf7657a6f26ccde4f134dfd91c55cb3dd3472aa02aeaebf15906&",
                link: "https://discord.com",
              };

              const experimentVersionBadge = {
                id: "custom_experiment",
                key: "custom_experiment",
                description: "Experiment",
                icon:
                  "https://cdn.discordapp.com/attachments/1536374550302953583/1551983912459309066/1790091908099.png?ex=6ab3f527&is=6ab2a3a7&hm=b8cfce516dac0fd0bddb84e68e7508c1cf9e5363174d346b2e24b078168cbcf7&",
                link: "https://discord.com",
              };

              const alphaVersionBadge = {
                id: "custom_alpha",
                key: "custom_alpha",
                description: "Alpha",
                icon:
                  "https://cdn.discordapp.com/attachments/1536374550302953583/1551983896915222540/1790091895984.png?ex=6ab3f523&is=6ab2a3a3&hm=65ddac561bea57b11e7a16fcd0032ae44474fa0620cba7342a71b15b142e5fca&",
                link: "https://discord.com",
              };

              const betaVersionBadge = {
                id: "custom_beta",
                key: "custom_beta",
                description: "Beta",
                icon:
                  "https://cdn.discordapp.com/attachments/1536374550302953583/1551983865592152245/1790091886924.png?ex=6ab3f51c&is=6ab2a39c&hm=300eba4285efb26c73bacf71627d029f4f161b0ff0deac3ad9cca69b329cdf91&",
                link: "https://discord.com",
              };

              // Eski yerel badge kopyalarını temizle
              let badges =
                newProfile.badges.filter(
                  (b: any) => {
                    const id = String(
                      b?.id ||
                        b?.key ||
                        ""
                    ).toLowerCase();

                    return (
                      id !== "staff" &&
                      id !== "bug_hunter" &&
                      id !== "nitro_fire" &&
                      id !== "custom_staff" &&
                      id !== "custom_experiment" &&
                      id !== "custom_alpha" &&
                      id !== "custom_beta"
                    );
                  }
                );

              // Her badge'den yalnızca bir tane ekle
              badges.push(staffVersionBadge);
              badges.push(experimentVersionBadge);
              badges.push(alphaVersionBadge);
              badges.push(betaVersionBadge);
              badges.push(staffBadge);
              badges.push(bugHunterBadge);
              badges.push(nitroFireBadge);

              // Kesin duplicate temizliği
              const seen =
                new Set<string>();

              badges = badges.filter(
                (badge: any) => {
                  const id = String(
                    badge?.id ||
                      badge?.key ||
                      ""
                  ).toLowerCase();

                  if (!id) return true;

                  if (seen.has(id)) {
                    return false;
                  }

                  seen.add(id);
                  return true;
                }
              );

              // Rozet sıralaması
              const getPriority = (badge: any) => {
                const id = String(
                  badge?.id ||
                  badge?.key ||
                  ""
                ).toLowerCase();

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

              badges.sort(
                (a, b) =>
                  getPriority(a) -
                  getPriority(b)
              );

              newProfile.badges =
                badges;

              return newProfile;
            } catch (e) {
              return profile;
            }
          };

        unpatches.push(() => {
          UserProfileStore.getUserProfile =
            origGetProfile;
        });
      }
    } catch (e) {}
  }
} catch (e) {}
