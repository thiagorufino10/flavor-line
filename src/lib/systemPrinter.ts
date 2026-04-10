import * as JSPM from "jsprintmanager";

let jspmStarted = false;

const ensureStarted = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (jspmStarted && JSPM.JSPrintManager.websocket_status === JSPM.WSStatus.Open) {
      resolve();
      return;
    }

    JSPM.JSPrintManager.auto_reconnect = true;
    JSPM.JSPrintManager.start();
    jspmStarted = true;

    const timeout = setTimeout(() => {
      reject(
        new Error(
          "Não foi possível conectar ao JSPrintManager. Verifique se o aplicativo JSPM está aberto no computador.",
        ),
      );
    }, 8000);

    const check = () => {
      if (JSPM.JSPrintManager.websocket_status === JSPM.WSStatus.Open) {
        clearTimeout(timeout);
        resolve();
      } else if (JSPM.JSPrintManager.websocket_status === JSPM.WSStatus.Closed) {
        clearTimeout(timeout);
        reject(
          new Error(
            "Não foi possível conectar ao JSPrintManager. Verifique se o aplicativo JSPM está aberto no computador.",
          ),
        );
      } else {
        setTimeout(check, 200);
      }
    };

    setTimeout(check, 500);
  });
};

export const getSystemPrinters = async (): Promise<string[]> => {
  await ensureStarted();
  const printers = await JSPM.JSPrintManager.getPrinters();
  return Array.isArray(printers) ? printers : [];
};

export const printHtmlToSystemPrinter = async (printerName: string, html: string) => {
  await ensureStarted();

  const blob = new Blob([html], { type: "text/html" });

  return new Promise<void>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      try {
        const base64 = (reader.result as string).split(",")[1];
        const cpj = new JSPM.ClientPrintJob();
        cpj.clientPrinter = new JSPM.InstalledPrinter(printerName);

        const file = new JSPM.PrintFile(
          base64,
          JSPM.FileSourceType.Base64,
          "order.html",
          1,
        );
        cpj.files.push(file);
        cpj.sendToClient();
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error("Erro ao processar conteúdo para impressão."));
    reader.readAsDataURL(blob);
  });
};
