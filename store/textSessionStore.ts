// store/textSessionStore.ts
import { create } from "zustand";
import type {
    TextMessage,
    TextSessionState,
} from "../hooks/useTextSessionReducer";

type Actions = {
    setInput: (text: string) => void;
    addMessage: (msg: TextMessage) => void;
    setTyping: (isTyping: boolean) => void;
    setEnding: (isEnding: boolean) => void;
    setMood: (mood: string) => void;
    setError: (err: string | null) => void;
    setStatus: (status: TextSessionState["status"]) => void;
    resetSession: () => void;
    openMemoryModal: (memory: TextMessage["memory"]) => void;
    closeMemoryModal: () => void;
};

export type TextSessionStore = TextSessionState & Actions;

const initialState: TextSessionState = {
    messages: [],
    transcript: "",
    input: "",
    isTyping: false,
    isEnding: false,
    currentMood: "",
    error: null,
    status: "initializing",
    isMemoryModalVisible: false,
    selectedMemory: null,
    turnCount: 0,
};

export const useTextSessionStore = create<TextSessionStore>((set) => ({
    ...initialState,
    setInput: (text) => set(() => ({ input: text })),
    addMessage: (msg) =>
        set((s) => ({
            messages: [...s.messages, msg],
            turnCount: msg.sender === "user" ? s.turnCount + 1 : s.turnCount,
            error: null,
        })),
    setTyping: (isTyping) => set(() => ({ isTyping })),
    setEnding: (isEnding) => set(() => ({ isEnding })),
    setMood: (currentMood) => set(() => ({ currentMood })),
    setError: (error) => set(() => ({ error })),
    setStatus: (status) => set(() => ({ status })),
    resetSession: () => set(() => ({ ...initialState, status: "idle" })),
    openMemoryModal: (memory) =>
        set(() => ({
            isMemoryModalVisible: true,
            selectedMemory: memory,
        })),
    closeMemoryModal: () =>
        set(() => ({
            isMemoryModalVisible: false,
            selectedMemory: null,
        })),
}));
