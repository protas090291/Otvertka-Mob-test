import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '../components/Header';
import Card from '../components/Card';
import { Theme } from '../constants/Theme';
import { UserRole } from '../types';

interface BudgetScreenProps {
  navigation: any;
  route: any;
}

const BudgetScreen: React.FC<BudgetScreenProps> = ({ navigation, route }) => {
  const userRole: UserRole = route.params?.userRole || 'technadzor';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Theme.colors.background, Theme.colors.backgroundDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Header userRole={userRole} title="Бюджет" />
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <Card variant="gradient">
            <Text style={styles.sectionTitle}>Бюджет проекта</Text>
            <Text style={styles.comingSoon}>Функционал в разработке</Text>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Theme.spacing.md,
  },
  sectionTitle: {
    ...Theme.typography.h3,
    marginBottom: Theme.spacing.md,
  },
  comingSoon: {
    ...Theme.typography.body,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    padding: Theme.spacing.lg,
  },
});

export default BudgetScreen;
