// hooks/useProfitLossData.js
import { useState, useEffect, useCallback } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProfitLossApiService from "../utils/profitLossApiService";
import { BASE_URL } from '../../config';

export const useProfitLossData = ({
  fromDate,
  toDate,
  companyId,
  clientId, // ADD THIS PARAMETER
  key, // Add key to force re-fetch
}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    // Don't fetch if no client is selected
    if (!clientId) {
      console.log("No client selected, skipping profit/loss fetch");
      setData(null);
      setLoading(false);
      return;
    }

    if (!fromDate || !toDate) {
      console.log("Missing date parameters, skipping fetch");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching profit loss data for:", { 
        fromDate, 
        toDate, 
        companyId, 
        clientId,
        key 
      });

      // Get token for authentication
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      // Clear any cached data before fetching
      await AsyncStorage.removeItem('profitLossCache');
      
      const result = await ProfitLossApiService.fetchProfitLossData({
        fromDate,
        toDate,
        companyId,
        clientId, // PASS CLIENT ID TO THE API SERVICE
      });

      console.log("Profit loss data fetched successfully:", {
        hasData: !!result,
        hasTradingData: !!result?.trading,
        hasSummary: !!result?.summary,
        netProfit: result?.summary?.netProfit
      });
      
      setData(result);
      
    } catch (err) {
      console.error("Error in useProfitLossData:", err);
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      
      // Set default data structure on error
      const defaultData = getDefaultProfitLossData();
      defaultData.success = false;
      defaultData.message = `Could not fetch profit loss data: ${errorMessage}`;
      setData(defaultData);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, companyId, clientId, key]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
};


const getDefaultProfitLossData = () => {
  return {
    success: false,
    message: "No data available",
    trading: {
      openingStock: 0,
      purchases: 0,
      sales: {
        total: 0,
        breakdown: {
          cash: 0,
          credit: 0,
          count: 0
        }
      },
      closingStock: 0,
      grossProfit: 0,
      grossLoss: 0
    },
    income: {
      breakdown: {
        productSales: {
          amount: 0,
          label: "Product Sales",
          count: 0,
          paymentMethods: {}
        },
        serviceIncome: {
          amount: 0,
          label: "Service Income",
          count: 0,
          paymentMethods: {}
        },
        receipts: {
          amount: 0,
          label: "Receipts",
          count: 0,
          paymentMethods: {}
        },
        otherIncome: []
      }
    },
    expenses: {
      total: 0,
      breakdown: {
        costOfGoodsSold: {
          amount: 0,
          label: "Cost of Goods Sold",
          count: 0,
          paymentMethods: {},
          components: {}
        },
        purchases: {
          amount: 0,
          label: "Purchases",
          count: 0,
          paymentMethods: {}
        },
        vendorPayments: {
          amount: 0,
          label: "Vendor Payments",
          count: 0,
          paymentMethods: {}
        },
        expensePayments: {
          amount: 0,
          label: "Expense Payments",
          count: 0,
          paymentMethods: {}
        },
        expenseBreakdown: []
      }
    },
    summary: {
      grossProfit: 0,
      netProfit: 0,
      totalIncome: 0,
      totalExpenses: 0,
      profitMargin: 0,
      netMargin: 0,
      expenseRatio: 0,
      isProfitable: false
    },
    quickStats: {
      totalTransactions: 0,
      averageSale: 0,
      averageExpense: 0
    }
  };
};

export default useProfitLossData;

