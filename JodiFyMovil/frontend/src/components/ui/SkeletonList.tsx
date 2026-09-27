import React from 'react';
import { View, StyleProp, ViewStyle, StyleSheet } from 'react-native';
import { Skeleton } from './Skeleton';
import { radius } from '@theme';

interface SkeletonListProps {
  rows?: number;
  rowHeight?: number;
  spacing?: number;
  style?: StyleProp<ViewStyle>;
  showAvatar?: boolean;
  showTitle?: boolean;
  showSubtitle?: boolean;
}

export const SkeletonList = React.forwardRef<View, SkeletonListProps>(
  ({ rows = 8, rowHeight = 80, spacing = 8, style, showAvatar = true, showTitle = true, showSubtitle = true }, ref) => {
    return (
      <View ref={ref} style={[styles.container, style]}>
        {Array.from({ length: rows }).map((_, i) => (
          <View key={i} style={[styles.row, { marginBottom: spacing }]}>
            {showAvatar && (
              <Skeleton width={rowHeight} height={rowHeight} borderRadius={radius.sm} style={styles.avatar} />
            )}
            <View style={styles.textContainer}>
              {showTitle && <Skeleton width="60%" height={18} borderRadius={radius.xs} />}
              {showSubtitle && <Skeleton width="40%" height={14} borderRadius={radius.xs} style={styles.subtitle} />}
            </View>
          </View>
        ))}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    flexShrink: 0,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
  subtitle: {
    marginTop: 4,
  },
});

SkeletonList.displayName = 'SkeletonList';