import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { X, Check, Search } from 'lucide-react-native';
import { colors } from '@/constants/colors';

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

interface SelectOption {
  code: string;
  name: string;
}

interface SearchableSelectProps {
  label: string;
  value: string;
  options: SelectOption[];
  onSelect: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}

/* -------------------------------------------------------------------------- */
/* COMPONENT                                                                  */
/* -------------------------------------------------------------------------- */

export const SearchableSelect = ({
  label,
  value,
  options,
  onSelect,
  placeholder,
  disabled = false,
}: SearchableSelectProps) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');

  // 1. Find the currently selected item to display on the main button
  const selectedItem = useMemo(
    () => options.find((opt) => opt.code === value),
    [options, value]
  );

  // 2. Filter options based on search input
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return options.filter(
      (opt) =>
        opt.name.toLowerCase().includes(q) || opt.code.toLowerCase().includes(q)
    );
  }, [options, search]);

  const handleOpen = () => {
    if (disabled) return;
    setSearch('');
    setModalVisible(true);
  };

  const handleSelect = (code: string) => {
    onSelect(code);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      {/* TRIGGER BUTTON */}
      <TouchableOpacity
        style={[styles.trigger, disabled && styles.disabledTrigger]}
        onPress={handleOpen}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.triggerText,
            !value && { color: '#999' },
            disabled && { color: '#888' },
          ]}
          numberOfLines={1}
        >
          {selectedItem ? `${selectedItem.name} (${selectedItem.code})` : placeholder}
        </Text>
      </TouchableOpacity>

      {/* SELECTION MODAL */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardView}
          >
            <View style={styles.sheet}>
              {/* HEADER */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Select {label}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                  <X size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* SEARCH INPUT */}
              <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                  <Search size={18} color="#999" style={{ marginRight: 8 }} />
                  <TextInput
                    placeholder="Search by name or code..."
                    style={styles.searchInput}
                    value={search}
                    onChangeText={setSearch}
                    autoFocus={Platform.OS !== 'web'}
                    clearButtonMode="while-editing"
                  />
                </View>
              </View>

              {/* LIST */}
              <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
                {/* NULL OPTION (Optional: to clear selection) */}
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => handleSelect('')}
                >
                  <Text style={[styles.optionName, { color: colors.primary }]}>
                    None / Clear Selection
                  </Text>
                </TouchableOpacity>

                {filtered.map((item) => {
                  const isSelected = item.code === value;
                  return (
                    <TouchableOpacity
                      key={item.code}
                      style={[styles.optionItem, isSelected && styles.optionItemSelected]}
                      onPress={() => handleSelect(item.code)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.optionName}>{item.name}</Text>
                        <Text style={styles.optionCode}>{item.code}</Text>
                      </View>
                      {isSelected && <Check size={20} color={colors.primary} />}
                    </TouchableOpacity>
                  );
                })}

                {filtered.length === 0 && (
                  <View style={styles.emptyResults}>
                    <Text style={{ color: '#999' }}>No matching results found</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
};

/* -------------------------------------------------------------------------- */
/* STYLES                                                                     */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  trigger: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.white,
    minHeight: 48,
    justifyContent: 'center',
  },
  disabledTrigger: {
    backgroundColor: '#f5f5f5',
  },
  triggerText: {
    fontSize: 15,
    color: colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    height: '100%',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '85%',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  closeBtn: {
    padding: 4,
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  optionItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionItemSelected: {
    backgroundColor: '#f0f7ff',
  },
  optionName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  optionCode: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  emptyResults: {
    padding: 40,
    alignItems: 'center',
  },
});