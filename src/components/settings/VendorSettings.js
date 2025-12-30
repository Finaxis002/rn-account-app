import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DocumentPicker from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import * as XLSX from 'xlsx';
import Toast from 'react-native-toast-message';
import {
  MoreHorizontal,
  PlusCircle,
  Building,
  Check,
  X,
  Phone,
  Mail,
  MapPin,
  Upload,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react-native';

import { VendorForm } from '../vendors/VendorForm';
import { useUserPermissions } from '../../contexts/user-permissions-context';
import { usePermissions } from '../../contexts/permission-context';
import { capitalizeWords } from '../../lib/utils';
import { BASE_URL } from '../../config';

export function VendorSettings() {
  const [vendors, setVendors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const vendorsPerPage = 10;

  // Permission checks
  const { permissions: userCaps, isAllowed } = useUserPermissions();
  const { permissions: accountPerms } = usePermissions();
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const init = async () => {
      const role = await AsyncStorage.getItem('role');
      setUserRole(role);
      await fetchCompanies();
      await fetchVendors();
    };
    init();
  }, []);

  const isCustomer = userRole === 'customer';

  // Logic matched exactly to your permission requirements
  const accountAllowsShow = accountPerms?.canShowVendors !== false;
  const accountAllowsCreate = accountPerms?.canCreateVendors !== false;
  const userAllowsShow = isAllowed
    ? isAllowed('canShowVendors') || isCustomer
    : userCaps?.canShowVendors !== false;
  const userAllowsCreate = isAllowed
    ? isAllowed('canCreateVendors')
    : !!userCaps?.canCreateVendors;

  const canShowVendors = accountAllowsShow && userAllowsShow;
  const canCreateVendors = accountAllowsCreate && userAllowsCreate;

  const fetchCompanies = useCallback(async () => {
    setIsLoadingCompanies(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/api/companies/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCompanies(Array.isArray(data) ? data : data.companies || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingCompanies(false);
    }
  }, []);

  const fetchVendors = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/api/vendors`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setVendors(Array.isArray(data) ? data : data.vendors || []);
      setCurrentPage(1);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Failed to load vendors' });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleDeleteVendor = async vendor => {
    Alert.alert(
      'Delete Vendor',
      `Are you sure you want to delete ${vendor.vendorName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              const res = await fetch(`${BASE_URL}/api/vendors/${vendor._id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                Toast.show({ type: 'success', text1: 'Vendor Deleted' });
                fetchVendors();
              }
            } catch (error) {
              Toast.show({ type: 'error', text1: 'Delete failed' });
            }
          },
        },
      ],
    );
  };

  // CSV parser with proper quote handling
  const parseCSV = text => {
    const rows = [];
    const lines = text.split('\n').filter(line => line.trim() !== '');

    for (const line of lines) {
      const row = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          row.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      row.push(current.trim());
      rows.push(row);
    }
    return rows;
  };

  const sanitizeCSVCell = value => {
    if (value === null || value === undefined) return '';
    return value.toString().trim().replace(/[<>]/g, '');
  };

  const pickFileForImport = async () => {
    let pickFn = null;

    if (DocumentPicker) {
      if (typeof DocumentPicker.pick === 'function')
        pickFn = DocumentPicker.pick;
      else if (typeof DocumentPicker.pickDocument === 'function')
        pickFn = DocumentPicker.pickDocument;
      else if (typeof DocumentPicker.default === 'function')
        pickFn = DocumentPicker.default;
    }

    if (!pickFn) {
      try {
        const pickerModule = require('@react-native-documents/picker');
        pickFn =
          pickerModule.pick ||
          pickerModule.pickDocument ||
          pickerModule.pickSingle ||
          pickerModule.pickMultiple ||
          pickerModule.default?.pick ||
          pickerModule.default?.pickDocument ||
          pickerModule.default;
      } catch (e) {
        try {
          const pickerModule2 = require('react-native-document-picker');
          pickFn =
            pickerModule2.pick ||
            pickerModule2.pickDocument ||
            pickerModule2.pickSingle ||
            pickerModule2.pickMultiple ||
            pickerModule2.default;
        } catch (e2) {
          pickFn = null;
        }
      }
    }

    if (!pickFn || typeof pickFn !== 'function') {
      console.error('Document picker pick function not found', DocumentPicker);
      Alert.alert(
        'Import Unavailable',
        'Document picker native module is not available or not linked. Install @react-native-documents/picker (or react-native-document-picker) and rebuild the app.',
      );
      return;
    }

    try {
      const res = await pickFn({
        type: [
          DocumentPicker?.types?.csv || 'text/csv',
          DocumentPicker?.types?.xlsx ||
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          DocumentPicker?.types?.xls || 'application/vnd.ms-excel',
        ],
        allowMultiSelection: false,
      });

      const result = Array.isArray(res) ? res[0] : res;

      if (!result || !result.uri) {
        Toast.show({
          type: 'error',
          text1: 'Import Failed',
          text2: 'No file selected.',
        });
        return;
      }

      if (result.size && result.size > 10 * 1024 * 1024) {
        Toast.show({
          type: 'error',
          text1: 'File too large',
          text2: 'Please select a file smaller than 10MB.',
        });
        return;
      }

      await handleFileUpload(result);
    } catch (err) {
      const msg = err?.message || err;
      if (
        err?.code === 'DOCUMENT_PICKER_CANCELED' ||
        /cancel/i.test(String(msg))
      ) {
        return;
      }

      console.error('Picker Error:', err);
      Toast.show({
        type: 'error',
        text1: 'Import Failed',
        text2: err?.message || 'Failed to select file.',
      });
    }
  };

  const handleFileUpload = async file => {
    if (!file) return;

    setIsImporting(true);

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found.');
      }

      // Create FormData for upload
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        type: file.type || 'application/octet-stream',
        name: file.name,
      });

      const response = await fetch(`${BASE_URL}/api/vendors/import`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to import vendors');
      }

      let description = `Successfully imported ${data.importedCount} out of ${data.totalCount} vendors.`;

      if (data.errors && data.errors.length > 0) {
        description += ` ${data.errors.length} records had errors.`;
        if (data.errors.length <= 3) {
          description += ` Errors: ${data.errors.join('; ')}`;
        }
      }

      Toast.show({
        type: data.importedCount > 0 ? 'success' : 'error',
        text1:
          data.importedCount > 0
            ? 'Import Completed'
            : 'Import Completed with Issues',
        text2: description,
      });

      // Fallback alert in case Toast is not visible
      try {
        if (data.importedCount > 0) {
          Alert.alert('Import Completed', description);
        }
      } catch (e) {
        // Silently handle fallback alert error
      }

      setIsImportModalOpen(false);
      fetchVendors();
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);

      Toast.show({
        type: 'error',
        text1: 'Import Failed',
        text2: errMsg || 'Failed to import vendors',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = () => {
    // Define headers matching the API import format
    const headers = [
      'vendorName',
      'contactNumber',
      'email',
      'address',
      'city',
      'state',
      'gstin',
      'gstRegistrationType',
      'pan',
      'isTDSApplicable',
      'tdsRate',
      'tdsSection',
    ];

    // Define sample data rows
    const sampleRows = [
      [
        'ABC Suppliers',
        '9876543210',
        'contact@abc.com',
        '123 Main Street',
        'Mumbai',
        'Maharashtra',
        '22AAAAA0000A1Z5',
        'Regular',
        'AAAAA0000A',
        'true',
        '2',
        '194C',
      ],
      [
        'XYZ Traders',
        '9876543211',
        'xyz@traders.com',
        '456 Trade Avenue',
        'Delhi',
        'Delhi',
        '07ABCDE1234F1Z5',
        'Composition',
        'ABCDE1234F',
        'false',
        '0',
        '',
      ],
    ];

    // Build CSV content with proper formatting
    const buildCSVRow = row => {
      return row
        .map(field => {
          // Escape fields that contain commas, quotes, or newlines
          if (
            field.includes(',') ||
            field.includes('"') ||
            field.includes('\n')
          ) {
            return `"${field.replace(/"/g, '""')}"`;
          }
          return field;
        })
        .join(',');
    };

    let csvContent = buildCSVRow(headers) + '\r\n';
    csvContent += sampleRows.map(buildCSVRow).join('\r\n');

    // Create Excel workbook using xlsx library
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vendor Template');

    // Generate Excel file
    const excelBuffer = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

    // Save to device
    const filePath = `${RNFS.DownloadDirectoryPath}/vendor_import_template.xlsx`;

    setIsDownloading(true);

    RNFS.writeFile(filePath, excelBuffer, 'base64')
      .then(() => {
        Toast.show({
          type: 'success',
          text1: '✓ Template Downloaded',
          text2: 'Excel template has been saved to Downloads',
        });
        try {
          Alert.alert(
            'Template Downloaded',
            'Excel template has been downloaded to your device.',
          );
        } catch (e) {}
      })
      .catch(error => {
        console.error('Download error:', error);
        Toast.show({
          type: 'error',
          text1: 'Download Failed',
          text2:
            error instanceof Error
              ? error.message
              : 'Failed to download template.',
        });
      })
      .finally(() => {
        setIsDownloading(false);
      });
  };

  const renderVendor = ({ item }) => (
    <View style={[styles.card, !canShowVendors && styles.blurEffect]}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.vendorName}>
            {capitalizeWords(item.vendorName)}
          </Text>
          <View style={styles.badgeRow}>
            <View style={styles.regBadge}>
              <Text style={styles.regBadgeText}>
                {item.gstRegistrationType || 'Unregistered'}
              </Text>
            </View>
            <View
              style={[
                styles.tdsBadge,
                item.isTDSApplicable ? styles.bgTdsOn : styles.bgTdsOff,
              ]}
            >
              {item.isTDSApplicable ? (
                <Check size={10} color="#166534" />
              ) : (
                <X size={10} color="#991b1b" />
              )}
              <Text
                style={[
                  styles.tdsBadgeText,
                  item.isTDSApplicable ? styles.textTdsOn : styles.textTdsOff,
                ]}
              >
                TDS{' '}
                {item.isTDSApplicable
                  ? item.tdsSection || 'Applicable'
                  : 'Not Applicable'}
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={styles.moreBtn}
          onPress={() => {
            let options = [{ text: 'Cancel', style: 'cancel' }];
            options.unshift({
              text: 'Delete',
              style: 'destructive',
              onPress: () => handleDeleteVendor(item),
            });
            options.unshift({
              text: 'Edit',
              onPress: () => {
                setSelectedVendor(item);
                setIsFormOpen(true);
              },
            });
            Alert.alert('Options', item.vendorName, options);
          }}
        >
          <MoreHorizontal size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      <View style={styles.detailsSection}>
        {item.contactNumber ? (
          <View style={styles.detailItem}>
            <View style={styles.iconCircle}>
              <Phone size={14} color="#3b82f6" />
            </View>
            <Text style={styles.detailText}>{item.contactNumber}</Text>
          </View>
        ) : null}

        {item.address ? (
          <View style={styles.detailItem}>
            <View style={[styles.iconCircle, { backgroundColor: '#f0fdf4' }]}>
              <MapPin size={14} color="#10b981" />
            </View>
            <View>
              <Text style={styles.detailText}>{item.address}</Text>
              <Text style={styles.subDetailText}>
                {item.city}, {item.state}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );

  if (isLoadingCompanies)
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );

  if (companies.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.setupCard}>
          <Building size={64} color="#3b82f6" />
          <Text style={styles.setupTitle}>Company Setup Required</Text>
          <Text style={styles.setupSub}>
            Contact us to enable your company account and access all features.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => Linking.openURL('tel:+918989773689')}
          >
            <Phone size={18} color="white" style={{ marginRight: 8 }} />
            <Text style={styles.btnText}>+91-8989773689</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.navTitle}>Manage Vendors</Text>
        <Text style={styles.navSub}>
          A list of all your vendors and suppliers.
        </Text>

        {canCreateVendors && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.mainActionBtn}
              onPress={() => {
                setSelectedVendor(null);
                setIsFormOpen(true);
              }}
            >
              <PlusCircle size={18} color="white" style={{ marginRight: 8 }} />
              <Text style={styles.mainActionText}>Add Vendor</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryActionBtn}
              onPress={() => setIsImportModalOpen(true)}
              disabled={isImporting}
            >
              {isImporting ? (
                <ActivityIndicator size="small" color="#1e293b" />
              ) : (
                <Upload size={18} color="#1e293b" style={{ marginRight: 8 }} />
              )}
              <Text style={styles.secondaryActionText}>Import Vendors</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <FlatList
        data={vendors.slice(
          (currentPage - 1) * vendorsPerPage,
          currentPage * vendorsPerPage,
        )}
        renderItem={renderVendor}
        keyExtractor={item => item._id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchVendors} />
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        scrollEnabled={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        ListEmptyComponent={
          <View style={styles.emptyView}>
            <Building size={48} color="#cbd5e1" />
            <Text style={{ color: '#64748b', marginTop: 10 }}>
              No vendors found
            </Text>
          </View>
        }
      />

      <View style={styles.footerPagination}>
        <TouchableOpacity
          disabled={currentPage === 1}
          onPress={() => setCurrentPage(p => p - 1)}
          style={[styles.pageNavBtn, currentPage === 1 && { opacity: 0.4 }]}
        >
          <ChevronLeft size={20} color="#1e293b" />
          <Text style={styles.pageNavText}>Previous</Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={currentPage >= Math.ceil(vendors.length / vendorsPerPage)}
          onPress={() => setCurrentPage(p => p + 1)}
          style={[
            styles.pageNavBtn,
            styles.nextBtn,
            currentPage >= Math.ceil(vendors.length / vendorsPerPage) && {
              opacity: 0.4,
            },
          ]}
        >
          <Text style={[styles.pageNavText, { color: 'white' }]}>Next</Text>
          <ChevronRight size={20} color="white" />
        </TouchableOpacity>
      </View>

      {!canShowVendors && canCreateVendors && vendors.length > 0 && (
        <View style={styles.overlay}>
          <Building size={48} color="#64748b" />
          <Text style={styles.modalTitle}>Vendor Management</Text>
          <Text style={styles.navSub}>
            Viewing details requires additional permissions.
          </Text>
        </View>
      )}

      <Modal visible={isFormOpen} animationType="slide">
        <View style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedVendor ? 'Edit Vendor' : 'Create Vendor'}
            </Text>
            <TouchableOpacity onPress={() => setIsFormOpen(false)}>
              <X size={24} color="black" />
            </TouchableOpacity>
          </View>
          <VendorForm
            vendor={selectedVendor}
            onSuccess={() => {
              setIsFormOpen(false);
              fetchVendors();
            }}
          />
        </View>
      </Modal>

      <Modal
        visible={isImportModalOpen}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.importModalContainer}>
            <View style={styles.importModalHeader}>
              <Text style={styles.importModalTitle}>Import Vendors</Text>
              <TouchableOpacity onPress={() => setIsImportModalOpen(false)}>
                <X size={24} color="black" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.importModalContent} scrollEnabled={true}>
              <Text style={styles.importDescription}>
                Upload a CSV file containing vendor data. CSV files will be
                automatically sanitized for security.
              </Text>

              <View style={styles.uploadBox}>
                <Upload size={40} color="#94a3b8" />
                <Text style={styles.uploadText}>Tap to select CSV file</Text>
                <TouchableOpacity
                  style={styles.selectFileBtn}
                  onPress={pickFileForImport}
                  disabled={isImporting}
                >
                  {isImporting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.selectFileBtnText}>Select File</Text>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.downloadTemplateBtn}
                onPress={downloadTemplate}
                disabled={isImporting || isDownloading}
              >
                {isDownloading ? (
                  <ActivityIndicator size="small" color="#3b82f6" />
                ) : (
                  <>
                    <Download
                      size={18}
                      color="#3b82f6"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.downloadTemplateBtnText}>
                      Download Template
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <Text style={styles.templateHint}>
                Download the template file to ensure proper formatting.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  navSub: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 4 },
  actionRow: { marginTop: 16, gap: 10 },
  mainActionBtn: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
  },
  mainActionText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  secondaryActionBtn: {
    backgroundColor: 'white',
    borderHorizontal: 1,
    borderColor: '#e2e8f0',
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
  },
  secondaryActionText: { color: '#1e293b', fontWeight: '600', fontSize: 15 },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  vendorName: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  regBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  regBadgeText: { color: '#2563eb', fontSize: 11, fontWeight: '700' },
  tdsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  bgTdsOn: { backgroundColor: '#f0fdf4' },
  bgTdsOff: { backgroundColor: '#fef2f2' },
  textTdsOn: { color: '#166534' },
  textTdsOff: { color: '#991b1b' },
  tdsBadgeText: { fontSize: 11, fontWeight: '700' },
  detailsSection: { marginTop: 16, gap: 12 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailText: { fontSize: 14, color: '#334155', fontWeight: '500' },
  subDetailText: { fontSize: 12, color: '#64748b' },
  footerPagination: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  pageNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 4,
  },
  nextBtn: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  pageNavText: { fontWeight: '700', fontSize: 14, color: '#1e293b' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  importModalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    maxHeight: '85%',
    width: '100%',
    overflow: 'hidden',
  },
  importModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  importModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  setupCard: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    width: '100%',
  },
  setupTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 20,
    color: '#1e293b',
  },
  setupSub: {
    textAlign: 'center',
    color: '#64748b',
    marginTop: 10,
    lineHeight: 20,
  },
  primaryBtn: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
    alignItems: 'center',
  },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  importModalContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  importDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
    lineHeight: 20,
  },
  uploadBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#f8fafc',
  },
  uploadText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 10,
    marginBottom: 16,
  },
  selectFileBtn: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 10,
  },
  selectFileBtnText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  downloadTemplateBtn: {
    borderWidth: 1,
    borderColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  downloadTemplateBtnText: {
    color: '#3b82f6',
    fontWeight: '600',
    fontSize: 14,
  },
  templateHint: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  emptyView: {
    alignItems: 'center',
    paddingVertical: 50,
  },
});
