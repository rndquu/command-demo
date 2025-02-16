import { Context as PluginContext } from "@ubiquity-os/plugin-sdk";
import { customOctokit } from "@ubiquity-os/plugin-sdk/octokit";
import { Env } from "./env";
import { PluginSettings } from "./plugin-input";

export type SupportedEvents = "issue_comment.created";

export type Context<T extends SupportedEvents = SupportedEvents> = PluginContext<PluginSettings, Env, null, T> & {
  userOctokit: InstanceType<typeof customOctokit>;
  userName: string;
};
