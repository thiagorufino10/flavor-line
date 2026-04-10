/**
 * Impressão silenciosa via Chrome em modo quiosque (--kiosk-printing).
 * Não requer software externo — apenas abrir o Chrome com a flag correta.
 */

export const getSystemPrinters = async (): Promise<string[]> => {
  // No modo quiosque, o Chrome usa a impressora padrão do sistema.
  // Não é possível listar impressoras via browser — retornamos a padrão.
  return ["Impressora Padrão do Sistema"];
};

export const printHtmlToSystemPrinter = async (_printerName: string, html: string) => {
  const printWindow = window.open("", "_blank", "width=400,height=600");

  if (!printWindow) {
    throw new Error(
      "O navegador bloqueou a janela de impressão. Permita pop-ups para este site.",
    );
  }

  printWindow.document.write(html);
  printWindow.document.close();

  return new Promise<void>((resolve) => {
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
      resolve();
    }, 300);
  });
};
