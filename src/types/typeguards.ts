import { Context } from "./context";

export function isCommentEvent(context: Context): context is Context<"issue_comment.created"> {
  return context.eventName === "issue_comment.created";
}
