import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { jsPDFOptions } from 'jspdf';

export type PdfExportOptions = {
  fileName?: string; // 输出文件名
  format?: jsPDFOptions['format'];
  orientation?: jsPDFOptions['orientation'];
  margin?: { top?: number; right?: number; bottom?: number; left?: number }; // 单位：mm
  scale?: number; // html2canvas 缩放倍数，增大以提升清晰度
  useCORS?: boolean; // 允许跨域图片
  background?: string; // 画布背景
  onProgress?: (pageIndex: number, totalPages: number) => void; // 进度回调
};

const defaultMargin = { top: 10, right: 10, bottom: 10, left: 10 };
const defaultOptions: Required<
  Pick<
    PdfExportOptions,
    'format' | 'orientation' | 'scale' | 'useCORS' | 'background'
  >
> = {
  format: 'a4',
  orientation: 'portrait',
  scale: 2,
  useCORS: true,
  background: '#ffffff',
};

function resolveMargin(m?: PdfExportOptions['margin']) {
  return {
    top: m?.top ?? defaultMargin.top,
    right: m?.right ?? defaultMargin.right,
    bottom: m?.bottom ?? defaultMargin.bottom,
    left: m?.left ?? defaultMargin.left,
  };
}

async function captureElementCanvas(el: HTMLElement, opts: PdfExportOptions) {
  const options = { ...defaultOptions, ...opts };
  return html2canvas(el, {
    backgroundColor: options.background,
    scale: options.scale,
    useCORS: options.useCORS,
    allowTaint: false,
    logging: false,
    windowWidth: el.scrollWidth,
    windowHeight: el.scrollHeight,
  });
}

function mmForSlice(
  pxHeight: number,
  canvasWidthPx: number,
  innerWidthMm: number,
) {
  // 等比缩放：根据 PDF 内页宽度，计算片段在 PDF 中的高度（mm）
  return (pxHeight * innerWidthMm) / canvasWidthPx;
}

/**
 * 将单个元素渲染为多页 PDF（自动分页）
 */
