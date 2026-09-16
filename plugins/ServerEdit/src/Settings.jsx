import { React } from "@vendetta/metro/common";
import { storage } from "@vendetta/plugin";
import { Forms } from "@vendetta/ui/components";

const { FormInput, FormText } = Forms;

export default function Settings() {
  return (
    <>
      <FormInput
        label="Target Guild ID"
        value={storage.targetGuildId ?? ""}
        onChange={(v) => { storage.targetGuildId = v.trim(); }}
        placeholder="Sunucu ID'si girin"
      />
      <FormInput
        label="Boost Count"
        value={String(storage.boostCount ?? "999")}
        onChange={(v) => { storage.boostCount = Number(v) || 0; }}
        placeholder="999"
        keyboardType="numeric"
      />
      <FormInput
        label="Member Count"
        value={String(storage.memberCount ?? "50000")}
        onChange={(v) => { storage.memberCount = Number(v) || 0; }}
        placeholder="50000"
        keyboardType="numeric"
      />
      <FormInput
        label="Online Count"
        value={String(storage.onlineCount ?? "12500")}
        onChange={(v) => { storage.onlineCount = Number(v) || 0; }}
        placeholder="12500"
        keyboardType="numeric"
      />
      <FormText style={{ marginTop: 10, color: "red" }}>
        {storage.lastError ? `Son Hata: ${storage.lastError}` : "Hata Yok (Çalışıyor)"}
      </FormText>
    </>
  );
}
