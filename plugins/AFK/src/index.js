import { storage } from "@vendetta/plugin";
import { findByProps, findByStore, findByTypeName } from "@vendetta/metro";
import { React } from "@vendetta/metro/common";

storage.enabled ??= false;
storage.message ??= "Şu an AFK'yım, en kısa sürede dönüş yapacağım.";
storage.lastSent ??= {};

let unpatchMessage;

function AFKSettingsModal() {
  const [enabled, setEnabled] = React.useState(Boolean(storage.enabled));
  const [message, setMessage] = React.useState(String(storage.message));

  const Forms = findByProps("FormSwitch", "FormRow") || {};
  const FormSwitch = Forms.FormSwitch || findByTypeName("FormSwitch");
  const FormInput = Forms.FormInput || findByTypeName("FormInput");
  const FormSection = Forms.FormSection || findByTypeName("FormSection");
  const ScrollView = findByProps("ScrollView")?.ScrollView || React.Fragment;

  return React.createElement(
    ScrollView,
    { style: { flex: 1, padding: 16 } },
    FormSection && React.createElement(
      FormSection,
      { title: "AFK DURUMU" },
      FormSwitch && React.createElement(FormSwitch, {
        label: "AFK Modunu Aktif Et",
        subLabel: "Etiketlendiğinde otomatik mesaj gönderir.",
        value: enabled,
        onValueChange: (val) => {
          setEnabled(val);
          storage.enabled = val;
        }
      })
    ),
    FormSection && React.createElement(
      FormSection,
      { title: "OTOMATİK YANIT MESAJI" },
      FormInput && React.createElement(FormInput, {
        title: "AFK Mesajı",
        value: message,
        onChange: (val) => {
          setMessage(val);
          storage.message = val;
        },
        placeholder: "AFK mesajınızı yazın..."
      })
    )
  );
}

export default {
  onLoad: () => {
    try {
      const Dispatcher = findByProps("dispatch", "subscribe");
      const UserStore = findByStore("UserStore");
      const MessageActions = findByProps("sendMessage");
      const NonceModule = findByProps("getSnowflake") || findByProps("generateNonce");

      if (!Dispatcher) return;

      const handleMessage = (e) => {
        try {
          if (!storage.enabled) return;

          const currentUser = UserStore?.getCurrentUser();
          const msg = e?.message;

          if (!msg || !currentUser) return;
          if (msg.author?.id === currentUser.id) return;

          const myId = currentUser.id;
          const isMentionedArray = msg.mentions?.some((u) => u.id === myId);
          const isMentionedText = msg.content?.includes(`<@${myId}>`) || msg.content?.includes(`<@!${myId}>`);

          if (isMentionedArray || isMentionedText) {
            const channelId = msg.channel_id;
            const now = Date.now();

            if (storage.lastSent[channelId] && now - storage.lastSent[channelId] < 10000) {
              return;
            }

            storage.lastSent[channelId] = now;

            const nonce = NonceModule?.getSnowflake ? NonceModule.getSnowflake() : String(BigInt(Date.now() - 1420070400000) << 22n);
            const contentText = `<@${msg.author.id}> ${storage.message}`;

            if (MessageActions?.sendMessage) {
              MessageActions.sendMessage(channelId, {
                content: contentText,
                tts: false,
                invalidEmojis: [],
                validNonShortcutEmojis: []
              }, false, {
                nonce: nonce,
                isPending: false
              });
            }
          }
        } catch (err) {}
      };

      Dispatcher.subscribe("MESSAGE_CREATE", handleMessage);

      unpatchMessage = () => {
        try {
          Dispatcher.unsubscribe("MESSAGE_CREATE", handleMessage);
        } catch (err) {}
      };
    } catch (err) {}
  },

  onUnload: () => {
    if (unpatchMessage) {
      unpatchMessage();
    }
  },

  settings: AFKSettingsModal
};
