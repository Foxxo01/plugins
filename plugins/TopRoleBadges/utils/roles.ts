import { findByStoreName } from "@vendetta/metro";

const GuildMemberStore = findByStoreName("GuildMemberStore");
const RoleStore = findByStoreName("RoleStore");

export function getTopRole(guildId: string, userId: string) {
  if (!guildId || !userId) return null;

  const member = GuildMemberStore?.getMember(guildId, userId);
  const guildRoles = RoleStore?.getRoles(guildId);

  if (!member || !member.roles || member.roles.length === 0 || !guildRoles) {
    return null;
  }

  const sortedRoles = member.roles
    .map((rId: string) => guildRoles[rId])
    .filter(Boolean)
    .sort((a: any, b: any) => b.position - a.position);

  return sortedRoles[0] || null;
}