export async function exportElementToPdf(
  elementOrSelector: HTMLElement | string,
  options: PdfExportOptions = {},
): Promise<void> {
  const opts = { ...defaultOptions, ...options };
  const margin = resolveMargin(options.margin);
  const el =
    typeof elementOrSelector === 'string'
      ? (document.querySelector(elementOrSelector) as HTMLElement | null)
      : elementOrSelector;
  if (!el) throw new Error('exportElementToPdf: 未找到目标元素');

  const canvas = await captureElementCanvas(el, opts);
  const imgWidthPx = canvas.width;
  const imgHeightPx = canvas.height;

  const doc = new jsPDF({
    orientation: opts.orientation,
    unit: 'mm',
    format: opts.format,
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const innerWidth = pageWidth - margin.left - margin.right;
  const innerHeight = pageHeight - margin.top - margin.bottom;

  // 每页可容纳的像素高度（根据内页宽度等比换算）
  const sliceHeightPx = Math.floor((innerHeight * imgWidthPx) / innerWidth);
  const totalPages = Math.max(1, Math.ceil(imgHeightPx / sliceHeightPx));

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    const sy = pageIndex * sliceHeightPx; // 源图裁剪起点像素
    const sh = Math.min(sliceHeightPx, imgHeightPx - sy); // 源图裁剪高度

    // 创建片段画布并裁剪原始 canvas 的一段
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = imgWidthPx;
    sliceCanvas.height = sh;
    const ctx = sliceCanvas.getContext('2d');
    if (!ctx) throw new Error('exportElementToPdf: 创建 canvas 失败');
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    ctx.drawImage(canvas, 0, sy, imgWidthPx, sh, 0, 0, imgWidthPx, sh);

    const imgData = sliceCanvas.toDataURL('image/png');
    const sliceHeightMm = mmForSlice(sh, imgWidthPx, innerWidth);

    if (pageIndex > 0) doc.addPage();
    doc.addImage(
      imgData,
      'PNG',
      margin.left,
      margin.top,
      innerWidth,
      sliceHeightMm,
    );

    options.onProgress?.(pageIndex + 1, totalPages);
  }

  doc.save(options.fileName || 'data-validation-report.pdf');
}

/**
 * 将多个元素依次渲染为 PDF（每个元素自动分页，元素之间自动翻页）
 */
export async function exportMultipleElementsToPdf(
  elements: Array<HTMLElement | string>,
  options: PdfExportOptions = {},
): Promise<void> {
  const opts = { ...defaultOptions, ...options };
  const margin = resolveMargin(options.margin);
  const doc = new jsPDF({
    orientation: opts.orientation,
    unit: 'mm',
    format: opts.format,
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const innerWidth = pageWidth - margin.left - margin.right;
  const innerHeight = pageHeight - margin.top - margin.bottom;

  let progressPage = 0;
  let totalPagesAll = 0;

  // 预估总页数（可选，不严格，仅用于进度回调）
  for (const elLike of elements) {
    const el =
      typeof elLike === 'string'
        ? (document.querySelector(elLike) as HTMLElement | null)
        : elLike;
    if (!el) continue;
    const canvas = await captureElementCanvas(el, opts);
    const imgWidthPx = canvas.width;
    const imgHeightPx = canvas.height;
    const sliceHeightPx = Math.floor((innerHeight * imgWidthPx) / innerWidth);
    totalPagesAll += Math.max(1, Math.ceil(imgHeightPx / sliceHeightPx));
  }

  // 正式渲染
  let firstPage = true;
  for (const elLike of elements) {
    const el =
      typeof elLike === 'string'
        ? (document.querySelector(elLike) as HTMLElement | null)
        : elLike;
    if (!el) continue;

    const canvas = await captureElementCanvas(el, opts);
    const imgWidthPx = canvas.width;
    const imgHeightPx = canvas.height;
    const sliceHeightPx = Math.floor((innerHeight * imgWidthPx) / innerWidth);
    const pages = Math.max(1, Math.ceil(imgHeightPx / sliceHeightPx));

    for (let pageIndex = 0; pageIndex < pages; pageIndex++) {
      const sy = pageIndex * sliceHeightPx;
      const sh = Math.min(sliceHeightPx, imgHeightPx - sy);

      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = imgWidthPx;
      sliceCanvas.height = sh;
      const ctx = sliceCanvas.getContext('2d');
      if (!ctx)
        throw new Error('exportMultipleElementsToPdf: 创建 canvas 失败');
      ctx.fillStyle = opts.background;
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.drawImage(canvas, 0, sy, imgWidthPx, sh, 0, 0, imgWidthPx, sh);

      const imgData = sliceCanvas.toDataURL('image/png');
      const sliceHeightMm = mmForSlice(sh, imgWidthPx, innerWidth);

      if (!firstPage) {
        doc.addPage();
      }
      firstPage = false;

      doc.addImage(
        imgData,
        'PNG',
        margin.left,
        margin.top,
        innerWidth,
        sliceHeightMm,
      );

      progressPage += 1;
      options.onProgress?.(progressPage, totalPagesAll);
    }
  }

  doc.save(options.fileName || 'data-validation-report.pdf');
}

/**
 * 根据元素 id 导出 PDF 的便捷方法
 */
export async function exportById(
  elementId: string,
  options?: PdfExportOptions,
) {
  return exportElementToPdf(`#${elementId}`, options);
}

/**
 * 快速将字符串内容导出为 PDF（简单文本报告）
 */
export async function exportTextToPdf(
  text: string,
  options: PdfExportOptions = {},
) {
  const opts = { ...defaultOptions, ...options };
  const margin = resolveMargin(options.margin);
  const doc = new jsPDF({
    orientation: opts.orientation,
    unit: 'mm',
    format: opts.format,
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const innerWidth = pageWidth - margin.left - margin.right;
  const innerHeight = pageHeight - margin.top - margin.bottom;

  // 简单的文本分段写入
  const lineHeight = 6; // mm
  const maxCharsPerLine = Math.floor(innerWidth / 3); // 粗略估计：每字符约 3mm 宽
  const lines: string[] = [];

  const words = text.split(/\s+/);
  let current = '';
  for (const w of words) {
    const tentative = current ? `${current} ${w}` : w;
    if (tentative.length > maxCharsPerLine) {
      lines.push(current);
      current = w;
    } else {
      current = tentative;
    }
  }
  if (current) lines.push(current);

  let y = margin.top;
  for (let i = 0; i < lines.length; i++) {
    if (y + lineHeight > margin.top + innerHeight) {
      doc.addPage();
      y = margin.top;
    }
    doc.text(lines[i], margin.left, y + lineHeight);
    y += lineHeight;
  }

  doc.save(options.fileName || 'data-validation-report.pdf');
}

export async function exportElementToPdfBytes(
  elementOrSelector: HTMLElement | string,
  options: PdfExportOptions = {},
): Promise<Uint8Array> {
  const opts = { ...defaultOptions, ...options };
  const margin = resolveMargin(options.margin);
  const el =
    typeof elementOrSelector === 'string'
      ? (document.querySelector(elementOrSelector) as HTMLElement | null)
      : elementOrSelector;
  if (!el) throw new Error('exportElementToPdfBytes: 未找到目标元素');

  const canvas = await captureElementCanvas(el, opts);
  const imgWidthPx = canvas.width;
  const imgHeightPx = canvas.height;

  const doc = new jsPDF({
    orientation: opts.orientation,
    unit: 'mm',
    format: opts.format,
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const innerWidth = pageWidth - margin.left - margin.right;
  const innerHeight = pageHeight - margin.top - margin.bottom;

  // 每页可容纳的像素高度（根据内页宽度等比换算）
  const sliceHeightPx = Math.floor((innerHeight * imgWidthPx) / innerWidth);
  const totalPages = Math.max(1, Math.ceil(imgHeightPx / sliceHeightPx));

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    const sy = pageIndex * sliceHeightPx; // 源图裁剪起点像素
    const sh = Math.min(sliceHeightPx, imgHeightPx - sy); // 源图裁剪高度

    // 创建片段画布并裁剪原始 canvas 的一段
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = imgWidthPx;
    sliceCanvas.height = sh;
    const ctx = sliceCanvas.getContext('2d');
    if (!ctx) throw new Error('exportElementToPdfBytes: 创建 canvas 失败');
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    ctx.drawImage(canvas, 0, sy, imgWidthPx, sh, 0, 0, imgWidthPx, sh);

    const imgData = sliceCanvas.toDataURL('image/png');
    const sliceHeightMm = mmForSlice(sh, imgWidthPx, innerWidth);

    if (pageIndex > 0) doc.addPage();
    doc.addImage(
      imgData,
      'PNG',
      margin.left,
      margin.top,
      innerWidth,
      sliceHeightMm,
    );

    options.onProgress?.(pageIndex + 1, totalPages);
  }

  const arr = doc.output('arraybuffer') as ArrayBuffer;
  return new Uint8Array(arr);
}
