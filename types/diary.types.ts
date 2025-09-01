// types/diary.types.ts
export interface Message {
    text: string;
    isUser: boolean;
    timestamp: number;
    isQuestionContext?: boolean;
}

export type DiaryMode = "list" | "view" | "write";
