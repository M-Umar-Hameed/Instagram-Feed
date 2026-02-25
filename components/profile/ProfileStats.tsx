import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';

export interface StatItem {
  value: number;
  label: string;
  onPress?: () => void;
}

interface ProfileStatsProps {
  stats: StatItem[];
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

export const ProfileStats: React.FC<ProfileStatsProps> = ({ stats }) => {
  return (
    <View style={styles.container}>
      {stats.map((stat, index) => {
        const StatWrapper = stat.onPress ? TouchableOpacity : View;
        return (
          <StatWrapper
            key={`${stat.label}-${index}`}
            style={styles.statItem}
            onPress={stat.onPress}
            activeOpacity={stat.onPress ? 0.7 : 1}
          >
            <Text style={styles.statNumber}>{formatNumber(stat.value)}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </StatWrapper>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    paddingVertical: hp('1.5%'),
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: wp('5%'),
    fontWeight: '700',
    color: '#000',
    marginBottom: hp('0.3%'),
  },
  statLabel: {
    fontSize: wp('3.5%'),
    color: '#666',
  },
});


