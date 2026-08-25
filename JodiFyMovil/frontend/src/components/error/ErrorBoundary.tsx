import React, { Component, ErrorInfo, ReactNode } from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { PressableFluid } from '../ui/PressableFluid';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showErrorDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    this.props.onError?.(error, errorInfo);
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container} accessibilityLiveRegion="assertive">
          <View style={styles.errorCard}>
            <View style={styles.iconWrapper}>
              <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
            </View>
            <Text style={styles.title}>Algo salió mal</Text>
            <Text style={styles.message}>
              La aplicación encontró un error inesperado. Tu música sigue sonando en segundo plano.
            </Text>
            {this.props.showErrorDetails && this.state.error && (
              <View style={styles.details}>
                <Text style={styles.detailsTitle}>Detalles del error:</Text>
                <Text style={styles.detailsText}>{this.state.error.message}</Text>
              </View>
            )}
            <View style={styles.actions}>
              <PressableFluid onPress={this.handleRetry} haptic="medium" style={styles.retryBtn}>
                <Ionicons name="refresh" size={18} color={colors.white} />
                <Text style={styles.retryBtnText}>Reintentar</Text>
              </PressableFluid>
              <PressableFluid
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    // eslint-disable-next-line react-native/no-unused-styles
                    require('react-native').NativeModules.DevSettings?.reload();
                  }
                }}
                haptic="light"
                style={styles.reloadBtn}
              >
                <Ionicons name="reload-circle" size={18} color={colors.primary} />
                <Text style={styles.reloadBtnText}>Recargar app</Text>
              </PressableFluid>
            </View>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030305',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorCard: {
    backgroundColor: '#0A0A10',
    borderWidth: 1,
    borderColor: 'rgba(255,61,92,0.3)',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    ...require('../../theme').elevation.level3,
  },
  iconWrapper: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#F5F5F7',
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    color: 'rgba(245,245,247,0.72)',
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  details: {
    backgroundColor: 'rgba(255,61,92,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,61,92,0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  detailsTitle: {
    color: '#FF3D5C',
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    marginBottom: 4,
  },
  detailsText: {
    color: 'rgba(255,61,92,0.9)',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 9999,
    backgroundColor: '#7F00FF',
    minWidth: 140,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  reloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 9999,
    backgroundColor: 'rgba(127,0,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(127,0,255,0.4)',
    minWidth: 140,
  },
  reloadBtnText: {
    color: '#7F00FF',
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
});

export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}