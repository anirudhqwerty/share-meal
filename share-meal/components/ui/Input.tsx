import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, TextInputProps, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography } from '@/constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  hint?: string;
}

export function Input({
  label, error, leftIcon, rightIcon, onRightIconPress,
  containerStyle, hint, secureTextEntry, ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secureTextEntry);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[
        styles.inputRow,
        focused && styles.focused,
        error ? styles.errorBorder : null,
      ]}>
        {leftIcon && (
          <Ionicons name={leftIcon} size={18} color={focused ? Colors.primary : Colors.textMuted} style={styles.leftIcon} />
        )}
        <TextInput
          style={styles.input}
          placeholderTextColor={Colors.textMuted}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={hidden}
          {...props}
        />
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setHidden(!hidden)} style={styles.rightIcon}>
            <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
        {rightIcon && !secureTextEntry && (
          <TouchableOpacity onPress={onRightIconPress} style={styles.rightIcon}>
            <Ionicons name={rightIcon} size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
      {hint && !error && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: { ...Typography.label, color: Colors.text, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 14, minHeight: 50,
  },
  focused: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  errorBorder: { borderColor: Colors.error },
  leftIcon: { marginRight: 10 },
  rightIcon: { marginLeft: 10, padding: 2 },
  input: { flex: 1, ...Typography.bodyLg, color: Colors.text, paddingVertical: 12 },
  errorText: { ...Typography.caption, color: Colors.error, marginTop: 4 },
  hint: { ...Typography.caption, color: Colors.textMuted, marginTop: 4 },
});
