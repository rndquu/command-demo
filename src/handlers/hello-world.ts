import { Context } from "../types";

async function setLabels({ payload, octokit }: Context) {
  const repo = payload.repository.name;
  const issueNumber = "issue" in payload ? payload.issue.number : payload.pull_request.number;
  const owner = payload.repository.owner.login;
  await octokit.rest.issues.removeAllLabels({
    owner,
    repo,
    issue_number: issueNumber,
  });
  await octokit.rest.issues.addLabels({
    owner,
    repo,
    issue_number: issueNumber,
    labels: ["Priority: 1 (Normal)", "Time: <1 Hour", "Price: 12 USD"],
  });
}

async function createPullRequest({ payload, logger, userOctokit }: Context) {
  const sourceRepo = payload.repository.name;
  const sourceIssueNumber = "issue" in payload ? payload.issue.number : payload.pull_request.number;
  const sourceOwner = payload.repository.owner.login;

  const { data: user } = await userOctokit.rest.users.getAuthenticated();
  logger.info(`Creating fork for user: ${user.login}`);

  await userOctokit.rest.repos.createFork({
    owner: sourceOwner,
    repo: sourceRepo,
  });

  logger.debug("Waiting for the fork to be ready...");
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const { data: repoData } = await userOctokit.rest.repos.get({
    owner: sourceOwner,
    repo: sourceRepo,
  });
  const defaultBranch = repoData.default_branch;
  logger.debug("Repository data", { defaultBranch, repoUrl: repoData.html_url });
  const { data: refData } = await userOctokit.rest.git.getRef({
    owner: sourceOwner,
    repo: sourceRepo,
    ref: `heads/${defaultBranch}`,
  });
  const ref = `fix/${crypto.randomUUID()}`;

  await userOctokit.rest.git.createRef({
    owner: user.login,
    repo: sourceRepo,
    ref: `refs/heads/${ref}`,
    sha: refData.object.sha,
  });
  const { data: commit } = await userOctokit.rest.git.getCommit({
    owner: user.login,
    repo: sourceRepo,
    commit_sha: refData.object.sha,
  });
  const { data: newCommit } = await userOctokit.rest.git.createCommit({
    owner: user.login,
    repo: sourceRepo,
    message: "chore: empty commit",
    tree: commit.tree.sha,
    parents: [refData.object.sha],
  });
  await userOctokit.rest.git.updateRef({
    owner: user.login,
    repo: sourceRepo,
    ref: `heads/${ref}`,
    sha: newCommit.sha,
  });
  await userOctokit.rest.pulls.create({
    owner: sourceOwner,
    repo: sourceRepo,
    head: `${user.login}:${ref}`,
    base: defaultBranch,
    body: `Resolves #${sourceIssueNumber}`,
    title: ref,
  });
}

export async function handleComment(context: Context) {
  const { payload, userOctokit } = context;

  const repo = payload.repository.name;
  const issueNumber = "issue" in payload ? payload.issue.number : payload.pull_request.number;
  const owner = payload.repository.owner.login;
  const body = payload.comment.body;

  if (body.trim().startsWith("/demo")) {
    await setLabels(context);
    await userOctokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: "/start",
    });
    await userOctokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: "/ask Can you help me solving this task by showing the code I should change?",
    });
    await createPullRequest(context);
  }
}
