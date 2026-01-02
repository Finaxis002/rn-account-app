// components/ui/Dialog.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

export const Dialog = ({ open, onOpenChange, children }) => {
  const handleBackdropPress = () => {
    onOpenChange(false);
  };

  return (
    <Modal
      visible={open}
      transparent={true}
      animationType="fade"
      onRequestClose={() => onOpenChange(false)}
    >
      <TouchableOpacity
        activeOpacity={1}
        style={styles.overlay}
        onPress={handleBackdropPress}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardContainer}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.content}
            onPress={e => e.stopPropagation()}
          >
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => onOpenChange(false)}
            >
              <Icon name="x" size={20} color="#6b7280" />
            </TouchableOpacity>
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
};

export const DialogContent = ({ children, style, className }) => {
  return <View style={[styles.dialogContent, style]}>{children}</View>;
};

export const DialogHeader = ({ children, style }) => {
  return <View style={[styles.dialogHeader, style]}>{children}</View>;
};

export const DialogTitle = ({ children, style }) => {
  return <Text style={[styles.dialogTitle, style]}>{children}</Text>;
};

export const DialogDescription = ({ children, style }) => {
  return <Text style={[styles.dialogDescription, style]}>{children}</Text>;
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 8,
    maxWidth: 640,
    width: '100%',
    maxHeight: '80%',
    position: 'relative',
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 4,
  },
  dialogContent: {
    padding: 24,
  },
  dialogHeader: {
    marginBottom: 16,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  dialogDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
});
