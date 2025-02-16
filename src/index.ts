import { customOctokit } from "@ubiquity-os/plugin-sdk/octokit";
import { handleComment } from "./handlers/run-demo";
import { Context } from "./types";
import { isCommentEvent } from "./types/typeguards";

export async function runPlugin(context: Context) {
  const { logger, eventName } = context;

  context.userOctokit = new customOctokit({
    auth: context.env.USER_GITHUB_TOKEN,
  });
  const { data: user } = await context.userOctokit.rest.users.getAuthenticated();
  context.userName = user.login;
  if (isCommentEvent(context)) {
    return await handleComment(context);
  }

  logger.error(`Unsupported event: ${eventName}`);
}
