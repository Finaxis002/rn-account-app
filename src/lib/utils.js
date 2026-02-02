import { clsx } from 'clsx';

// Simplified cn function without tailwind-merge
export function cn(...inputs) {
  return clsx(inputs);
}

export function capitalizeWords(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/\b\w/g, l => l.toUpperCase());
}

// Safely get a short id tail for fallback labels
const tail = id => (id ? id.toString().slice(-6) : '');

// Build a unified list of product + service lines from a transaction
export function getUnifiedLines(
  tx,
  serviceNameById,
  productsList = [],
  servicesList = [],
) {
  if (!tx || typeof tx !== 'object') return [];

  // Helper: lookup HSN/SAC from master lists when possible
  const getHsnSac = (id, type) => {
    if (!id) return '';
    if (type === 'product') {
      const p = productsList.find(it => String(it._id) === String(id));
      return p?.hsn || p?.hsnCode || '';
    }
    const s = servicesList.find(it => String(it._id) === String(id));
    return s?.sac || s?.sacCode || '';
  };

  // ✅ Legacy: tx.items[] (keep existing behavior)
  const legacyProducts = Array.isArray(tx.items)
    ? tx.items
        .filter(i => i && i.product)
        .map(i => ({
          type: 'product',
          name:
            i.product?.name ?? `Product #${tail(i.product?._id || i.product)}`,
          quantity: i.quantity ?? '',
          unitType: i.unitType ?? '',
          pricePerUnit: i.pricePerUnit ?? '',
          description: i.description ?? '',
          amount: Number(i.amount) || 0,
          hsn: i.hsn ?? i.hsnCode ?? i.product?.hsn ?? i.product?.hsnCode ?? '',
          hsnCode: i.hsnCode ?? undefined,
          gstPercentage:
            i.gstPercentage ?? i.gstRate ?? i.gst ?? i.tax ?? undefined,
          gstRate: i.gstRate ?? undefined,
          lineTax: i.lineTax ?? i.taxAmount ?? undefined,
          taxAmount: i.taxAmount ?? undefined,
        }))
    : [];

  // ✅ New: tx.products[] (use master list lookup for HSN/SAC)
  const products = Array.isArray(tx.products)
    ? tx.products
        .filter(p => p && typeof p === 'object')
        .map(p => {
          const productId =
            typeof p.product === 'object' ? p.product._id : p.product;
          const productObj =
            typeof p.product === 'object' ? p.product : undefined;

          return {
            type: 'product',
            name: productObj?.name ?? p.name ?? `Product #${tail(productId)}`,
            quantity: p.quantity ?? '',
            unitType: p.unitType ?? '',
            pricePerUnit: p.pricePerUnit ?? '',
            description: p.description ?? '',
            amount: Number(p.amount) || 0,
            // HSN/SAC & tax fields preserved / resolved from master lists
            hsn:
              getHsnSac(productId, 'product') ||
              p.hsn ||
              p.hsnCode ||
              productObj?.hsn ||
              productObj?.hsnCode ||
              '',
            hsnCode: p.hsnCode ?? undefined,
            gstPercentage:
              p.gstPercentage ??
              p.gstRate ??
              p.gst ??
              p.tax ??
              productObj?.gstPercentage ??
              undefined,
            gstRate: p.gstRate ?? undefined,
            lineTax: p.lineTax ?? p.taxAmount ?? undefined,
            taxAmount: p.taxAmount ?? undefined,
          };
        })
    : [];

  // ✅ Handle tx.service[] or tx.services[] (use master list lookup for SAC)
  const svcArray = Array.isArray(tx.service)
    ? tx.service
    : Array.isArray(tx.services)
    ? tx.services
    : [];

  const services = svcArray
    .filter(s => s && typeof s === 'object')
    .map(s => {
      // Safely get service id
      const rawId =
        (s.service &&
          (typeof s.service === 'object' ? s.service._id : s.service)) ??
        (s.serviceName &&
          (typeof s.serviceName === 'object'
            ? s.serviceName._id
            : s.serviceName));

      const serviceId = rawId ? String(rawId) : undefined;

      // Extract service name safely
      const nameFromDoc =
        (typeof s.service === 'object' &&
          (s.service?.serviceName || s.service?.name)) ||
        (typeof s.serviceName === 'object' &&
          (s.serviceName?.serviceName || s.serviceName?.name));

      const name =
        nameFromDoc ||
        (serviceId ? serviceNameById?.get(serviceId) : undefined) ||
        `Service #${tail(serviceId)}`;

      return {
        type: 'service',
        name,
        service: serviceId,
        quantity: '',
        unitType: '',
        pricePerUnit: '',
        description: s.description ?? '',
        amount: Number(s.amount) || 0,
        sac: getHsnSac(serviceId, 'service') || s.sac || s.sacCode || '',
        sacCode: s.sacCode ?? undefined,
        gstPercentage:
          s.gstPercentage ?? s.gstRate ?? s.gst ?? s.tax ?? undefined,
        gstRate: s.gstRate ?? undefined,
        lineTax: s.lineTax ?? s.taxAmount ?? undefined,
        taxAmount: s.taxAmount ?? undefined,
      };
    });

  // ✅ Merge product + service + legacy
  const lines = [...products, ...services];
  return lines.length ? lines : legacyProducts;
}

export function parseNotesHtml(notesHtml) {
  // Extract title from first <p>
  const titleMatch = notesHtml.match(/<p[^>]*>(.*?)<\/p>/);
  const title = titleMatch
    ? titleMatch[1]
        .replace(/<[^>]*>/g, '')
        .replace(/&/g, '&')
        .trim()
    : 'Terms and Conditions';

  // Check if it's a list or paragraphs
  const isList = /<li[^>]*>/.test(notesHtml);

  if (isList) {
    // Parse as list
    const listItems = [];
    const liRegex = /<li[^>]*>(.*?)<\/li>/g;
    let match;
    while ((match = liRegex.exec(notesHtml)) !== null) {
      const cleanItem = match[1]
        .replace(/<[^>]*>/g, '')
        .replace(/&/g, '&')
        .trim();
      if (cleanItem) listItems.push(cleanItem);
    }

    return { title, isList: true, items: listItems };
  } else {
    // Parse as paragraphs
    const paragraphs = [];
    const pRegex = /<p[^>]*>(.*?)<\/p>/g;
    let match;
    let firstSkipped = false;
    while ((match = pRegex.exec(notesHtml)) !== null) {
      if (!firstSkipped) {
        firstSkipped = true; // Skip the title paragraph
        continue;
      }
      const cleanPara = match[1]
        .replace(/<[^>]*>/g, '')
        .replace(/&/g, '&')
        .trim();
      if (cleanPara) {
        paragraphs.push(cleanPara);
      }
    }

    return { title, isList: false, items: paragraphs };
  }
}
