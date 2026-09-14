import { storage } from "@vendetta/plugin";
import { findByProps, findByStore, findByTypeName } from "@vendetta/metro";
import { React } from "@vendetta/metro/common";

const UserStore = findByStore("UserStore");
const MessageActions = findByProps("sendMessage");
const Forms = findByProps("FormSwitch", "FormRow") || {};

const FormSwitch = Forms.FormSwitch || findByTypeName("FormSwitch");
const FormInput = Forms.FormInput || findByTypeName("FormInput");
const FormSection = Forms.FormSection || findByTypeName("FormSection");
const ScrollView = findByProps("ScrollView")?.ScrollView || React.Fragment;

storage.enabled ??= false;
storage.message ??= "Şu an AFK'yım, en kısa sürede dönüş yapacağım.";
storage.lastSent ??= {};

let unpatchMessage;

function AFKSettingsModal() {
  const [enabled, setEnabled] = React.useState(storage.enabled);
  const [message, setMessage] = React.useState(storage.message);

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
    const Dispatcher = findByProps("dispatch", "subscribe");
    if (!Dispatcher) return;

    const handleMessage = (e) => {
      if (!storage.enabled) return;

      const currentUser = UserStore?.getCurrentUser();
      const msg = e?.message;

      if (!msg || msg.author?.id === currentUser?.id) return;

      const isMentioned = msg.mentions?.some((u) => u.id === currentUser?.id);

      if (isMentioned) {
        const channelId = msg.channel_id;
        const now = Date.now();

        if (storage.lastSent[channelId] && now - storage.lastSent[channelId] < 30000) {
          return;
        }

        storage.lastSent[channelId] = now;

        if (MessageActions?.sendMessage) {
          MessageActions.sendMessage(channelId, {
            content: `<@${msg.author.id}> ${storage.message}`
          });
        }
      }
    };

    Dispatcher.subscribe("MESSAGE_CREATE", handleMessage);

    unpatchMessage = () => {
      Dispatcher.unsubscribe("MESSAGE_CREATE", handleMessage);
    };
  },

  onUnload: () => {
    if (unpatchMessage) unpatchMessage();
  },

  settings: AFKSettingsModal
};
