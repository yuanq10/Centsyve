import client from "./client";

export const listGoals = () => client.get("/goals/");
export const createGoal = (data) => client.post("/goals/", data);
export const deleteGoal = (id) => client.delete(`/goals/${id}`);
export const getGoalAnalysis = (id) => client.get(`/goals/${id}/analysis`);
export const getGoalAIAdvice = (id) => client.get(`/goals/${id}/ai-advice`);
