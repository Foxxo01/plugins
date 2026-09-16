import { React } from "@vendetta/metro/common";
import { Forms } from "@vendetta/ui/components";

const { FormText } = Forms;

export default function Settings() {
  return (
    <FormText style={{ padding: 15, color: "#aaa" }}>
      Eklenti aktif. Ekrandaki herhangi bir yazıya basılı tutarak içeriğini doğrudan değiştirebilirsin.
    </FormText>
  );
}
