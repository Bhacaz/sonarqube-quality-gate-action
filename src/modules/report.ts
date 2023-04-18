import { Context } from "@actions/github/lib/context";
import { Condition, QualityGate } from "./models";
import {
  formatMetricKey,
  getStatusEmoji,
  getComparatorSymbol,
  trimTrailingSlash,
  formatStringNumber,
  getCurrentDateTime,
} from "./utils";

const buildRow = (condition: Condition) => {
  const rowValues = [
    formatMetricKey(condition.metricKey), // Metric
    getStatusEmoji(condition.status), // Status
    formatStringNumber(condition.actualValue), // Value
    `${getComparatorSymbol(condition.comparator)} ${condition.errorThreshold}`, // Error Threshold
  ];

  return "|" + rowValues.join("|") + "|";
};

export const reportUrl = (
  hostURL: string,
  projectKey: string,
  context: Context
) => {
  return trimTrailingSlash(hostURL) + `/dashboard?id=${projectKey}&pullRequest=${context.issue.number}`;
}

export const buildReport = (
  result: QualityGate,
  hostURL: string,
  projectKey: string,
  context: Context
) => {
  const projectStatus = getStatusEmoji(result.projectStatus.status);

  const resultTable = result.projectStatus.conditions.map(buildRow).join("\n");

  const { value: updatedDate, offset: updatedOffset } = getCurrentDateTime();

  return `SonarQube Quality Gate
  <details>
<summary>
  Result ${projectStatus}
</summary>

| Metric | Status | Value | Error Threshold |
|:------:|:------:|:-----:|:---------------:|
${resultTable}

[View on SonarQube](${reportUrl(hostURL, projectKey, context)})
###### _updated: ${updatedDate} (${updatedOffset})_
</details>
`;
};
