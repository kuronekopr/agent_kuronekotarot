import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

export const MarketingOpsStateAnnotation = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (x, y) => x.concat(y),
        default: () => [],
    }),
    next: Annotation<string>({
        reducer: (x, y) => y ?? x,
        default: () => "supervisor",
    }),
    report: Annotation<string | undefined>({
        reducer: (x, y) => y ?? x,
        default: () => undefined,
    }),
    creative_content: Annotation<string | undefined>({
        reducer: (x, y) => y ?? x,
        default: () => undefined,
    }),
    community_content: Annotation<string | undefined>({
        reducer: (x, y) => y ?? x,
        default: () => undefined,
    }),
    review_status: Annotation<string | undefined>({
        reducer: (x, y) => y ?? x,
        default: () => "pending",
    })
});

export type MarketingOpsState = typeof MarketingOpsStateAnnotation.State;
