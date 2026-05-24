/** Build i18n key for a collective type's display label. */
export function collectiveTypeI18nKey(typeName: string): string {
	const slug = typeName.toLowerCase().replace(/\s+/g, "_");
	return `collectives.types.${slug}`;
}
