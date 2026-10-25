import Papa from 'papaparse';
import { DiscoveredProductPreview, HardwareSpecs, Product } from '../types';

export interface SourceAdapter {
  id: string;
  name: string;
  baseUrl: string;
  description: string;
}

export const SUPPORTED_ADAPTERS: SourceAdapter[] = [
  {
    id: 'startech',
    name: 'Star Tech & Engineering (Official Catalog & Products)',
    baseUrl: 'https://www.startech.com.bd/component/processor',
    description: 'Hardware, processors, motherboards, GPUs, displays',
  },
  {
    id: 'ryans',
    name: 'Ryans Computers (Product Catalog & Details)',
    baseUrl: 'https://www.ryans.com/category/desktop-component-processor',
    description: 'Retail & corporate hardware listing & product pages',
  },
  {
    id: 'ucc',
    name: 'UCC Bangladesh (Authorized Distributor)',
    baseUrl: 'https://www.ucc.com.bd',
    description: 'MSI, Corsair, Sapphire, Seagate distributor portal',
  },
  {
    id: 'globalbrand',
    name: 'Global Brand PLC (Distributor Portal)',
    baseUrl: 'https://globalbrand.com.bd',
    description: 'ASUS, LG, Brother official partner items',
  },
  {
    id: 'custom',
    name: 'Generic Public Hardware Catalog or Product Page',
    baseUrl: '',
    description: 'Standard product Schema.org JSON-LD and OpenGraph pages',
  },
];

// Client-side SSRF validation helper
export function validateSafeUrl(urlString: string): { isValid: boolean; error?: string } {
  try {
    const parsed = new URL(urlString);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { isValid: false, error: 'Only http and https protocols are permitted.' };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block localhost, private IPs, loopbacks, link-local, cloud metadata
    const blockedPatterns = [
      /^localhost$/i,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^169\.254\./, // AWS/GCP/Azure link-local metadata
      /^::1$/,
      /^fc00:/,
      /^fe80:/,
      /\.internal$/,
      /\.local$/,
    ];

    for (const pattern of blockedPatterns) {
      if (pattern.test(hostname)) {
        return {
          isValid: false,
          error: 'Security alert: Access to internal or loopback IP ranges is strictly restricted (SSRF protection).',
        };
      }
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Please enter a valid URL (e.g. https://www.startech.com.bd/component/processor).' };
  }
}

// Scrape / Fetch parser calling the secure server endpoint
export async function fetchDiscoveredProducts(
  url: string,
  adapterId: string,
  category: string,
  existingProducts: Product[],
  page: number = 1
): Promise<{ items: DiscoveredProductPreview[]; error?: string; message?: string }> {
  const validation = validateSafeUrl(url);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  try {
    const response = await fetch('/api/import/fetch-catalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, adapterId, category, page }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Server responded with HTTP ${response.status}`);
    }

    const rawItems: DiscoveredProductPreview[] = data.items || [];

    // Duplicate detection against existing products
    const mapped = rawItems.map((item) => {
      const duplicateCandidate = existingProducts.find((p) => {
        const matchModel = p.model.toLowerCase() === item.model.toLowerCase();
        const matchName = p.name.toLowerCase().includes(item.model.toLowerCase());
        return matchModel || matchName;
      });

      return {
        ...item,
        duplicateCandidate,
      };
    });

    return {
      items: mapped,
      message: data.message,
    };
  } catch (err: any) {
    throw new Error(err.message || 'Scraper connection failed');
  }
}

// Parse distributor CSV files
export function parseDistributorCSV(csvText: string, existingProducts: Product[]): Promise<DiscoveredProductPreview[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedItems: DiscoveredProductPreview[] = [];

        results.data.forEach((row: any, i) => {
          const name = row['Product Name'] || row['Name'] || row['name'] || row['Title'] || '';
          if (!name) return;

          const brand = row['Brand'] || row['brand'] || 'Unknown Brand';
          const model = row['Model'] || row['model'] || name.split(' ').slice(0, 3).join(' ');
          const category = row['Category'] || row['category'] || 'Accessories';
          const rawPrice = String(row['Price'] || row['Selling Price'] || row['MRP'] || '0').replace(/[^0-9.]/g, '');
          const price = parseFloat(rawPrice) || 0;
          const stockStr = (row['Stock'] || row['Status'] || 'In Stock').toLowerCase();
          const inStock = !stockStr.includes('out') && !stockStr.includes('0');

          const duplicateCandidate = existingProducts.find(
            (p) => p.model.toLowerCase() === model.toLowerCase() || p.name.toLowerCase() === name.toLowerCase()
          );

          parsedItems.push({
            sourceUrl: 'csv_upload_' + (i + 1),
            sourceWebsite: 'Distributor CSV Sheet',
            name,
            brand,
            model,
            category,
            price,
            inStock,
            stockText: inStock ? 'In Stock' : 'Out of Stock',
            specs: {
              socket: row['Socket'] || row['socket'],
              ramType: row['RAM Type'] || row['ramType'],
              formFactor: row['Form Factor'] || row['formFactor'],
              psuWattage: row['PSU Wattage'] ? parseInt(row['PSU Wattage']) : undefined,
              warrantyMonths: row['Warranty (Months)'] ? parseInt(row['Warranty (Months)']) : 36,
            },
            verificationStatus: 'imported_unverified',
            duplicateCandidate,
          });
        });

        resolve(parsedItems);
      },
      error: (err: any) => {
        reject(new Error('Failed to parse CSV: ' + err.message));
      },
    });
  });
}

// Generate CSV template for distributor imports
export function getSampleCSVTemplate(): string {
  return [
    'Product Name,Brand,Model,Category,Price,Cost,Stock,Socket,RAM Type,Form Factor,Warranty (Months)',
    'Intel Core i5-14400 14th Gen Processor,Intel,Core i5-14400,Processor,26500,24200,10,LGA1700,DDR5,,36',
    'MSI PRO B760M-E DDR4 Motherboard,MSI,PRO B760M-E,Motherboard,11800,10400,15,LGA1700,DDR4,Micro-ATX,36',
    'Corsair Vengeance LPX 8GB 3200MHz DDR4,Corsair,LPX 8GB 3200,RAM,2600,2200,25,,DDR4,,120',
    'Western Digital Blue SN580 1TB NVMe Gen4,Western Digital,WD Blue SN580 1TB,Storage,8900,7800,12,,,,60',
  ].join('\n');
}
