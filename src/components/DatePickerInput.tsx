import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

interface Props {
  value: string;       // 'YYYY-MM-DD'
  onChange: (iso: string) => void;
  label?: string;
  minDate?: string;    // 'YYYY-MM-DD'
  maxDate?: string;
}

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function DatePickerInput({ value, onChange, label, minDate, maxDate }: Props) {
  const [show, setShow] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(parseISO(value));

  const dateObj = parseISO(value);

  function handleChange(_: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') {
      setShow(false);
      if (selected) onChange(toLocalISO(selected));
    } else {
      if (selected) setTempDate(selected);
    }
  }

  function confirmIOS() {
    onChange(toLocalISO(tempDate));
    setShow(false);
  }

  function openPicker() {
    setTempDate(parseISO(value));
    setShow(true);
  }

  const displayStr = dateObj.toLocaleDateString('en-CA', {
    year: 'numeric', month: 'short', day: 'numeric',
  });

  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity style={styles.button} onPress={openPicker} activeOpacity={0.7}>
        <Text style={styles.buttonText}>{displayStr}</Text>
        <Text style={styles.icon}>📅</Text>
      </TouchableOpacity>

      {/* Android: picker renders as OS dialog when show=true */}
      {Platform.OS === 'android' && show && (
        <DateTimePicker
          value={parseISO(value)}
          mode="date"
          display="default"
          onChange={handleChange}
          minimumDate={minDate ? parseISO(minDate) : undefined}
          maximumDate={maxDate ? parseISO(maxDate) : undefined}
        />
      )}

      {/* iOS: show in a modal with Done button */}
      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={styles.modalCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={confirmIOS}>
                  <Text style={styles.modalDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="inline"
                onChange={handleChange}
                minimumDate={minDate ? parseISO(minDate) : undefined}
                maximumDate={maxDate ? parseISO(maxDate) : undefined}
                style={styles.picker}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: '#64748B', marginTop: 12, marginBottom: 6 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#F8FAFC',
  },
  buttonText: { fontSize: 16, color: '#1E293B' },
  icon: { fontSize: 18 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingBottom: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F0' },
  modalCancel: { fontSize: 16, color: '#64748B' },
  modalDone: { fontSize: 16, color: '#2563EB', fontWeight: '700' },
  picker: { alignSelf: 'stretch' },
});
