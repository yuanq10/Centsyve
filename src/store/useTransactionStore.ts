import { create } from 'zustand';
import { Transaction } from '../db/database';
import {
  getAllTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  CreateTransactionInput,
} from '../db/transactions';

interface TransactionStore {
  transactions: Transaction[];
  load: () => void;
  add: (input: CreateTransactionInput) => void;
  update: (id: number, input: Partial<Omit<CreateTransactionInput, 'recurring_id'>>) => void;
  remove: (id: number) => void;
}

export const useTransactionStore = create<TransactionStore>((set) => ({
  transactions: [],
  load: () => {
    set({ transactions: getAllTransactions() });
  },
  add: (input) => {
    createTransaction(input);
    set({ transactions: getAllTransactions() });
  },
  update: (id, input) => {
    updateTransaction(id, input);
    set({ transactions: getAllTransactions() });
  },
  remove: (id) => {
    deleteTransaction(id);
    set({ transactions: getAllTransactions() });
  },
}));
