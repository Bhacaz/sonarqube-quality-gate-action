import * as core from "@actions/core";
import * as github from "@actions/github";
import { buildReport, reportUrl } from "./modules/report";
import { ActionInputs } from "./modules/models";
import { fetchQualityGate } from "./modules/sonarqube-api";
import { trimTrailingSlash } from "./modules/utils";
import { findComment } from "./modules/find-comment/main";

(async () => {
  try {
    const inputs: ActionInputs = {
      hostURL: trimTrailingSlash(core.getInput("sonar-host-url")),
      projectKey: core.getInput("sonar-project-key"),
      token: core.getInput("sonar-token"),
      commentDisabled: core.getInput("disable-pr-comment") === "true",
      failOnQualityGateError:
        core.getInput("fail-on-quality-gate-error") === "true",
      githubToken: core.getInput("github-token"),
    };

    const { context } = github;
    const result = await fetchQualityGate(
      inputs.hostURL,
      inputs.projectKey,
      inputs.token,
      context.issue.number
    );

    core.setOutput("project-status", result.projectStatus.status);
    core.setOutput("quality-gate-result", JSON.stringify(result));

    const isPR = github.context.eventName == "pull_request";

    if (isPR && !inputs.commentDisabled) {
      if (!inputs.githubToken) {
        throw new Error(
          "`inputs.github-token` is required for result comment creation."
        );
      }

      const octokit = github.getOctokit(inputs.githubToken);

      const reportBody = buildReport(
        result,
        inputs.hostURL,
        inputs.projectKey,
        context
      );

      console.log("Finding comment associated with the report...");

      const issueComment = await findComment({
        token: inputs.githubToken,
        repository: `${context.repo.owner}/${context.repo.repo}`,
        issueNumber: context.issue.number,
        commentAuthor: "github-actions[bot]",
        bodyIncludes: "SonarQube Quality Gate",
        direction: "first",
      });

      if (issueComment) {
        console.log("Found existing comment, updating with the latest report.");

        await octokit.rest.issues.updateComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          issue_number: context.issue.number,
          comment_id: issueComment.id,
          body: reportBody,
        });
      } else {
        console.log("Report comment does not exist, creating a new one.");

        await octokit.rest.issues.createComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          issue_number: context.issue.number,
          body: reportBody,
        });
      }
    }

    let resultMessage = `Quality gate status for \`${inputs.projectKey}\` returned \`${result.projectStatus.status}\``;
    resultMessage += `\nDetails: ${reportUrl(inputs.hostURL, inputs.projectKey, context)}`
    if (
      inputs.failOnQualityGateError &&
      result.projectStatus.status === "ERROR"
    ) {
      core.setFailed(resultMessage);
    } else {
      core.notice(resultMessage);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
      core.setFailed(error.message);
    } else {
      console.error("Unexpected error");
      core.setFailed("Unexpected error");
    }
  }
})();
