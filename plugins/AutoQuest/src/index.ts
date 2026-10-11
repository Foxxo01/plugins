import { findByStoreName, findByProps } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import { ReactNative as RN } from "@vendetta/metro/common";
import { Forms } from "@vendetta/ui";

const { ScrollView, View, Text } = RN;
const { FormRow, FormSwitch, FormSection } = Forms;

const QuestStore = findByStoreName("QuestStore") || findByProps("quests");

// Ayarlar Sayfası Arayüzü
function CahitSettings() {
    const [enabled, setEnabled] = React.useState(storage.autoQuestEnabled ?? true);

    return (
        <ScrollView>
            <FormSection title="Cahit Special - Otomatik Görev Ayarları">
                <FormRow
                    label="Otomatik Görevleri Etkinleştir"
                    subLabel="Görevleri arka planda otomatik algılar ve tamamlar."
                    trailing={
                        <FormSwitch
                            value={enabled}
                            onValueChange={(val) => {
                                storage.autoQuestEnabled = val;
                                setEnabled(val);
                            }}
                        />
                    }
                />
            </FormSection>
        </ScrollView>
    );
}

export default {
    onLoad() {
        console.log("Cahit Special: Otomatik Quest (Görev) Takipçisi Aktif.");

        if (storage.autoQuestEnabled === undefined) {
            storage.autoQuestEnabled = true;
        }

        this.checkAvailableQuests();
    },

    checkAvailableQuests() {
        if (!storage.autoQuestEnabled) return;

        try {
            const quests = QuestStore?.quests || QuestStore?.getQuests?.();
            if (quests) {
                console.log("Mevcut görevler taranıyor...", quests);
            }
        } catch (e) {
            console.error("Quest tarama hatası:", e);
        }
    },

    // Revenge ayarlar menüsüne entegrasyon
    settings: CahitSettings,

    onUnload() {
        console.log("Cahit Special: Quest eklentisi kaldırıldı.");
    }
};
