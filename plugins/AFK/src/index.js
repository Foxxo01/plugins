// index.js (Güncellenmiş onLoad kısmı)
onLoad: () => {
  unpatchSheet = patcher.before("openLazy", ActionSheetModule, (args) => {
    const [componentPromise, key] = args;

    if (key == 4406 || key === "SetCustomStatusActionSheet") {
      args[0] = async () => {
        const loaded = await componentPromise();
        return function (props) {
          try {
            const res = loaded(props);
            
            // Bileşen ağacını güvenli bir şekilde tara
            const targetArray = res?.props?.children?.props?.children || res?.props?.children;
            
            if (Array.isArray(targetArray)) {
              // Menünün çökmemesi için öğeyi splice yerine push/concat ile güvenli ekle
              targetArray.push(
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
            return res;
          } catch (err) {
            console.error("[AFK Plugin Render Error]", err);
            // Hata durumunda menünün çökmesini engelleyip orijinal menüyü döndür
            return loaded(props);
          }
        };
      };
    }
  });
  
  // (Mesaj dinleyici kısmı aynı kalıyor)
}
