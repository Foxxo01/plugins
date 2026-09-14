import { patcher, storage } from "@vendetta/plugin";
import { findByProps, findByStore } from "@vendetta/metro";
import { React } from "@vendetta/metro/common";
import { Forms, General } from "@vendetta/ui/components";
import { openModal } from "@vendetta/ui/modals";

const { FormRow, FormSwitch, FormInput, FormSection } = Forms;
const { ScrollView } = General;

const UserStore = findByStore("UserStore");
const MessageActions = findByProps("sendMessage");
const ActionSheetModule = findByProps("openLazy", "hideActionSheet");

// Storage varsayılanları
storage.enabled ??= false;
storage.message ??= "Şu an AFK'yım, en kısa sürede dönüş yapacağım.";
storage.lastSent ??= {};

let unpatchSheet;
let unpatchMessage;

// Modal Ayar Ekranı
function AFKSettingsModal() {
  const [enabled, setEnabled] = React.useState(storage.enabled);
  const [message, setMessage] = React.useState(storage.message);

  return React.createElement(
    ScrollView,
    { style: { flex: 1, padding: 16 } },
    React.createElement(
      FormSection,
      { title: "AFK DURUMU" },
      React.createElement(FormSwitch, {
        label: "AFK Modunu Aktif Et",
        subLabel: "Etiketlendiğinde otomatik mesaj gönderir.",
        value: enabled,
        onValueChange: (val) => {
          setEnabled(val);
          storage.enabled = val;
        }
      })
    ),
    React.createElement(
      FormSection,
      { title: "OTOMATİK YANIT MESAJI" },
      React.createElement(FormInput, {
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
    // 1. "4406" ID'li menüyü yakala ve AFK Ayarları butonunu yerleştir
    unpatchSheet = patcher.before("openLazy", ActionSheetModule, (args) => {
      const [componentPromise, key] = args;

      // Hem sayısal 4406 hem de string kontrolleri
      if (key === 4406 || key === "4406" || key === "SetCustomStatusActionSheet") {
        args[0] = async () => {
          const loaded = await componentPromise();
          return (props) => {
            const res = loaded(props);
            try {
              const children = res?.props?.children?.props?.children || res?.props?.children;
              if (Array.isArray(children)) {
                children.splice(
                  2, // "Özel durum belirle" seçeneğinin hemen altı
                  0,
                  React.createElement(FormRow, {
                    label: "AFK Ayarları",
                    subLabel: storage.enabled ? "Aktif" : "Devre Dışı",
                    onPress: () => {
                      ActionSheetModule.hideActionSheet();
                      openModal((modalProps) =>
                        React.createElement(AFKSettingsModal, modalProps)
                      );
                    }
                  })
                );
              }
            } catch (e) {
              console.error("[AFK Plugin] Patch hatası:", e);
            }
            return res;
          };
        };
      }
    });

    // 2. Etiketlenme Kontrolü
    const Dispatcher = findByProps("dispatch", "subscribe");
    const handleMessage = (e) => {
      if (!storage.enabled) return;

      const currentUser = UserStore.getCurrentUser();
      const msg = e.message;

      if (!msg || msg.author?.id === currentUser?.id) return;

      const isMentioned = msg.mentions?.some((u) => u.id === currentUser?.id);

      if (isMentioned) {
        const channelId = msg.channel_id;
        const now = Date.now();

        // 30 saniyelik spam engeli
        if (storage.lastSent[channelId] && now - storage.lastSent[channelId] < 30000) {
          return;
        }

        storage.lastSent[channelId] = now;

        MessageActions.sendMessage(channelId, {
          content: `<@${msg.author.id}> ${storage.message}`
        });
      }
    };

    Dispatcher.subscribe("MESSAGE_CREATE", handleMessage);

    unpatchMessage = () => {
      Dispatcher.unsubscribe("MESSAGE_CREATE", handleMessage);
    };
  },

  onUnload: () => {
    if (unpatchSheet) unpatchSheet();
    if (unpatchMessage) unpatchMessage();
  }
};
