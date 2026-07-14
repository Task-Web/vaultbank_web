const normalizeNamePart = (value) =>
  typeof value === 'string' ? value.trim() : '';

export const getUserDisplayName = (userProfile) => {
  const firstName = normalizeNamePart(userProfile?.first_name);
  const lastName = normalizeNamePart(userProfile?.last_name);

  return [firstName, lastName].filter(Boolean).join(' ') || 'Valued Customer';
};
