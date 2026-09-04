import { findByProps, findByName } from "@vendetta/metro";
import { constants, React, ReactNative as RN } from "@vendetta/metro/common";
import { getAssetByName } from "@vendetta/ui/assets";
import { after, instead } from "@vendetta/patcher";
import { showConfirmationAlert } from "@vendetta/ui/alerts";
import { storage } from "@vendetta/plugin";

import HiddenChannel from "./HiddenChannel.tsx";
import AlertContent from "./AlertContent.tsx";
import { Settings } from "./settings.tsx";

const Permissions = findByProps("getChannelPermissions", "can");
const { ChannelTypes } = findByProps("ChannelTypes");
const { getChannel } = findByProps("getChannel") || findByName("getChannel", false);

const skipChannels = [ChannelTypes.DM, ChannelTypes.GROUP_DM, ChannelTypes.GUILD_CATEGORY];

function isHidden(channel: any | undefined) {
  if (channel === undefined) return false;
  if (typeof channel === "string") channel = getChannel(channel);
  if (!channel || skipChannels.includes(channel.type)) return false;
  channel.realCheck = true;
  const res = !Permissions.can(constants.Permissions.VIEW_CHANNEL, channel);
  delete channel.realCheck;
  return res;
}

const unpatches: (() => void)[] = [];

export default {
  onLoad: () => {
    storage.showIcon ??= true;
    storage.showPopup ??= true;

    const UserProfileStore = findByProps("getUserProfile");
    const UserStore = findByProps("getCurrentUser");

    // Rozetleri İstemci Taraflı Ekleme
    if (UserProfileStore && UserStore) {
      const originalGetUserProfile = UserProfileStore.getUserProfile;
      UserProfileStore.getUserProfile = function (userId: string) {
        const profile = originalGetUserProfile.apply(this, arguments);
        const currentUser = UserStore.getCurrentUser();

        if (profile && userId === currentUser?.id) {
          if (!profile.badges) profile.badges = [];

          const customBadges = [
            {
              id: "staff",
              description: "Discord Personeli",
              icon: "5e74e9b61934fc1f67c65515d1f7e60d",
              link: "https://discord.com/company",
            },
            {
              id: "bug_hunter",
              description: "Discord Bug Hunter",
              icon: "https://cdn.discordapp.com/badge-icons/2717692c7dca7289b35297368a940dd0.png",
            },
          ];

          customBadges.forEach((badge) => {
            if (!profile.badges.some((b: any) => b.id === badge.id)) {
              profile.badges.unshift(badge);
            }
          });
        }
        return profile;
      };
    }

    const ChannelMessages = findByProps("ChannelMessages") || findByName("ChannelMessages", false);
    if (!ChannelMessages) {
      console.error("Hidden Channels plugin: 'ChannelMessages' module not found.");
      return;
    }

    unpatches.push(
      after("can", Permissions, ([permID, channel], res) => {
        if (!channel?.realCheck && permID === constants.Permissions.VIEW_CHANNEL) return true;
        return res;
      })
    );

    const transitionToGuild = findByProps("transitionToGuild");
    if (transitionToGuild) {
      for (const key of Object.keys(transitionToGuild)) {
        if (typeof transitionToGuild[key] === "function") {
          unpatches.push(
            instead(key, transitionToGuild, (args, orig) => {
              if (typeof args[0] === "string") {
                const pathMatch = args[0].match(/(\d+)$/);
                if (pathMatch?.[1]) {
                  const channelId = pathMatch[1];
                  const channel = getChannel(channelId);
                  if (channel && isHidden(channel)) {
                    if (storage.showPopup) {
                      showConfirmationAlert({
                        title: "This channel is hidden.",
                        content: React.createElement(AlertContent, { channel }),
                        confirmText: "View Anyway",
                        cancelText: "Cancel",
                        onConfirm: () => {
                          return orig(...args);
                        },
                      });
                    } else {
                      return orig(...args);
                    }
                    return {};
                  }
                }
              }
              return orig(...args);
            })
          );
        }
      }
    }

    const ChannelInfo = findByName("ChannelInfo", false);
    if (ChannelInfo && storage.showIcon) {
      unpatches.push(
        after("default", ChannelInfo, ([{ channel }], ret) =>
          React.createElement(
            React.Fragment,
            {},
            channel && isHidden(channel)
              ? React.createElement(RN.Image, {
                  source: getAssetByName("ic_lock")?.id,
                  style: { width: 20, height: 20, marginRight: 4 },
                })
              : null,
            ret
          )
        )
      );
    }
  },
  onUnload: () => {
    for (const unpatch of unpatches) unpatch();
  },
  settings: Settings,
};
