import client from "./client";

export const getInsights = () => client.get("/ai/insights");

export const sendChatMessage = (message) => client.post("/ai/chat", { message });
