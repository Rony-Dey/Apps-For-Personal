import { CompatibilityCheckResult, CompatibilityStatus, PCBuildComponentSelection } from '../types';

export function checkPCCompatibility(
  build: PCBuildComponentSelection,
  lang: 'bn' | 'en' = 'bn'
): CompatibilityCheckResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const notes: string[] = [];

  let estimatedWattage = 100; // Base wattage for motherboard, fans, chipset, storage
  let recommendedPsuWattage = 450;
  let hasMissingEssentialSpecs = false;

  const { cpu, motherboard, ram, gpu, psu, case: pcCase, cooler, storage } = build;

  // 1. CPU & Motherboard Socket Compatibility
  if (cpu && motherboard) {
    const cpuSocket = cpu.specs.socket?.trim().toUpperCase();
    const mbSocket = motherboard.specs.socket?.trim().toUpperCase();

    if (cpuSocket && mbSocket) {
      if (cpuSocket !== mbSocket) {
        errors.push(
          lang === 'bn'
            ? `সকেট অমিল: প্রসেসরের সকেট (${cpuSocket}) এবং মাদারবোর্ডের সকেট (${mbSocket}) এক নয়! এটি ইন্সটল করা যাবে না।`
            : `Socket Mismatch: Processor socket (${cpuSocket}) does not match motherboard socket (${mbSocket})!`
        );
      } else {
        notes.push(
          lang === 'bn'
            ? `প্রসেসর ও মাদারবোর্ড সকেট (${cpuSocket}) সামঞ্জস্যপূর্ণ।`
            : `Processor and motherboard socket (${cpuSocket}) are matching.`
        );
      }
    } else {
      hasMissingEssentialSpecs = true;
      warnings.push(
        lang === 'bn'
          ? 'প্রসেসর অথবা মাদারবোর্ডের সকেট তথ্য অপর্যাপ্ত। যাচাই করে নিন।'
          : 'Missing socket spec on CPU or Motherboard. Needs verification.'
      );
    }
  }

  // 2. RAM & Motherboard Generation (DDR4 vs DDR5)
  if (ram && motherboard) {
    const ramType = ram.specs.ramType?.trim().toUpperCase();
    const mbRamType = motherboard.specs.ramType?.trim().toUpperCase();

    if (ramType && mbRamType) {
      if (ramType !== mbRamType) {
        errors.push(
          lang === 'bn'
            ? `র‌্যাম প্রজন্ম অমিল: মাদারবোর্ডে ${mbRamType} প্রয়োজন, কিন্তু আপনি ${ramType} সিলেক্ট করেছেন। এটি ফিট হবে না।`
            : `RAM Generation Mismatch: Motherboard requires ${mbRamType}, but selected RAM is ${ramType}.`
        );
      } else {
        notes.push(
          lang === 'bn'
            ? `র‌্যাম টাইপ (${ramType}) মাদারবোর্ডের সাথে মিলেছে।`
            : `RAM generation (${ramType}) is compatible with motherboard.`
        );
      }
    } else {
      hasMissingEssentialSpecs = true;
      warnings.push(
        lang === 'bn'
          ? 'র‌্যাম টাইপ (DDR4/DDR5) নির্দিষ্ট করা নেই। নিশ্চিত করুন।'
          : 'RAM generation (DDR4/DDR5) not specified on one or both items.'
      );
    }
  }

  // 3. Motherboard Form Factor & Case Compatibility
  if (motherboard && pcCase) {
    const mbSize = motherboard.specs.formFactor; // ATX, Micro-ATX, Mini-ITX
    const caseSupported = pcCase.specs.caseSupportedMotherboards; // array

    if (mbSize && caseSupported && Array.isArray(caseSupported)) {
      if (!(caseSupported as string[]).includes(mbSize)) {
        errors.push(
          lang === 'bn'
            ? `কেসিং অমিল: মাদারবোর্ড সাইজ (${mbSize}) এই কেসিংয়ে সাপোর্ট করে না। সাপোর্টেড: ${caseSupported.join(', ')}`
            : `Case Form Factor Mismatch: Motherboard (${mbSize}) not supported by case. Fits: ${caseSupported.join(', ')}`
        );
      } else {
        notes.push(
          lang === 'bn'
            ? `মাদারবোর্ড ফর্ম ফ্যাক্টর (${mbSize}) কেসিংয়ে ফিট হবে।`
            : `Motherboard form factor (${mbSize}) fits in selected case.`
        );
      }
    }
  }

  // 4. Power & PSU Wattage Calculation
  const cpuTdp = (cpu?.specs.coolerTdpRating || cpu?.specs.powerWattage || 65);
  const gpuWattage = (gpu?.specs.gpuWattage || gpu?.specs.powerWattage || 0);

  estimatedWattage += cpuTdp + gpuWattage;
  // Recommended PSU adds safe 30% headroom
  recommendedPsuWattage = Math.max(450, Math.ceil((estimatedWattage * 1.3) / 50) * 50);

  if (psu) {
    const psuRated = psu.specs.psuWattage || 0;
    if (psuRated > 0) {
      if (psuRated < estimatedWattage) {
        errors.push(
          lang === 'bn'
            ? `পাওয়ার সাপ্লাই অপর্যাপ্ত: সিস্টেমের জন্য প্রয়োজন আনুমানিক ${estimatedWattage}W, কিন্তু পাওয়ার সাপ্লাই মাত্র ${psuRated}W!`
            : `Insufficient Power: System requires ~${estimatedWattage}W, but PSU provides only ${psuRated}W!`
        );
      } else if (psuRated < recommendedPsuWattage) {
        warnings.push(
          lang === 'bn'
            ? `পাওয়ার হেডরুম কম: এই কনফিগারেশনে অন্তত ${recommendedPsuWattage}W PSU ব্যবহার করা নিরাপদ। বর্তমান: ${psuRated}W.`
            : `Low Power Headroom: Recommended PSU is at least ${recommendedPsuWattage}W for peak loads. Current: ${psuRated}W.`
        );
      } else {
        notes.push(
          lang === 'bn'
            ? `পাওয়ার সাপ্লাই (${psuRated}W) সিস্টেমের আনুমানিক চাহিদার (${estimatedWattage}W) সাথে যথেষ্ট শক্তিশালী।`
            : `PSU (${psuRated}W) easily handles estimated draw (${estimatedWattage}W).`
        );
      }
    }
  } else if (gpu && gpuWattage > 150) {
    warnings.push(
      lang === 'bn'
        ? `ডেডিকেটেড গ্রাফিক্স কার্ডের জন্য অন্তত ${recommendedPsuWattage}W ব্র্যান্ডেড পাওয়ার সাপ্লাই যোগ করুন।`
        : `High-draw GPU requires at least ${recommendedPsuWattage}W quality PSU.`
    );
  }

  // 5. GPU Dimensions & Case Clearance
  if (gpu && pcCase) {
    const gpuLength = gpu.specs.gpuLengthMm || 0;
    const maxCaseLength = pcCase.specs.caseMaxGpuLengthMm || 0;

    if (gpuLength > 0 && maxCaseLength > 0) {
      if (gpuLength > maxCaseLength) {
        errors.push(
          lang === 'bn'
            ? `গ্রাফিক্স কার্ড সাইজ ত্রুটি: GPU দৈর্ঘ্য (${gpuLength}mm) কেসিংয়ের সর্বোচ্চ স্পেসের (${maxCaseLength}mm) চেয়ে বেশি!`
            : `GPU Clearance Error: GPU length (${gpuLength}mm) exceeds case limit (${maxCaseLength}mm)!`
        );
      }
    }
  }

  // 6. CPU Cooler & Socket / TDP
  if (cpu && cooler) {
    const cpuSocket = cpu.specs.socket?.toUpperCase();
    const coolerSockets = cooler.specs.coolerSocketSupport?.map((s: string) => s.toUpperCase());

    if (cpuSocket && coolerSockets && coolerSockets.length > 0) {
      if (!coolerSockets.includes(cpuSocket)) {
        errors.push(
          lang === 'bn'
            ? `কুলার সকেট ত্রুটি: এই কুলারটি প্রসেসরের সকেট (${cpuSocket}) সাপোর্ট করে না!`
            : `Cooler Incompatible: Cooler does not support socket ${cpuSocket}!`
        );
      }
    }

    const coolerTdp = cooler.specs.coolerTdpRating || 0;
    if (coolerTdp > 0 && cpuTdp > coolerTdp) {
      warnings.push(
        lang === 'bn'
          ? `কুলার সক্ষমতা সতর্কতা: প্রসেসরের TDP (${cpuTdp}W) কুলারের ধারণক্ষমতার (${coolerTdp}W) চেয়ে বেশি। ওভারহিটিং হতে পারে।`
          : `Cooler Capacity Warning: CPU TDP (${cpuTdp}W) exceeds cooler rating (${coolerTdp}W).`
      );
    }
  }

  // 7. Storage Interface Check
  if (storage && motherboard) {
    const storageType = storage.specs.storageInterface;
    const mbStorage = motherboard.specs.storageInterface;

    if (storageType && storageType.includes('M.2 NVMe') && mbStorage && !mbStorage.includes('M.2')) {
      errors.push(
        lang === 'bn'
          ? 'স্টোরেজ ইন্টারফেস অমিল: মাদারবোর্ডে M.2 NVMe স্লট উল্লেখ নেই।'
          : 'Storage Interface Mismatch: Motherboard lacks M.2 NVMe slot.'
      );
    }
  }

  // Determine overall status
  let status: CompatibilityStatus = 'compatible';

  if (errors.length > 0) {
    status = 'incompatible';
  } else if (hasMissingEssentialSpecs) {
    status = 'insufficient_data';
  } else if (warnings.length > 0) {
    status = 'needs_verification';
  }

  return {
    status,
    warnings,
    errors,
    notes,
    estimatedWattage,
    recommendedPsuWattage,
  };
}
