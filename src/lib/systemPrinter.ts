type QZTrayApi = {
  security?: {
    setCertificatePromise?: (
      promiseHandler: () => Promise<string> | string,
      options?: { rejectOnFailure?: boolean },
    ) => void;
    setSignaturePromise?: (promiseFactory: (toSign: string) => Promise<string> | string) => void;
  };
  websocket: {
    connect: (options?: Record<string, unknown>) => Promise<void>;
    isActive: () => boolean;
    setClosedCallbacks?: (callback: () => void) => void;
    setErrorCallbacks?: (callback: (error: unknown) => void) => void;
  };
  printers: {
    find: (query?: string) => Promise<string[] | string>;
  };
  configs: {
    create: (printer: string, options?: Record<string, unknown>) => unknown;
  };
  print: (config: unknown, data: Array<Record<string, string>>) => Promise<void>;
};

let qzConnectionPromise: Promise<void> | null = null;
let qzConfigured = false;

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return "Não foi possível se comunicar com o QZ Tray.";
};

const normalizeQZError = (error: unknown) => {
  const message = getErrorMessage(error);

  if (
    message.includes("A connection to QZ has not been established yet") ||
    message.includes("Unable to establish connection with QZ") ||
    message.includes("Unable to create a websocket connection") ||
    message.includes("ECONNREFUSED")
  ) {
    return new Error(
      "Não foi possível conectar ao QZ Tray. Verifique se ele está aberto e autorizado no Windows.",
    );
  }

  if (message.toLowerCase().includes("request blocked")) {
    return new Error(
      "O QZ Tray bloqueou esta solicitação. Autorize este site na janela do QZ Tray e tente novamente.",
    );
  }

  return new Error(message);
};

const getConnectionOptions = () => ({
  host: "localhost",
  usingSecure: typeof window !== "undefined" ? window.location.protocol === "https:" : true,
  retries: 1,
  delay: 0,
});

const configureQZ = (qz: QZTrayApi) => {
  if (qzConfigured) {
    return;
  }

  qzConfigured = true;
  qz.security?.setCertificatePromise?.(async () => "", { rejectOnFailure: false });
  qz.security?.setSignaturePromise?.(async () => "");
  qz.websocket.setClosedCallbacks?.(() => {
    qzConnectionPromise = null;
  });
  qz.websocket.setErrorCallbacks?.((error) => {
    console.error("QZ Tray websocket error:", error);
  });
};

const getQZ = async (): Promise<QZTrayApi> => {
  const module = await import("qz-tray");
  return (module as { default: QZTrayApi }).default;
};

const ensureConnected = async (qz: QZTrayApi) => {
  configureQZ(qz);

  if (qz.websocket.isActive()) {
    if (qzConnectionPromise) {
      await qzConnectionPromise;
    }
    return;
  }

  if (!qzConnectionPromise) {
    qzConnectionPromise = qz.websocket.connect(getConnectionOptions()).catch((error) => {
      qzConnectionPromise = null;
      throw normalizeQZError(error);
    });
  }

  await qzConnectionPromise;
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
