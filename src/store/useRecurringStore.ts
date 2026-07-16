import { create } from 'zustand';
import { RecurringRule } from '../db/database';
import {
  getAllRules,
  createRule,
  updateRule,
  togglePause,
  deleteRule,
  CreateRecurringInput,
} from '../db/recurring';
import { deleteTransactionsByRecurringId } from '../db/transactions';
import { useTransactionStore } from './useTransactionStore';

interface RecurringStore {
  rules: RecurringRule[];
  load: () => void;
  add: (input: CreateRecurringInput) => void;
  update: (id: number, input: Partial<CreateRecurringInput>) => void;
  pause: (id: number, paused: boolean) => void;
  remove: (id: number, deletePosted: boolean) => void;
}

export const useRecurringStore = create<RecurringStore>((set) => ({
  rules: [],
  load: () => {
    set({ rules: getAllRules() });
  },
  add: (input) => {
    createRule(input);
    set({ rules: getAllRules() });
  },
  update: (id, input) => {
    updateRule(id, input);
    set({ rules: getAllRules() });
  },
  pause: (id, paused) => {
    togglePause(id, paused);
    set({ rules: getAllRules() });
  },
  remove: (id, deletePosted) => {
    if (deletePosted) {
      deleteTransactionsByRecurringId(id);
      useTransactionStore.getState().load();
    }
    deleteRule(id);
    set({ rules: getAllRules() });
  },
}));
