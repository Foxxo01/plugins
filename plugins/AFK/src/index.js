import { storage } from "@vendetta/plugin";
import { findByProps, findByStore } from "@vendetta/metro";

storage.enabled ??= true;
storage.message ??= "Şu an AFK'yım, en kısa sürede dönüş yapacağım.";
storage.cooldowns ??= {};

let unsubscribe;

export default {
  onLoad: () => {
    try {
      const Dispatcher = findByProps("dispatch", "subscribe");
      const UserStore = findByStore("UserStore");
      const MessageActions = findByProps("sendMessage");

      if (!Dispatcher) return;

      const handleMessage = (e) => {
        try {
          if (!storage.enabled) return;

          const currentUser = UserStore?.getCurrentUser();
          const msg = e?.message;

          if (!msg || !currentUser || msg.author?.id === currentUser.id) return;

          const myId = currentUser.id;
          const mentions = Array.isArray(msg.mentions) ? msg.mentions : [];
          
          const isMentioned = mentions.some((u) => u.id === myId) || 
                              (msg.content && (msg.content.includes(`<@${myId}>`) || msg.content.includes(`<@!${myId}>`)));

          if (isMentioned) {
            const channelId = msg.channel_id;
            const now = Date.now();

            if (storage.cooldowns[channelId] && now - storage.cooldowns[channelId] < 15000) {
              return;
            }

            storage.cooldowns[channelId] = now;

            if (MessageActions?.sendMessage) {
              MessageActions.sendMessage(channelId, {
                content: `<@${msg.author.id}> ${storage.message}`,
                tts: false,
                invalidEmojis: [],
                validNonShortcutEmojis: []
              });
            }
          }
        } catch (err) {}
      };

      Dispatcher.subscribe("MESSAGE_CREATE", handleMessage);

      unsubscribe = () => {
        try {
          Dispatcher.unsubscribe("MESSAGE_CREATE", handleMessage);
        } catch (err) {}
      };
    } catch (err) {}
  },

  onUnload: () => {
    if (unsubscribe) unsubscribe();
  }
};
