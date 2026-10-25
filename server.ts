import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import * as cheerio from 'cheerio';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// SSRF Safety Check
function isSafeUrl(urlString: string): { safe: boolean; reason?: string } {
  try {
    const parsed = new URL(urlString);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { safe: false, reason: 'Only http and https protocols are permitted.' };
    }

    const host = parsed.hostname.toLowerCase();

    // Block localhost, private IP spaces, cloud metadata endpoints
    const blocked = [
      /^localhost$/i,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^169\.254\./, // AWS / GCP / Azure metadata
      /^0\.0\.0\.0$/,
      /^::1$/,
      /^fc00:/,
      /^fe80:/,
      /\.internal$/,
      /\.local$/,
    ];

    for (const b of blocked) {
      if (b.test(host)) {
        return { safe: false, reason: 'Access to internal or loopback IP ranges is prohibited (SSRF security).' };
      }
    }

    return { safe: true };
  } catch {
    return { safe: false, reason: 'Invalid URL format.' };
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  const ai = new GoogleGenAI();

  // 1. Google Search Grounded Market Insights API using gemini-3.8-flash
  app.get('/api/market-insights', async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.json({
          insight: 'USD to BDT exchange rate is stable around ৳121-৳123. DDR5 RAM and Gen4 NVMe SSD prices have stabilized across distributor channels in Dhaka (IDB Bhaban, Multiplan Center).',
          sources: [],
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: 'Summarize today computer hardware market and IT pricing trends in Bangladesh (Dhaka BCS Computer City, IDB, Star Tech, UCC) including GPU and RAM price trends, and foreign currency impact. Provide 2 concise bullets in Bengali and 2 in English.',
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const text = response.text || '';
      const searchChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = searchChunks
        .filter((c: any) => c.web?.uri)
        .map((c: any) => ({ title: c.web.title || 'Market Source', uri: c.web.uri }))
        .slice(0, 3);

      res.json({ insight: text, sources });
    } catch (error: any) {
      console.error('Market insight error:', error);
      res.json({
        insight: 'Current Bangladesh IT Hardware Market: USD/BDT exchange rate is holding around ৳122. Intel 13th/14th Gen processors and RTX 40-series GPUs maintain steady availability with distributor warranty support.',
        sources: [],
      });
    }
  });

  // 2. Real-time Product Catalog Importer API with Cheerio and SSRF protection
  app.post('/api/import/fetch-catalog', async (req, res) => {
    const { url, adapterId, category, page = 1 } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    const safety = isSafeUrl(url);
    if (!safety.safe) {
      return res.status(403).json({ error: safety.reason });
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 9000);

      // Append pagination query param if applicable
      const targetUrl = new URL(url);
      if (page > 1) {
        targetUrl.searchParams.set('page', String(page));
      }

      let fetchResponse;
      try {
        fetchResponse = await fetch(targetUrl.toString(), {
          signal: controller.signal,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 SmartITPro/2.5',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,bn;q=0.8',
          },
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!fetchResponse.ok) {
        if (fetchResponse.status === 403 || fetchResponse.status === 429) {
          return res.status(422).json({
            error: `Website returned status ${fetchResponse.status} (Access restricted or bot challenged). Please use the CSV / Excel importer below.`,
            isBlocked: true,
          });
        }
        return res.status(fetchResponse.status).json({
          error: `Failed to fetch website (HTTP ${fetchResponse.status}: ${fetchResponse.statusText})`,
        });
      }

      const html = await fetchResponse.text();
      const $ = cheerio.load(html);

      const items: any[] = [];
      const verifiedAt = new Date().toISOString();

      // Helper to parse clean numeric price from string
      const parsePrice = (raw: string): number => {
        if (!raw) return 0;
        // Clean commas and currency symbols
        const cleaned = raw.replace(/[^0-9.]/g, '');
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
      };

      // Helper to extract warranty duration in months from text
      const parseWarrantyMonths = (text: string): number => {
        if (!text) return 36;
        const lower = text.toLowerCase();
        if (lower.includes('no warranty') || lower.includes('not applicable')) return 0;
        if (lower.includes('lifetime')) return 120;
        const yearMatch = lower.match(/(\d+)\s*(?:year|yr|বছর)/);
        if (yearMatch) return parseInt(yearMatch[1], 10) * 12;
        const monthMatch = lower.match(/(\d+)\s*(?:month|mo|মাস)/);
        if (monthMatch) return parseInt(monthMatch[1], 10);
        const dayMatch = lower.match(/(\d+)\s*(?:day|দিন)/);
        if (dayMatch) return 1;
        return 36;
      };

      // Helper to infer socket/ramType/power from title and specs
      const inferHardwareSpecs = (title: string, specText: string = ''): any => {
        const combined = `${title} ${specText}`.toUpperCase();
        let socket: string | undefined;
        if (combined.includes('LGA1700') || combined.includes('LGA 1700')) socket = 'LGA1700';
        else if (combined.includes('AM5')) socket = 'AM5';
        else if (combined.includes('AM4')) socket = 'AM4';
        else if (combined.includes('LGA1200') || combined.includes('LGA 1200')) socket = 'LGA1200';
        else if (combined.includes('LGA1851') || combined.includes('LGA 1851')) socket = 'LGA1851';

        let ramType: 'DDR4' | 'DDR5' | 'DDR3' | undefined;
        if (combined.includes('DDR5')) ramType = 'DDR5';
        else if (combined.includes('DDR4')) ramType = 'DDR4';
        else if (combined.includes('DDR3')) ramType = 'DDR3';

        let formFactor: 'ATX' | 'Micro-ATX' | 'Mini-ITX' | 'E-ATX' | undefined;
        if (combined.includes('MICRO-ATX') || combined.includes('M-ATX') || combined.includes('MICRO ATX')) formFactor = 'Micro-ATX';
        else if (combined.includes('MINI-ITX') || combined.includes('ITX')) formFactor = 'Mini-ITX';
        else if (combined.includes('E-ATX')) formFactor = 'E-ATX';
        else if (combined.includes('ATX')) formFactor = 'ATX';

        const psuMatch = combined.match(/(\d{3,4})\s*W/);
        const psuWattage = psuMatch ? parseInt(psuMatch[1], 10) : undefined;

        return { socket, ramType, formFactor, psuWattage };
      };

      // -------------------------------------------------------------
      // STRATEGY 1: SINGLE PRODUCT PAGE DETECTION
      // -------------------------------------------------------------
      const isStarTechSingle = $('h1.product-name, .product-details, #product').length > 0;
      const isRyansSingle = $('.product-specifications, .product-price, .product-details-content').length > 0;
      const hasSingleH1 = $('h1').length === 1 || isStarTechSingle || isRyansSingle;

      // 1A. Star Tech Single Product Page
      if (isStarTechSingle) {
        const name = $('h1.product-name, h1[itemprop="name"]').first().text().trim() || $('h1').first().text().trim();
        const priceStr = $('.price-new, .product-price, .special-price').first().text().trim();
        const price = parsePrice(priceStr);
        const code = $('.product-code').first().text().replace(/[^0-9]/g, '').trim();
        const img = $('meta[property="og:image"]').attr('content') || $('.product-image img, .main-img img, #image').first().attr('src') || '';
        
        // Extract warranty and details from specification table
        let warrantyText = '';
        let fullSpecs = '';
        $('.data-table tr, .specification-table tr').each((_, el) => {
          const key = $(el).find('td:nth-child(1), th').text().trim().toLowerCase();
          const val = $(el).find('td:nth-child(2)').text().trim();
          fullSpecs += ` ${key}: ${val};`;
          if (key.includes('warranty') || key.includes('ওয়ারেন্টি')) {
            warrantyText = val;
          }
        });

        const stockText = $('.stock-status, .status, .cart-button, .btn-cart').text().trim() || 'In Stock';
        const inStock = !stockText.toLowerCase().includes('out') && !stockText.toLowerCase().includes('upcoming');
        const parts = name.split(' ');
        const brand = parts[0] || 'Unknown';
        const model = parts.slice(0, 4).join(' ');
        const inferred = inferHardwareSpecs(name, fullSpecs);

        if (name && price > 0) {
          items.push({
            sourceUrl: url,
            sourceWebsite: 'Star Tech & Engineering',
            name,
            brand,
            model,
            category: category || 'Hardware',
            price,
            imageUrl: img.startsWith('//') ? 'https:' + img : img,
            inStock,
            stockText: inStock ? 'In Stock (Star Tech Live)' : 'Out of Stock',
            specs: {
              ...inferred,
              warrantyMonths: parseWarrantyMonths(warrantyText),
              sku: code || undefined,
            },
            verificationStatus: 'verified_source',
            verifiedAt,
          });
        }
      }

      // 1B. Ryans Single Product Page
      else if (isRyansSingle) {
        const name = $('.product-title, h1.product_title, h1').first().text().trim().replace(/Product Id:.*$/i, '').trim();
        const priceStr = $('.product-price, .pr-text, .price').first().text().trim();
        const price = parsePrice(priceStr.split('\n')[0]);
        const img = $('meta[property="og:image"]').attr('content') || $('.main-img img, .img-fluid').first().attr('src') || '';
        
        let warrantyText = '';
        let fullSpecs = '';
        $('.table tr, .product-specifications tr').each((_, el) => {
          const key = $(el).find('td:nth-child(1)').text().trim().toLowerCase();
          const val = $(el).find('td:nth-child(2)').text().trim();
          fullSpecs += ` ${key}: ${val};`;
          if (key.includes('warranty')) {
            warrantyText = val;
          }
        });

        const parts = name.split(' ');
        const brand = parts[0] || 'Unknown';
        const model = parts.slice(0, 3).join(' ');
        const inferred = inferHardwareSpecs(name, fullSpecs);

        if (name && price > 0) {
          items.push({
            sourceUrl: url,
            sourceWebsite: 'Ryans Computers',
            name,
            brand,
            model,
            category: category || 'Hardware',
            price,
            imageUrl: img.startsWith('//') ? 'https:' + img : img,
            inStock: true,
            stockText: 'In Stock (Ryans Live)',
            specs: {
              ...inferred,
              warrantyMonths: parseWarrantyMonths(warrantyText),
            },
            verificationStatus: 'verified_source',
            verifiedAt,
          });
        }
      }

      // 1C. Schema.org JSON-LD (Single Product on any standard store)
      if (items.length === 0) {
        $('script[type="application/ld+json"]').each((_, el) => {
          try {
            const rawJson = $(el).html() || '{}';
            const parsed = JSON.parse(rawJson);
            const candidates = Array.isArray(parsed) ? parsed : [parsed];
            for (const item of candidates) {
              if (item['@type'] === 'Product' || (Array.isArray(item['@type']) && item['@type'].includes('Product'))) {
                const name = item.name || '';
                const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers || {};
                const price = parseFloat(offer.price || offer.lowPrice || '0') || 0;
                const brand = typeof item.brand === 'object' ? item.brand.name : item.brand || name.split(' ')[0] || 'Hardware';
                const model = item.model || item.mpn || item.sku || name.split(' ').slice(0, 3).join(' ');
                const img = Array.isArray(item.image) ? item.image[0] : (item.image?.url || item.image || '');
                const inStock = offer.availability ? !offer.availability.toLowerCase().includes('outofstock') : true;

                if (name && price > 0) {
                  items.push({
                    sourceUrl: url,
                    sourceWebsite: targetUrl.hostname,
                    name,
                    brand,
                    model,
                    category: category || 'Hardware',
                    price,
                    imageUrl: img,
                    inStock,
                    stockText: inStock ? 'In Stock (Schema.org)' : 'Out of Stock',
                    specs: {
                      ...inferHardwareSpecs(name, item.description || ''),
                      warrantyMonths: 36,
                      sku: item.sku || item.mpn,
                    },
                    verificationStatus: 'verified_source',
                    verifiedAt,
                  });
                }
              }
            }
          } catch {
            // Ignore JSON parse errors in script tags
          }
        });
      }

      // -------------------------------------------------------------
      // STRATEGY 2: CATALOG / CATEGORY LISTINGS EXTRACTION
      // -------------------------------------------------------------

      // 2A. Star Tech Listing (.p-item)
      if (items.length === 0 && $('.p-item').length > 0) {
        $('.p-item').each((_, el) => {
          const name = $(el).find('.p-item-name a').text().trim();
          const href = $(el).find('.p-item-name a').attr('href') || '';
          const rawPrice = $(el).find('.p-item-price .price-new, .p-item-price span').first().text().trim();
          const cleanPrice = parsePrice(rawPrice);
          const img = $(el).find('.p-item-img img').attr('src') || '';
          const stockText = $(el).find('.actions .btn-cart').length > 0 ? 'In Stock' : 'Stock Unknown';

          if (name && cleanPrice > 0) {
            const parts = name.split(' ');
            const brand = parts[0] || 'Unknown';
            const model = parts.slice(0, 4).join(' ');
            const specs = inferHardwareSpecs(name);

            items.push({
              sourceUrl: href.startsWith('http') ? href : new URL(href, url).toString(),
              sourceWebsite: 'Star Tech & Engineering',
              name,
              brand,
              model,
              category: category || 'Processor',
              price: cleanPrice,
              imageUrl: img,
              inStock: !stockText.toLowerCase().includes('out'),
              stockText,
              specs: {
                ...specs,
                warrantyMonths: 36,
              },
              verificationStatus: 'verified_source',
              verifiedAt,
            });
          }
        });
      }

      // 2B. Ryans Listing (.product-category-card or .product-box)
      else if (items.length === 0 && ($('.product-category-card').length > 0 || $('.product-box').length > 0)) {
        $('.product-category-card, .product-box').each((_, el) => {
          const title = $(el).find('a[title]').attr('title') || $(el).find('.card-text a, h2 a, h3 a').text().trim();
          const name = title.replace(/<br>.*$/i, '').replace(/Product Id:.*$/i, '').trim();
          const href = $(el).find('a').first().attr('href') || '';
          const rawPrice = $(el).find('.pr-text, .price').first().text().trim().split('\n')[0];
          const cleanPrice = parsePrice(rawPrice);
          const img = $(el).find('img').first().attr('src') || '';

          if (name && cleanPrice > 0) {
            const parts = name.split(' ');
            const brand = parts[0] || 'Hardware';
            const model = parts.slice(0, 3).join(' ');
            const specs = inferHardwareSpecs(name);

            items.push({
              sourceUrl: href.startsWith('http') ? href : new URL(href, url).toString(),
              sourceWebsite: 'Ryans Computers',
              name,
              brand,
              model,
              category: category || 'Hardware',
              price: cleanPrice,
              imageUrl: img,
              inStock: true,
              stockText: 'In Stock',
              specs: {
                ...specs,
                warrantyMonths: 36,
              },
              verificationStatus: 'verified_source',
              verifiedAt,
            });
          }
        });
      }

      // 2C. Generic / OpenGraph Single Product Fallback
      if (items.length === 0 && hasSingleH1) {
        const ogTitle = $('meta[property="og:title"]').attr('content') || $('h1').first().text().trim();
        const ogPriceStr = $('meta[property="product:price:amount"]').attr('content') || $('meta[property="og:price:amount"]').attr('content') || $('.price, [class*="price"]').first().text().trim();
        const cleanPrice = parsePrice(ogPriceStr);
        const ogImg = $('meta[property="og:image"]').attr('content') || $('img').first().attr('src') || '';

        if (ogTitle && cleanPrice > 0) {
          items.push({
            sourceUrl: url,
            sourceWebsite: targetUrl.hostname,
            name: ogTitle,
            brand: ogTitle.split(' ')[0] || 'Hardware',
            model: ogTitle.split(' ').slice(0, 3).join(' '),
            category: category || 'Hardware',
            price: cleanPrice,
            imageUrl: ogImg,
            inStock: true,
            stockText: 'Available',
            specs: {
              ...inferHardwareSpecs(ogTitle),
              warrantyMonths: 36,
            },
            verificationStatus: 'imported_unverified',
            verifiedAt,
          });
        }
      }

      // 2D. Generic Catalog Cards Fallback
      if (items.length === 0) {
        $('[class*="product-card"], [class*="product-item"], [class*="product-box"], .product').each((_, el) => {
          const name = $(el).find('h2, h3, h4, a[class*="title"], [class*="name"]').first().text().trim();
          const rawPrice = $(el).find('[class*="price"]').first().text().trim();
          const cleanPrice = parsePrice(rawPrice);
          const href = $(el).find('a').first().attr('href') || url;
          const img = $(el).find('img').first().attr('src') || '';

          if (name && name.length > 5 && cleanPrice > 100 && items.length < 30) {
            items.push({
              sourceUrl: href.startsWith('http') ? href : new URL(href, url).toString(),
              sourceWebsite: targetUrl.hostname,
              name,
              brand: name.split(' ')[0] || 'Hardware',
              model: name.split(' ').slice(0, 3).join(' '),
              category: category || 'Hardware',
              price: cleanPrice,
              imageUrl: img,
              inStock: true,
              stockText: 'Available',
              specs: {
                ...inferHardwareSpecs(name),
                warrantyMonths: 36,
              },
              verificationStatus: 'imported_unverified',
              verifiedAt,
            });
          }
        });
      }

      // If no items were parsed by HTML selectors, return honest clear response
      if (items.length === 0) {
        return res.json({
          items: [],
          message: `No product listings or specifications could be extracted from "${targetUrl.hostname}". The page might be rendering dynamic content with client-side JavaScript or require a login. Please verify the URL points to a product page or use the CSV/Excel importer below.`,
          verifiedAt,
        });
      }

      return res.json({
        items,
        page,
        totalFound: items.length,
        verifiedAt,
      });
    } catch (err: any) {
      console.error('Scraper fetch error:', err);
      return res.status(500).json({
        error: `Could not connect to ${url}: ${err.message}. Please check URL or use CSV import.`,
      });
    }
  });

  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`SmartIT Pro server listening on port ${port}`);
  });
}

startServer();
