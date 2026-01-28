import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  ChevronRight,
  Loader2,
  IndianRupee,
  ArrowUpRight,
  ArrowDownLeft,
  Minus,
  CreditCard
} from 'lucide-react-native';

// Import components
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { BASE_URL } from '../../config';

// Premium Badge Component
const Badge = ({ children, variant = 'default', style }) => {
  const badgeStyles = [
    styles.badge,
    variant === 'secondary' && styles.badgeSecondary,
    variant === 'destructive' && styles.badgeDestructive,
    style
  ];
  
  return (
    <View style={badgeStyles}>
      {typeof children === 'string' ? <Text style={styles.badgeText}>{children}</Text> : children}
    </View>
  );
};

export function VendorExpenseList({
  currentView,
  vendors,
  expenses,
  expenseTotals,
  vendorBalances,
  loadingBalances,
  transactionTotals,
  loadingTotals,
  onSelect,
  selectedCompanyId,
  dateRange,
  formatCurrency
}) {
  const [vendorLastTransactionDates, setVendorLastTransactionDates] = useState({});
  const [expenseLastTransactionDates, setExpenseLastTransactionDates] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const itemsPerPage = 7;
  const baseURL = BASE_URL;

  // Calculate statistics
  const stats = useMemo(() => {
    if (currentView === 'vendor') {
      const settledVendors = vendors.filter(v => {
        const balance = vendorBalances[v._id];
        return balance !== undefined && balance === 0;
      }).length;

      const netBalance = transactionTotals.totalDebit - transactionTotals.totalCredit;

      return {
        totalVendors: vendors.length,
        totalExpenses: expenses.length,
        netBalance,
        totalExpenseAmount: Object.values(expenseTotals).reduce(
          (sum, amount) => sum + amount,
          0
        ),
        settledVendors,
        totalCredit: transactionTotals.totalCredit,
        totalDebit: transactionTotals.totalDebit,
      };
    } else {
      return {
        totalVendors: vendors.length,
        totalExpenses: expenses.length,
        netBalance: 0,
        totalExpenseAmount: Object.values(expenseTotals).reduce(
          (sum, amount) => sum + amount,
          0
        ),
        settledVendors: 0,
        totalCredit: 0,
        totalDebit: 0,
      };
    }
  }, [vendors, expenses, expenseTotals, vendorBalances, transactionTotals, selectedCompanyId, currentView]);

  // Fetch last transaction dates
  const fetchLastTransactionDates = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.error('Authentication token not found.');
        return;
      }

      const vendorLastDates = {};
      const expenseLastDates = {};

      const vendorPromises = vendors.map(async (vendor) => {
        try {
          const params = new URLSearchParams();
          params.append('vendorId', vendor._id);
          if (selectedCompanyId) params.append('companyId', selectedCompanyId);

          const response = await fetch(
            `${baseURL}/api/ledger/vendor-payables?${params.toString()}`,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            const allEntries = [...(data.debit || []), ...(data.credit || [])];
            if (allEntries.length > 0) {
              const mostRecentDate = allEntries.reduce((latest, entry) => {
                return new Date(entry.date) > new Date(latest)
                  ? entry.date
                  : latest;
              }, allEntries[0].date);
              vendorLastDates[vendor._id] = mostRecentDate;
            }
          }
        } catch (error) {
          console.error(`Error fetching last transaction date for vendor ${vendor._id}:`, error);
        }
      });

      const expensePromises = expenses.map(async (expense) => {
        try {
          const params = new URLSearchParams();
          params.append('expenseId', expense._id);
          if (selectedCompanyId) params.append('companyId', selectedCompanyId);

          const response = await fetch(
            `${baseURL}/api/ledger/expense-payables?${params.toString()}`,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            const allEntries = [...(data.debit || []), ...(data.credit || [])];
            if (allEntries.length > 0) {
              const mostRecentDate = allEntries.reduce((latest, entry) => {
                return new Date(entry.date) > new Date(latest)
                  ? entry.date
                  : latest;
              }, allEntries[0].date);
              expenseLastDates[expense._id] = mostRecentDate;
            }
          }
        } catch (error) {
          console.error(`Error fetching last transaction date for expense ${expense._id}:`, error);
        }
      });

      await Promise.all([...vendorPromises, ...expensePromises]);
      setVendorLastTransactionDates(vendorLastDates);
      setExpenseLastTransactionDates(expenseLastDates);
    } catch (error) {
      console.error('Error fetching last transaction dates:', error);
    }
  };

  useEffect(() => {
    fetchLastTransactionDates();
  }, [vendors, expenses, selectedCompanyId, currentView]);

  const getBalanceVariant = (amount) => {
    if (amount < 0) return 'destructive';
    if (amount > 0) return 'default';
    return 'secondary';
  };

  const getBalanceIcon = (amount) => {
    if (amount < 0) return <ArrowUpRight size={12} color="#ef4444" strokeWidth={2.5} />;
    if (amount > 0) return <ArrowDownLeft size={12} color="#10b981" strokeWidth={2.5} />;
    return <Minus size={12} color="#64748b" strokeWidth={2.5} />;
  };

  const getBalanceText = (amount) => {
    if (amount < 0) return 'You Owe';
    if (amount > 0) return 'Advance';
    return 'Settled';
  };

  const getBalanceColor = (amount) => {
    if (amount < 0) return '#ef4444';
    if (amount > 0) return '#10b981';
    return '#64748b';
  };

  const getNetBalanceConfig = (netBalance) => {
    if (netBalance < 0) {
      return {
        title: 'Net Payable',
        subtitle: 'Total amount you owe',
        icon: TrendingUp,
        trend: 'down',
        cardBorderColor: '#fecaca',
        textColor: '#dc2626',
        iconBgColor: '#fee2e2'
      };
    } else if (netBalance > 0) {
      return {
        title: 'Net Advance',
        subtitle: 'Total advance with vendors',
        icon: TrendingDown,
        trend: 'up',
        cardBorderColor: '#bbf7d0',
        textColor: '#16a34a',
        iconBgColor: '#dcfce7'
      };
    } else {
      return {
        title: 'Net Balance',
        subtitle: 'All accounts settled',
        icon: Minus,
        trend: 'neutral',
        cardBorderColor: '#e2e8f0',
        textColor: '#64748b',
        iconBgColor: '#dbeafe'
      };
    }
  };

  // ORIGINAL Stat Card (keeping the old design)
  const StatCard = ({ title, value, subtitle, icon: Icon, trend, cardBorderColor, loading, textColor, iconBgColor }) => {
    const borderStyle = cardBorderColor ? { borderColor: cardBorderColor } : {};
    const textStyle = textColor ? { color: textColor } : {};
    const iconBgStyle = iconBgColor ? { backgroundColor: iconBgColor } : {};

    return (
      <Card style={[styles.statCard, borderStyle]}>
        <CardContent style={styles.statContent}>
          <View style={styles.statRow}>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>{title}</Text>
              {loading ? (
                <ActivityIndicator size="small" color="#64748b" style={styles.statLoading} />
              ) : (
                <Text style={[styles.statValue, textStyle]}>{value}</Text>
              )}
              <Text style={styles.statSubtitle}>{subtitle}</Text>
            </View>
            <View style={[styles.statIconContainer, iconBgStyle]}>
              <Icon size={16} color={
                trend === 'up' ? '#16a34a' : 
                trend === 'down' ? '#dc2626' : '#2563eb'
              } />
            </View>
          </View>
        </CardContent>
      </Card>
    );
  };

  // Prepare items list
  const items = currentView === 'vendor'
    ? [...vendors].sort((a, b) => {
        const aDate = vendorLastTransactionDates[a._id];
        const bDate = vendorLastTransactionDates[b._id];
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      }).map(vendor => {
        let overallBalance = 0;
        if (!selectedCompanyId && vendor.balances) {
          for (const [companyId, balance] of Object.entries(vendor.balances)) {
            overallBalance += Number(balance || 0);
          }
        } else if (selectedCompanyId && vendorBalances[vendor._id] !== undefined) {
          overallBalance = vendorBalances[vendor._id];
        } else {
          overallBalance = vendor.balance || 0;
        }
        return {
          ...vendor,
          balance: overallBalance
        };
      })
    : [...expenses].sort((a, b) => {
        const aDate = expenseLastTransactionDates[a._id];
        const bDate = expenseLastTransactionDates[b._id];
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });

  const netBalanceConfig = getNetBalanceConfig(stats.netBalance);

  // Pagination
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = items.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [currentView]);

  const onRefreshList = async () => {
    setRefreshing(true);
    await fetchLastTransactionDates();
    setRefreshing(false);
  };

  const renderItem = ({ item }) => {
    const isVendor = currentView === 'vendor';
    const name = isVendor ? item.vendorName : item.name;
    const total = isVendor
      ? selectedCompanyId && vendorBalances[item._id] !== undefined
        ? vendorBalances[item._id]
        : item.balance || 0
      : expenseTotals[item._id] || 0;
    const id = item._id;
    const isLoading = loadingBalances && loadingBalances[id];
    const balanceColor = getBalanceColor(total);

    return (
      <TouchableOpacity
        style={styles.listItem}
        onPress={() => onSelect(id)}
        activeOpacity={0.7}
      >
        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <View style={[
              styles.itemIcon,
              isVendor
                ? total < 0 ? styles.iconRed :
                  total > 0 ? styles.iconGreen : styles.iconGray
                : styles.iconBlue
            ]}>
              {isVendor ? (
                <Users size={16} color={balanceColor} strokeWidth={2} />
              ) : (
                <FileText size={16} color="#3b82f6" strokeWidth={2} />
              )}
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={1}>{name}</Text>
              {isVendor && (
                <View style={styles.itemBalanceInfo}>
                  <Text style={[styles.balanceText, { color: balanceColor }]}>
                    {getBalanceText(total)}
                  </Text>
                  {!isLoading && total !== 0 && (
                    <View style={[
                      styles.balanceBadge, 
                      total < 0 ? styles.badgeRed :
                      total > 0 ? styles.badgeGreen : styles.badgeGray
                    ]}>
                      {getBalanceIcon(total)}
                      <Text style={[styles.balanceBadgeText, { color: balanceColor }]}>
                        {formatCurrency(Math.abs(total))}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.itemActions}>
            {!isVendor && (
              <View style={[styles.balanceBadge, styles.expenseBadge]}>
                <IndianRupee size={12} color="#3b82f6" strokeWidth={2.5} />
                <Text style={styles.expenseBadgeText}>{formatCurrency(total)}</Text>
              </View>
            )}
            <View style={styles.viewButton}>
              <ChevronRight size={18} color="#3b82f6" strokeWidth={2.5} />
            </View>
          </View>
        </View>
        
        {isVendor && isLoading && (
          <ActivityIndicator size="small" color="#3b82f6" style={styles.loadingIndicator} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefreshList}
            tintColor="#3b82f6"
            colors={['#3b82f6']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Cards - ORIGINAL DESIGN KEPT */}
        {currentView === 'vendor' ? (
          <View style={styles.statsGrid}>
            {/* Row 1 - First 2 boxes */}
            <StatCard
              title="Total Vendors"
              value={stats.totalVendors.toString()}
              subtitle={`${stats.settledVendors} settled`}
              icon={Users}
              trend="neutral"
              iconBgColor="#dbeafe"
            />
            <StatCard
              title={netBalanceConfig.title}
              value={formatCurrency(Math.abs(stats.netBalance))}
              subtitle={netBalanceConfig.subtitle}
              icon={netBalanceConfig.icon}
              trend={netBalanceConfig.trend}
              cardBorderColor={netBalanceConfig.cardBorderColor}
              textColor={netBalanceConfig.textColor}
              iconBgColor={netBalanceConfig.iconBgColor}
              loading={loadingTotals}
            />
            
            {/* Row 2 - Next 2 boxes */}
            <StatCard
              title="Total Credit"
              value={formatCurrency(stats.totalCredit)}
              subtitle="Payments made to vendors"
              icon={CreditCard}
              trend="up"
              loading={loadingTotals}
              cardBorderColor={stats.totalCredit > 0 ? '#bfdbfe' : '#e2e8f0'}
              iconBgColor="#dcfce7"
            />
            <StatCard
              title="Total Debit"
              value={formatCurrency(stats.totalDebit)}
              subtitle="All-time purchases made"
              icon={IndianRupee}
              trend="down"
              loading={loadingTotals}
              cardBorderColor={stats.totalDebit > 0 ? '#fed7aa' : '#e2e8f0'}
              iconBgColor="#fee2e2"
            />
          </View>
        ) : (
          <View style={[styles.statsGrid, styles.expenseStatsGrid]}>
            <StatCard
              title="Expense Categories"
              value={stats.totalExpenses.toString()}
              subtitle="Total categories"
              icon={FileText}
              trend="neutral"
              iconBgColor="#dbeafe"
            />
            <StatCard
              title="Total Expenses"
              value={formatCurrency(stats.totalExpenseAmount)}
              subtitle="Total amount spent"
              icon={TrendingUp}
              trend="neutral"
              iconBgColor="#e9d5ff"
            />
          </View>
        )}

        {/* Main List Card - PREMIUM DESIGN */}
        <View style={styles.mainCard}>
          <View style={styles.mainHeader}>
            <View style={styles.headerContent}>
              <View style={styles.headerIconContainer}>
                <View style={[
                  styles.headerIcon,
                  currentView === 'vendor' ? styles.headerIconGreen : styles.headerIconBlue
                ]}>
                  {currentView === 'vendor' ? (
                    <Users size={20} color={currentView === 'vendor' ? '#059669' : '#3b82f6'} strokeWidth={2} />
                  ) : (
                    <FileText size={20} color="#3b82f6" strokeWidth={2} />
                  )}
                </View>
                <View style={styles.headerText}>
                  <Text style={styles.mainTitle}>
                    {currentView === 'vendor' ? 'Vendors' : 'Expense Categories'}
                  </Text>
                  <Text style={styles.headerSubtitle}>
                    {currentView === 'vendor'
                      ? 'Manage vendor relationships & balances'
                      : 'Track expenses across categories'}
                  </Text>
                </View>
              </View>
              <Badge variant="secondary" style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>
                  {items.length}
                </Text>
              </Badge>
            </View>
          </View>

          <View style={styles.mainContent}>
            {items.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  {currentView === 'vendor' ? (
                    <Users size={36} color="#cbd5e1" strokeWidth={1.5} />
                  ) : (
                    <FileText size={36} color="#cbd5e1" strokeWidth={1.5} />
                  )}
                </View>
                <Text style={styles.emptyText}>
                  No {currentView === 'vendor' ? 'vendors' : 'expense categories'} found
                </Text>
                <Text style={styles.emptySubtext}>
                  {currentView === 'vendor'
                    ? 'Add vendors to start tracking balances'
                    : 'Create expense categories to organize spending'}
                </Text>
              </View>
            ) : (
              <>
                <FlatList
                  data={paginatedItems}
                  renderItem={renderItem}
                  keyExtractor={(item) => item._id}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                />

                {/* Pagination */}
                {items.length > itemsPerPage && (
                  <View style={styles.pagination}>
                    <Text style={styles.paginationText}>
                      Showing {startIndex + 1}-{Math.min(endIndex, items.length)} of {items.length}
                    </Text>
                    <View style={styles.paginationControls}>
                      <TouchableOpacity
                        onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        style={[styles.paginationButton, currentPage === 1 && styles.buttonDisabled]}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.paginationButtonText, currentPage === 1 && styles.buttonTextDisabled]}>
                          Previous
                        </Text>
                      </TouchableOpacity>
                      <View style={styles.pageNumberContainer}>
                        <Text style={styles.pageNumber}>
                          {currentPage}
                        </Text>
                        <Text style={styles.pageTotal}>of {totalPages}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        style={[styles.paginationButton, currentPage === totalPages && styles.buttonDisabled]}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.paginationButtonText, currentPage === totalPages && styles.buttonTextDisabled]}>
                          Next
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: -50
  },
  
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    padding: 2,
    paddingBottom: 8,
  },
  expenseStatsGrid: {
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%', 
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  statContent: {
    padding: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statInfo: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLoading: {
    height: 24,
  },
  statSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  mainCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginHorizontal: 2,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
    overflow: 'hidden',
  },
  mainHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#fafbfc',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  headerIconGreen: {
    backgroundColor: '#ecfdf5',
  },
  headerIconBlue: {
    backgroundColor: '#eff6ff',
  },
  headerText: {
    flex: 1,
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
  },
  headerBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.2,
  },
  // List Items - Premium Design
  mainContent: {
    backgroundColor: '#ffffff',
  },
  listItem: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
  },
  itemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  iconRed: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  iconGreen: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  iconGray: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  iconBlue: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  itemBalanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  balanceText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  balanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  badgeRed: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  badgeGreen: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  badgeGray: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  expenseBadge: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  balanceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  expenseBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1e40af',
    letterSpacing: 0.2,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  loadingIndicator: {
    marginTop: 12,
  },
  separator: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 20,
  },
  // Empty State - Premium Design
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  // Pagination - Premium Design
  pagination: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#fafbfc',
  },
  paginationText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
  },
  paginationControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  paginationButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    minWidth: 90,
    alignItems: 'center',
  },
  paginationButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
    letterSpacing: 0.2,
  },
  buttonTextDisabled: {
    color: '#cbd5e1',
  },
  pageNumberContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  pageNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  pageTotal: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  // Badge - Premium Design
  badge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  badgeSecondary: {
    backgroundColor: '#f1f5f9',
  },
  badgeDestructive: {
    backgroundColor: '#ef4444',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  buttonDisabled: {
    opacity: 0.4,
    backgroundColor: '#f8fafc',
  },
});