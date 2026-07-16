import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CategoryKey, CATEGORY_KEYS } from '../db/database';
import { t } from '../i18n';

interface Props {
  value: CategoryKey | null;
  onChange: (key: CategoryKey) => void;
}

export default function CategoryPicker({ value, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      {CATEGORY_KEYS.map((key) => {
        const selected = key === value;
        return (
          <TouchableOpacity
            key={key}
            style={[styles.chip, selected && styles.chipSelected]}
            onPress={() => onChange(key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
              {t(`categories.${key}`)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  chipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  chipText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
});
