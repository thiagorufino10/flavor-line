const USB_PRINTER_FILTERS = [
  { classCode: 0x07 },
  { vendorId: 0x1664 },
  { vendorId: 0x0A5F },
  { vendorId: 0x04B8 },
  { vendorId: 0x0B00 },
  { vendorId: 0x154F },
  { vendorId: 0x0416 },
] as const;

type USBDeviceLike = {
  vendorId?: number;
  productId?: number;
  manufacturerName?: string;
  productName?: string;
  serialNumber?: string;
  deviceClass?: number;
};

export type DetectedUSBPrinter = {
  id: string;
  label: string;
  name: string;
  manufacturer: string;
  productId?: number;
  vendorId?: number;
};

const getNavigatorUSB = () => {
  if (typeof navigator === "undefined" || !("usb" in navigator)) {
    return null;
  }

  return (navigator as Navigator & {
    usb: {
      getDevices: () => Promise<USBDeviceLike[]>;
      requestDevice: (options: { filters: readonly Record<string, number>[] }) => Promise<USBDeviceLike>;
    };
  }).usb;
};

export const isUSBSupported = () => Boolean(getNavigatorUSB());

const isPrinterCandidate = (device: USBDeviceLike) => {
  const manufacturer = `${device.manufacturerName || ""} ${device.productName || ""}`.toLowerCase();

  return (
    device.deviceClass === 0x07 ||
    manufacturer.includes("printer") ||
    manufacturer.includes("argox") ||
    manufacturer.includes("zebra") ||
    manufacturer.includes("epson") ||
    manufacturer.includes("bematech") ||
    manufacturer.includes("hprt")
  );
};

export const getUSBPrinterLabel = (device: USBDeviceLike) => {
  const name = device.productName || device.manufacturerName || "Impressora USB";
  const vendor = device.vendorId?.toString(16).toUpperCase().padStart(4, "0") || "----";
  const product = device.productId?.toString(16).toUpperCase().padStart(4, "0") || "----";
  return `${name} (${vendor}:${product})`;
};

const toDetectedPrinter = (device: USBDeviceLike): DetectedUSBPrinter => ({
  id: `${device.vendorId || 0}:${device.productId || 0}:${device.serialNumber || "sem-serie"}`,
  label: getUSBPrinterLabel(device),
  name: device.productName || device.manufacturerName || "Impressora USB",
  manufacturer: device.manufacturerName || "Fabricante não identificado",
  vendorId: device.vendorId,
  productId: device.productId,
});

export const detectUSBPrinters = async ({ requestAccess = true }: { requestAccess?: boolean } = {}) => {
  const usb = getNavigatorUSB();

  if (!usb) {
    return [];
  }

  let devices = await usb.getDevices();

  if (devices.length === 0 && requestAccess) {
    const selectedDevice = await usb.requestDevice({
      filters: USB_PRINTER_FILTERS,
    });

    devices = selectedDevice ? [selectedDevice, ...(await usb.getDevices())] : await usb.getDevices();
  }

  const uniquePrinters = new Map<string, DetectedUSBPrinter>();

  devices.filter(isPrinterCandidate).forEach((device) => {
    const printer = toDetectedPrinter(device);
    uniquePrinters.set(printer.id, printer);
  });

  return Array.from(uniquePrinters.values());
};
