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
  containerStyle, hint, secureTextEntry, onFocus, onBlur, style, ...props
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
          {...props}
          accessibilityLabel={props.accessibilityLabel || label}
          style={[styles.input, style]}
          placeholderTextColor={Colors.textMuted}
          onFocus={(event) => { setFocused(true); onFocus?.(event); }}
          onBlur={(event) => { setFocused(false); onBlur?.(event); }}
          secureTextEntry={Boolean(secureTextEntry && hidden)}
        />
        {secureTextEntry && (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={hidden ? 'Show password' : 'Hide password'} onPress={() => setHidden(!hidden)} style={styles.rightIcon}>
            <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
        {rightIcon && !secureTextEntry && (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={label ? `${label} options` : 'Input options'} disabled={!onRightIconPress} onPress={onRightIconPress} style={styles.rightIcon}>
            <Ionicons name={rightIcon} size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>}
      {hint && !error && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: { ...Typography.label, color: Colors.text, marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.input,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, minHeight: 50,
  },
  focused: { borderColor: Colors.primary, backgroundColor: Colors.white },
  errorBorder: { borderColor: Colors.error },
  leftIcon: { marginRight: 10 },
  rightIcon: { marginLeft: 4, minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, minWidth: 0, ...Typography.bodyLg, color: Colors.text, paddingVertical: 12 },
  errorText: { ...Typography.caption, color: Colors.error, marginTop: 4 },
  hint: { ...Typography.caption, color: Colors.textMuted, marginTop: 4 },
});
