import { findByProps } from "@vendetta/metro";

const View = findByProps("View")?.View || "View";
const Text = findByProps("Text")?.Text || "Text";
const Image = findByProps("Image")?.Image || "Image";

export function createRoleTagElement(topRole: any) {
  const roleColorHex = topRole.color
    ? `#${topRole.color.toString(16).padStart(6, "0")}`
    : "#b9bbbe";

  return {
    $$typeof: Symbol.for("react.element"),
    type: View,
    key: `custom-role-tag-${topRole.id}`,
    props: {
      style: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: `${roleColorHex}20`,
        borderColor: roleColorHex,
        borderWidth: 1,
        borderRadius: 4,
        paddingHorizontal: 4,
        paddingVertical: 1,
        marginLeft: 6
      },
      children: [
        topRole.icon && {
          $$typeof: Symbol.for("react.element"),
          type: Image,
          key: "role-icon",
          props: {
            source: { uri: `https://cdn.discordapp.com/role-icons/${topRole.id}/${topRole.icon}.png` },
            style: { width: 12, height: 12, marginRight: 3 }
          }
        },
        {
          $$typeof: Symbol.for("react.element"),
          type: Text,
          key: "role-text",
          props: {
            style: {
              color: roleColorHex,
              fontSize: 10,
              fontWeight: "bold"
            },
            children: topRole.name
          }
        }
      ].filter(Boolean)
    }
  };
}
