type QZTrayApi = {
  websocket: {
    connect: () => Promise<void>;
    isActive: () => boolean;
  };
  printers: {
    find: (query?: string) => Promise<string[] | string>;
  };
  configs: {
    create: (printer: string, options?: Record<string, unknown>) => unknown;
  };
  print: (config: unknown, data: Array<Record<string, string>>) => Promise<void>;
};

const getQZ = async (): Promise<QZTrayApi> => {
  const module = await import("qz-tray");
  return (module as { default: QZTrayApi }).default;
};

const ensureConnected = async (qz: QZTrayApi) => {
  if (!qz.websocket.isActive()) {
    await qz.websocket.connect();
  }
};

export const getSystemPrinters = async (): Promise<string[]> => {
  const qz = await getQZ();
  await ensureConnected(qz);
  const printers = await qz.printers.find();
  return Array.isArray(printers) ? printers : [printers];
};

export const printHtmlToSystemPrinter = async (printerName: string, html: string) => {
  const qz = await getQZ();
  await ensureConnected(qz);

  const printer = await qz.printers.find(printerName);
  const resolvedPrinter = Array.isArray(printer) ? printer[0] : printer;

  if (!resolvedPrinter) {
    throw new Error("Impressora não encontrada no sistema.");
  }

  const config = qz.configs.create(resolvedPrinter, { copies: 1 });

  await qz.print(config, [
    {
      type: "pixel",
      format: "html",
      flavor: "plain",
      data: html,
    },
  ]);
};
