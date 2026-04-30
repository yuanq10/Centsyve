import client from "./client";

export const getSummary = () => client.get("/dashboard/summary");

export const getTrends = (period = "monthly") =>
  client.get(`/dashboard/trends?period=${period}`);
