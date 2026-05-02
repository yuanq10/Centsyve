import client from "./client";
import { cacheTransactions } from "../services/offlineStorage";

export const scanReceipt = (imageUri, mimeType = "image/jpeg") => {
  const form = new FormData();
  form.append("file", {
    uri: imageUri,
    name: "receipt.jpg",
    type: mimeType,
  });
  return client.post("/transactions/scan", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const createTransaction = (data) => client.post("/transactions/", data);

export const listTransactions = async () => {
  const res = await client.get("/transactions/");
  await cacheTransactions(res.data);
  return res;
};

export const updateTransaction = (id, data) => client.put(`/transactions/${id}`, data);

export const deleteTransaction = (id) => client.delete(`/transactions/${id}`);
