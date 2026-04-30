import client from "./client";

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

export const listTransactions = () => client.get("/transactions/");
