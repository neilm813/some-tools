export type ParsedDiscordUserRowRecord = {
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
};

/**
 * Expects pasted rows from a google sheet which have new lines and tabs as delimiters.
 *
 * Validation will be done at the DB level when this is used from a discord command.
 * @param rawRows Rows pasted from google sheets into discord with **columns in this order: firstName, lastName, email**
 * @param roleIds Roles ids to be added to the parsed user object.
 */
export const parsePastedUserRows = (rawRows: string, roleIds: string[] = []): ParsedDiscordUserRowRecord[] =>
  rawRows.split('\n').map((row) => {
    const [firstName = '', lastName = '', email = ''] = row.trim().split('\t');
    return { firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), roles: roleIds };
  });

export const parseEmailRows = (rawRows: string) =>
  rawRows
    // Split on new line and commas just in case.
    .split(/\n|,/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
