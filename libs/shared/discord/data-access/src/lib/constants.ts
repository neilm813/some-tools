export const MAX_NICKNAME_LENGTH = 32;
export const BULK_MESSAGE_DELETE_MAX = 100;

/**
 * When showing a modal, devs choose a `time` until it times out if it's not submitted, but after pressing submit, if
 * the bot bot doesn't reply before this amount of ms the modal will show 'Something went wrong. Try again.' after
 * which `modalSubmission.reply` will result in 'Unknown interaction'.
 *
 * The solution is to `modalSubmission.reply('processing')` then `modalSubmission.editReply('response')`
 */
export const DISCORD_MODAL_AFTER_SUBMIT_MS_UNTIL_ERROR = 2850;

export const MAX_MESSAGE_LENGTH = 2000;
