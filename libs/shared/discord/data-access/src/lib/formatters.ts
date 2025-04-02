import { writeToBuffer } from '@fast-csv/format';
import { AttachmentBuilder, bold, italic } from 'discord.js';

import { EMOJIS } from '@some-tools/shared/utils/common';
import { isFail, Result, ResultsStats } from '@some-tools/shared/utils/try-fail';

export const formatSimpleError = (message: string) => `${EMOJIS.circleRed} ${message}`;
export const formatSimpleSuccess = (message: string) => `${EMOJIS.circleGreen} ${message}`;
export const formatSimpleWarning = (message: string) => `${EMOJIS.circleYellow} ${message}`;

export const formatResultsStats = (stats: ResultsStats, newLineHelpTextToAppend = '') => {
  const okText = `Ok: ${stats.ok}/${stats.total}`;
  const failedText = `Failed: ${stats.failed}/${stats.total}`;

  return (
    [
      stats.ok > 0 ? formatSimpleSuccess(okText) : formatSimpleError(okText),
      stats.failed > 0 ? formatSimpleError(failedText) : formatSimpleSuccess(failedText),
    ]
      .map<string>((message) => bold(message))
      .join('\n') + (newLineHelpTextToAppend ? `\n${italic(newLineHelpTextToAppend)}` : '')
  );
};

/**
 * Takes an array of user input data objects and an array of corresponding {@link Result}s that match up by index and
 * makes a csv file attachment of the failed result messages alongside the input data that resulted in the failure.
 * @param userInputData The given data that has a {@link correspondingResults|corresponding result} at the same index.
 * @param correspondingResults The result that corresponds to the {@link userInputData} at the same index.
 */
export const failedResultMessagesWithInputsToCsvAttachment = async <FailT extends { message: string; _code?: string }>(
  userInputData: { [key: string]: unknown }[],
  correspondingResults: Result<unknown, FailT>[]
): Promise<AttachmentBuilder> => {
  const inputDataKeys = Object.keys(userInputData[0] || {});
  const headers = ['input_row_number', 'error_code', 'error', ...inputDataKeys.map((header) => `input_${header}`)];
  const rows: string[][] = [headers];

  correspondingResults.forEach((result, i) => {
    if (isFail(result)) {
      const inputObject = userInputData[i];
      // Get values in same order as keys used for the headers.
      const inputValues = inputDataKeys.map((key) => String(inputObject[key]));
      rows.push([String(i + 1), result.fault._code || 'N/A', result.fault.message, ...inputValues]);
    }
  });

  const csvBuffer = await writeToBuffer(rows);
  return new AttachmentBuilder(csvBuffer, { name: 'failed-results.csv' });
};
