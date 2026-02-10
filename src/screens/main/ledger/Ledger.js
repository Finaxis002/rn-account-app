import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import React, { useState } from 'react';
import PayablesScreen from './PayablesScreen';
import ReceivablesScreen from './ReceivablesScreen';
import { useCompany } from '../../../contexts/company-context';
export default function Ledger() {
  const [activeTab, setActiveTab] = useState('payables');
  const { triggerCompaniesRefresh } = useCompany();

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'payables' && styles.activeTabButton,
          ]}
          onPress={() => setActiveTab('payables')}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'payables' && styles.activeTabButtonText,
            ]}
          >
            Payables
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'receivables' && styles.activeTabButton,
          ]}
          onPress={() => setActiveTab('receivables')}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'receivables' && styles.activeTabButtonText,
            ]}
          >
            Receivables
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.contentArea}>
        <View
          style={{
            display: activeTab === 'payables' ? 'flex' : 'none',
            flex: 1,
          }}
        >
          <PayablesScreen />
        </View>
        <View
          style={{
            display: activeTab === 'receivables' ? 'flex' : 'none',
            flex: 1,
          }}
        >
          <ReceivablesScreen />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: '#f5f5f5',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 8,
    padding: 4,
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTabButton: {
    backgroundColor: '#007AFF',
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  activeTabButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  contentArea: {
    flex: 1,
    paddingHorizontal: 16,
    marginTop: 16,
  },
});
