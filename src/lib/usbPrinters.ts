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
  open?: () => Promise<void>;
  close?: () => Promise<void>;
  selectConfiguration?: (configurationValue: number) => Promise<void>;
  claimInterface?: (interfaceNumber: number) => Promise<void>;
  releaseInterface?: (interfaceNumber: number) => Promise<void>;
  transferOut?: (endpointNumber: number, data: BufferSource) => Promise<{ status: string }>;
  configuration?: { interfaces?: Array<{ interfaceNumber: number; alternate?: { endpoints?: Array<{ direction: string; endpointNumber: number }> } }> };
};

export type DetectedUSBPrinter = {
  id: string;
  label: string;
  name: string;
  manufacturer: string;
  productId?: number;
  vendorId?: number;
};

type NavigatorUSB = {
  getDevices: () => Promise<USBDeviceLike[]>;
  requestDevice: (options: { filters: readonly Record<string, number>[] }) => Promise<USBDeviceLike>;
};

const getNavigatorUSB = (): NavigatorUSB | null => {
  if (typeof navigator === "undefined" || !("usb" in navigator)) {
    return null;
  }

  return (navigator as Navigator & { usb: NavigatorUSB }).usb;
};

export const isUSBSupported = () => Boolean(getNavigatorUSB());

const isPrinterCandidate = (device: USBDeviceLike) => {
  const deviceText = `${device.manufacturerName || ""} ${device.productName || ""}`.toLowerCase();

  return (
    device.deviceClass === 0x07 ||
    deviceText.includes("printer") ||
    deviceText.includes("argox") ||
    deviceText.includes("os") ||
    deviceText.includes("zebra") ||
    deviceText.includes("epson") ||
    deviceText.includes("bematech") ||
    deviceText.includes("hprt")
  );
};

const formatHex = (value?: number) =>
  value === undefined ? "----" : value.toString(16).toUpperCase().padStart(4, "0");

const getUSBPrinterLabel = (device: USBDeviceLike) => {
  const name = device.productName || device.manufacturerName || "Impressora USB";
  return `${name} (${formatHex(device.vendorId)}:${formatHex(device.productId)})`;
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

  if (requestAccess) {
    try {
      const selectedDevice = await usb.requestDevice({
        filters: USB_PRINTER_FILTERS,
      });

      devices = [selectedDevice, ...(await usb.getDevices())];
    } catch (error: any) {
      if (error?.name !== "NotFoundError") {
        throw error;
      }

      if (devices.length === 0) {
        throw error;
      }
    }
  }

  const uniquePrinters = new Map<string, DetectedUSBPrinter>();

  devices.filter(isPrinterCandidate).forEach((device) => {
    const printer = toDetectedPrinter(device);
    uniquePrinters.set(printer.id, printer);
  });

  return Array.from(uniquePrinters.values());
};

/**
 * Encontra o dispositivo USB real a partir do ID salvo na config.
 */
const findUSBDeviceById = async (printerId: string, requestIfNeeded = true): Promise<USBDeviceLike | null> => {
  const usb = getNavigatorUSB();
  if (!usb) return null;

  let devices = await usb.getDevices();
  let match = devices.find((d) => {
    const id = `${d.vendorId || 0}:${d.productId || 0}:${d.serialNumber || "sem-serie"}`;
    return id === printerId;
  });

  // Se não encontrou entre os autorizados, solicitar acesso novamente
  if (!match && requestIfNeeded) {
    try {
      const selected = await usb.requestDevice({ filters: USB_PRINTER_FILTERS });
      devices = [selected, ...(await usb.getDevices())];
      match = devices.find((d) => {
        const id = `${d.vendorId || 0}:${d.productId || 0}:${d.serialNumber || "sem-serie"}`;
        return id === printerId;
      });
      // Se o ID não bateu mas selecionou um dispositivo, usar ele mesmo
      if (!match && selected) {
        match = selected;
      }
    } catch {
      // Usuário cancelou ou não encontrou
    }
  }

  return match || null;
};

/**
 * Envia dados raw (texto) diretamente para a impressora USB conectada,
 * sem abrir diálogo de impressão do navegador.
 */
export const sendRawToUSBPrinter = async (printerId: string, text: string): Promise<void> => {
  const device = await findUSBDeviceById(printerId);
  if (!device) {
    throw new Error("Impressora USB não encontrada. Detecte novamente nas configurações.");
  }

  if (!device.open || !device.close || !device.selectConfiguration || !device.claimInterface || !device.releaseInterface || !device.transferOut) {
    throw new Error("Dispositivo USB não suporta operações de escrita.");
  }

  await device.open();

  try {
    if (device.configuration === null || device.configuration === undefined) {
      await device.selectConfiguration(1);
    }

    // Encontrar a interface de impressão (class 7 = Printer)
    const iface = device.configuration?.interfaces?.[0];
    if (!iface) {
      throw new Error("Nenhuma interface USB encontrada na impressora.");
    }

    const interfaceNumber = iface.interfaceNumber;
    await device.claimInterface(interfaceNumber);

    // Encontrar endpoint OUT
    const outEndpoint = iface.alternate?.endpoints?.find((ep) => ep.direction === "out");
    const endpointNumber = outEndpoint ? outEndpoint.endpointNumber : 1;

    // Converter texto para bytes e enviar
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    await device.transferOut(endpointNumber, data);

    await device.releaseInterface(interfaceNumber);
  } finally {
    await device.close();
  }
};
