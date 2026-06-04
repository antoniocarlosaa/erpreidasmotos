import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import PizZip from "pizzip";
import { Contract, Signature } from "@/types";
import { formatCPF } from "@/utils/validators";
import { formatCurrency, formatMileage } from "@/utils/formatters";

// Helper para quebras de linha em PDFs
function wrapText(text: string, maxLength: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + word).length > maxLength) {
      lines.push(currentLine.trim());
      currentLine = word + " ";
    } else {
      currentLine += word + " ";
    }
  }
  if (currentLine) {
    lines.push(currentLine.trim());
  }
  return lines;
}

// Helper para escapar XML na geração do DOCX
function escapeXml(unsafe: string): string {
  if (!unsafe) return "";
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
      default: return c;
    }
  });
}

// Retorna os parágrafos estruturados do contrato com base na modalidade
function getContractTextStructure(contract: Contract, signaturesList: Signature[]) {
  const buyer = contract.client;
  const vehicle = contract.vehicle;
  const company = (contract.seller as any)?.company;
  const sellerCompany = company?.name || "Gerenciador de Contratos";
  const sellerName = contract.seller?.name || "Representante do Vendedor";

  const companyDocument = company?.document ? `, inscrito no CNPJ sob o nº ${company.document}` : "";
  const companyAddress = company?.address ? `, sediado em ${company.address}` : "";
  const companyPhone = company?.phone ? `, Telefone: ${company.phone}` : "";
  const companyEmail = company?.email ? `, E-mail: ${company.email}` : "";

  const sellerDetails = `${sellerCompany}${companyDocument}${companyAddress}${companyPhone}${companyEmail}`;

  const dateStr = contract.created_at
    ? new Date(contract.created_at).toLocaleDateString("pt-BR")
    : new Date().toLocaleDateString("pt-BR");

  let title = "CONTRATO DE COMPRA E VENDA DE VEÍCULO";
  let modalityText = "Venda à Vista";
  if (contract.modality === "vista") {
    title = "RECIBO CONTRATO DE VENDA DE VEÍCULO USADO";
    modalityText = "Venda à Vista";
  } else if (contract.modality === "financiada") {
    title = "CONTRATO DE COMPRA E VENDA DE VEÍCULO COM FINANCIAMENTO";
    modalityText = "Venda Financiada";
  } else if (contract.modality === "compra_venda") {
    title = "RECIBO CONTRATO DE COMPRA E VENDA DE VEÍCULO";
    modalityText = "Compra e Venda (Troca)";
  } else if (contract.modality === "repasse") {
    title = "TERMO DE COMPRA E VENDA DE VEÍCULO NO ESTADO (REPASSE)";
    modalityText = "Venda em Estado de Repasse";
  } else if (contract.modality === "compra") {
    title = "RECIBO CONTRATO DE COMPRA DE VEÍCULO";
    modalityText = "Só Compra";
  } else if (contract.modality === "consignado") {
    title = "CONTRATO DE CONSIGNAÇÃO DE VEÍCULO AUTOMOTOR";
    modalityText = "Consignação";
  }

  const paragraphs: string[] = [
    `CONTRATO Nº: #${contract.contract_number}`,
    `DATA DA VENDA: ${dateStr}`,
    `MODALIDADE: ${modalityText.toUpperCase()}`,
    "",
    "1. DAS PARTES CONTRATANTES",
    contract.modality === "compra"
      ? `VENDEDOR: ${buyer?.name || "N/A"}, portador do CPF ${buyer?.cpf ? formatCPF(buyer.cpf) : "N/A"}, RG ${buyer?.rg || "N/A"}, CNH ${buyer?.cnh || "N/A"}, residente em ${buyer?.address || "N/A"}, ${buyer?.neighborhood || "N/A"}, ${buyer?.city || "N/A"}-${buyer?.state || "MA"}, doravante denominado simplesmente VENDEDOR.`
      : contract.modality === "consignado"
      ? `CONSIGNANTE: ${buyer?.name || "N/A"}, portador do CPF ${buyer?.cpf ? formatCPF(buyer.cpf) : "N/A"}, RG ${buyer?.rg || "N/A"}, CNH ${buyer?.cnh || "N/A"}, residente em ${buyer?.address || "N/A"}, ${buyer?.neighborhood || "N/A"}, ${buyer?.city || "N/A"}-${buyer?.state || "MA"}, doravante denominado simplesmente CONSIGNANTE.`
      : `VENDEDOR: ${sellerDetails}, representada neste ato por ${sellerName}, doravante denominado simplesmente VENDEDOR.`,
    contract.modality === "compra"
      ? `COMPRADOR: ${sellerDetails}, representada neste ato por ${sellerName}, doravante denominado simplesmente COMPRADOR.`
      : contract.modality === "consignado"
      ? `CONSIGNATÁRIO: ${sellerDetails}, representada neste ato por ${sellerName}, doravante denominado simplesmente CONSIGNATÁRIO.`
      : `COMPRADOR: ${buyer?.name || "N/A"}, portador do CPF ${buyer?.cpf ? formatCPF(buyer.cpf) : "N/A"}, RG ${buyer?.rg || "N/A"}, CNH ${buyer?.cnh || "N/A"}, residente em ${buyer?.address || "N/A"}, ${buyer?.neighborhood || "N/A"}, ${buyer?.city || "N/A"}-${buyer?.state || "MA"}, doravante denominado simplesmente COMPRADOR.`,
  ];

  if (contract.former_owner_name) {
    paragraphs.push(
      `ANTIGO PROPRIETÁRIO (PARA EFEITO DE HISTÓRICO): ${contract.former_owner_name} (CPF/CNPJ: ${contract.former_owner_cpf ? formatCPF(contract.former_owner_cpf) : "N/A"}).`
    );
  }

  paragraphs.push(
    "",
    "2. DO OBJETO DO CONTRATO",
    `O presente contrato tem por objeto a transação do veículo automotor da marca ${vehicle?.brand || "N/A"}, modelo ${vehicle?.model || "N/A"}, ano ${vehicle?.year || "N/A"}, cor ${vehicle?.color || "N/A"}, placa ${vehicle?.plate || "N/A"}, chassi ${vehicle?.chassis || "N/A"}, renavam ${vehicle?.renavam || "N/A"}, com quilometragem de entrega de ${contract.delivery_km || vehicle?.mileage || 0} km.`
  );

  paragraphs.push(
    "",
    "3. DO PREÇO E DAS CONDIÇÕES FINANCEIRAS"
  );

  const formattedTotal = formatCurrency(contract.total_value);
  const formattedDown = formatCurrency(contract.down_payment);

  if (contract.modality === "vista") {
    paragraphs.push(
      `O valor total acordado para a venda do veículo é de R$ ${formattedTotal}, a ser pago à vista no ato de assinatura deste contrato por meio de PIX, transferência bancária ou dinheiro.`
    );
  } else if (contract.modality === "financiada") {
    const financed = Math.max(contract.total_value - contract.down_payment, 0);
    const formattedFinanced = formatCurrency(financed);
    
    let pmtVal = financed / (contract.installments_count || 1);
    if (contract.interest_rate > 0) {
      const i = contract.interest_rate / 100;
      const n = contract.installments_count;
      pmtVal = (financed * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
    }
    const formattedPmt = formatCurrency(pmtVal);

    paragraphs.push(
      `O valor de venda total é de R$ ${formattedTotal}, sendo estruturado nas seguintes condições:`,
      `- Sinal / Entrada: R$ ${formattedDown} pago na assinatura do contrato.`,
      `- Saldo Financiado: R$ ${formattedFinanced} parcelado em ${contract.installments_count} parcelas mensais e sucessivas de R$ ${formattedPmt} cada.`
    );
  } else if (contract.modality === "compra_venda") {
    paragraphs.push(
      `O valor total do negócio é de R$ ${formattedTotal}. A transação envolve a entrega de um veículo como parte do pagamento (troca).`
    );
  } else if (contract.modality === "repasse") {
    paragraphs.push(
      `O veículo é vendido no estado em que se encontra pelo preço de repasse de R$ ${formattedTotal}, com desconto especial em razão da ausência de garantias mecânicas ou estéticas de pátio.`
    );
  } else if (contract.modality === "compra") {
    const appraised = contract.appraised_value ? formatCurrency(contract.appraised_value) : formattedTotal;
    const net = contract.net_value ? formatCurrency(contract.net_value) : formattedTotal;
    paragraphs.push(
      `O valor total de avaliação do veículo objeto da aquisição é de R$ ${appraised}.`,
      `Após deduções de eventuais débitos junto ao Detran, multas ou valores necessários para quitação fiduciária faturada por instituição financeira, o valor líquido final a ser pago pela concessionária ao vendedor é de R$ ${net}.`
    );
  } else if (contract.modality === "consignado") {
    const consignationPeriod = contract.consignation_period_days || 60;
    const consignationOwnerValStr = contract.consignation_owner_value ? formatCurrency(contract.consignation_owner_value) : "0,00";
    paragraphs.push(
      `O veículo objeto deste contrato é entregue pelo CONSIGNANTE ao CONSIGNATÁRIO em regime de consignação pelo prazo determinado de ${consignationPeriod} dias.`,
      `O valor mínimo líquido garantido ao CONSIGNANTE (proprietário) em caso de venda definitiva do veículo é de R$ ${consignationOwnerValStr}.`,
      `O valor estimado de venda ao público final é de R$ ${formattedTotal}. A remuneração do CONSIGNATÁRIO (loja) consistirá na diferença (sobrepreço) entre o valor final de venda e o valor mínimo líquido garantido ao proprietário.`
    );
  }

  if (contract.negotiation_agreement) {
    paragraphs.push(
      `Detalhamento Comercial / Forma de Pagamento: ${contract.negotiation_agreement}`
    );
  }

  paragraphs.push(
    "",
    "4. DO TERMO DE GARANTIA E PROGRAMAÇÃO DE TROCA DE ÓLEO"
  );

  if (contract.modality === "repasse") {
    paragraphs.push(
      "CLÁUSULA DE REPASSE (SEM GARANTIA): O COMPRADOR declara estar ciente de que o veículo é comercializado sob modalidade de REPASSE, no estado de conservação em que se encontra, sem garantias de motor, caixa de câmbio ou qualquer acessório. O comprador assume total responsabilidade por manutenções preventivas ou corretivas futuras, isentando o vendedor de quaisquer obrigações, ressalvada a garantia legal de procedência documental."
    );
  } else if (contract.modality === "compra") {
    paragraphs.push(
      "GARANTIA DE PROCEDÊNCIA E EVICÇÃO: O VENDEDOR (Cliente) declara e garante, sob as penas da lei, que o veículo está livre e desembaraçado de ônus, gravames, restrições financeiras ou judiciais, responsabilizando-se civil e criminalmente por toda a procedência documental do veículo, bem como pelos riscos de evicção nos termos da legislação civil vigente."
    );
  } else if (contract.modality === "consignado") {
    paragraphs.push(
      "CLÁUSULA DE DEPOSITÁRIO E RESPONSABILIDADES: O CONSIGNATÁRIO assume a guarda e posse provisória do veículo na qualidade de depositário, obrigando-se a conservá-lo em perfeito estado. O CONSIGNANTE declara, sob as penas da lei, inexistirem vícios ocultos ou restrições graves que comprometam a segurança ou comercialização do veículo. Em caso de desistência ou expiração do prazo sem venda, o veículo será restituído ao CONSIGNANTE, que arcará com as despesas eventuais de retirada se previamente acordado."
    );
  } else {
    paragraphs.push(
      contract.warranty_text || 
      "O VENDEDOR concede ao COMPRADOR garantia de 90 dias (conforme artigo 26 do Código de Defesa do Consumidor) para motor e caixa de câmbio. A garantia não cobre peças de desgaste natural, mau uso ou negligência."
    );
    if (contract.delivery_km) {
      paragraphs.push(
        `Programação de Troca de Óleo Recomendada (a contar da entrega com ${contract.delivery_km} km):`,
        `- 1ª Troca de Óleo (500km): com ${contract.delivery_km + 500} km`,
        `- 2ª Troca de Óleo (1000km): com ${contract.delivery_km + 1000} km`,
        `- 3ª Troca de Óleo (2000km): com ${contract.delivery_km + 2000} km`
      );
    }
  }

  if (contract.notes) {
    paragraphs.push(
      "",
      "5. OBSERVAÇÕES E NOTAS ESPECIAIS",
      contract.notes
    );
  }

  if (contract.custom_clauses && contract.custom_clauses.length > 0) {
    paragraphs.push(
      "",
      "6. CLÁUSULAS ADICIONAIS"
    );
    contract.custom_clauses.forEach((clause, index) => {
      paragraphs.push(`${index + 1}. ${clause}`);
    });
  }

  paragraphs.push(
    "",
    "ASSINATURAS E VALIDAÇÃO",
    contract.modality === "compra"
      ? `Vendedor (Cliente): ${buyer?.name || "N/A"} - ${signaturesList.some(s => s.role === "vendedor") ? "ASSINADO DIGITALMENTE" : "ASSINATURA PENDENTE"}`
      : contract.modality === "consignado"
      ? `Consignante (Cliente): ${buyer?.name || "N/A"} - ${signaturesList.some(s => s.role === "vendedor") ? "ASSINADO DIGITALMENTE" : "ASSINATURA PENDENTE"}`
      : `Vendedor (Loja): ${sellerName} - ${signaturesList.some(s => s.role === "vendedor") ? "ASSINADO DIGITALMENTE" : "ASSINATURA PENDENTE"}`,
    contract.modality === "compra"
      ? `Comprador (Loja): ${sellerName} - ${signaturesList.some(s => s.role === "comprador") ? "ASSINADO DIGITALMENTE" : "ASSINATURA PENDENTE"}`
      : contract.modality === "consignado"
      ? `Consignatário (Loja): ${sellerName} - ${signaturesList.some(s => s.role === "comprador") ? "ASSINADO DIGITALMENTE" : "ASSINATURA PENDENTE"}`
      : `Comprador (Cliente): ${buyer?.name || "N/A"} - ${signaturesList.some(s => s.role === "comprador") ? "ASSINADO DIGITALMENTE" : "ASSINATURA PENDENTE"}`
  );

  return { title, paragraphs };
}

// Gera o arquivo DOCX editável e retorna o Buffer correspondente
export function generateDOCX(contract: Contract, signaturesList: Signature[]): Buffer {
  const { title, paragraphs } = getContractTextStructure(contract, signaturesList);
  
  const zip = new PizZip();
  
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  let documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="32"/>
        </w:rPr>
        <w:t>${escapeXml(title)}</w:t>
      </w:r>
    </w:p>
    <w:p/>
  `;

  for (const p of paragraphs) {
    if (!p.trim()) {
      documentXml += `<w:p/>`;
      continue;
    }
    
    const isHeading = 
      p.startsWith("1.") || 
      p.startsWith("2.") || 
      p.startsWith("3.") || 
      p.startsWith("4.") || 
      p.startsWith("5.") || 
      p.startsWith("6.") || 
      p.startsWith("CLÁUSULA") || 
      p.startsWith("CONTRATANTE") || 
      p.startsWith("OBJETO") || 
      p.startsWith("ASSINATURAS") ||
      p.startsWith("DATA") ||
      p.startsWith("MODALIDADE") ||
      p.startsWith("CONTRATO");

    documentXml += `
    <w:p>
      <w:pPr>
        <w:jc w:val="both"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          ${isHeading ? "<w:b/>" : ""}
          <w:sz w:val="22"/>
        </w:rPr>
        <w:t>${escapeXml(p)}</w:t>
      </w:r>
    </w:p>
    `;
  }

  documentXml += `
      <w:sectPr>
        <w:pgSz w:w="11906" w:h="16838"/>
        <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
      </w:sectPr>
    </w:body>
  </w:document>`;

  zip.file("[Content_Types].xml", contentTypesXml);
  zip.file("_rels/.rels", relsXml);
  zip.file("word/document.xml", documentXml);

  return zip.generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  }) as Buffer;
}

// Gera o arquivo PDF e retorna em formato base64 string
export async function generatePDF(contract: Contract, signaturesList: Signature[]): Promise<string> {
  const { title, paragraphs } = getContractTextStructure(contract, signaturesList);

  const pdfDoc = await PDFDocument.create();
  const fontNormal = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([595.28, 841.89]);
  let y = 800;

  // Título da página
  page.drawText(title, {
    x: 50,
    y,
    size: 12,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  y -= 30;

  for (const p of paragraphs) {
    if (y < 60) {
      // Cria nova página
      page = pdfDoc.addPage([595.28, 841.89]);
      y = 800;
    }

    if (!p.trim()) {
      y -= 12;
      continue;
    }

    const isHeading = 
      p.startsWith("1.") || 
      p.startsWith("2.") || 
      p.startsWith("3.") || 
      p.startsWith("4.") || 
      p.startsWith("5.") || 
      p.startsWith("6.") || 
      p.startsWith("ASSINATURAS") ||
      p.startsWith("MODALIDADE") ||
      p.startsWith("CONTRATO");

    const lines = wrapText(p, 85);
    for (const line of lines) {
      if (y < 60) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = 800;
      }

      page.drawText(line, {
        x: isHeading ? 50 : 60,
        y,
        size: isHeading ? 9.5 : 8.5,
        font: isHeading ? fontBold : fontNormal,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= 13;
    }
    y -= 5;
  }

  // Seção de Assinaturas Visuais no final da última página
  y -= 25;
  if (y < 150) {
    page = pdfDoc.addPage([595.28, 841.89]);
    y = 800;
  }

  page.drawText("ASSINATURAS COLHIDAS DIGITALMENTE:", {
    x: 50,
    y,
    size: 10,
    font: fontBold,
  });
  y -= 60;

  const buyerSig = signaturesList.find(s => s.role === "comprador");
  const sellerSig = signaturesList.find(s => s.role === "vendedor");

  // Assinatura do Comprador
  const buyerTitle = contract.modality === "compra" ? "COMPRADOR (LOJA):" : contract.modality === "consignado" ? "CONSIGNATÁRIO (LOJA):" : "COMPRADOR:";
  const buyerName = contract.modality === "compra" || contract.modality === "consignado"
    ? (contract.seller?.name || "Representante do Vendedor") 
    : (contract.client?.name || "N/A");
    
  page.drawText(buyerTitle, { x: 50, y: y + 45, size: 8, font: fontBold });
  if (buyerSig) {
    try {
      const imageBytes = Buffer.from(buyerSig.signature_data.split(",")[1], "base64");
      const pngImage = await pdfDoc.embedPng(imageBytes);
      page.drawImage(pngImage, { x: 50, y: y - 5, width: 120, height: 40 });
    } catch (e) {
      console.error("Error embedding buyer signature:", e);
    }
    page.drawText(buyerName, { x: 50, y: y - 15, size: 7, font: fontNormal });
    page.drawText(`IP: ${buyerSig.ip_address}`, { x: 50, y: y - 23, size: 6, font: fontNormal, color: rgb(0.4, 0.4, 0.4) });
    page.drawText(`Data: ${new Date(buyerSig.signed_at).toLocaleString("pt-BR")}`, { x: 50, y: y - 31, size: 6, font: fontNormal, color: rgb(0.4, 0.4, 0.4) });
  } else {
    page.drawText("Pendente", { x: 50, y: y + 10, size: 8, font: fontNormal, color: rgb(0.8, 0.2, 0.2) });
  }

  // Assinatura do Vendedor
  const sellerTitle = contract.modality === "compra" ? "VENDEDOR (CLIENTE):" : contract.modality === "consignado" ? "CONSIGNANTE (CLIENTE):" : "VENDEDOR:";
  const sellerNameText = contract.modality === "compra" || contract.modality === "consignado"
    ? (contract.client?.name || "N/A")
    : (contract.seller?.name || "Representante do Vendedor");
    
  page.drawText(sellerTitle, { x: 300, y: y + 45, size: 8, font: fontBold });
  if (sellerSig) {
    try {
      const imageBytes = Buffer.from(sellerSig.signature_data.split(",")[1], "base64");
      const pngImage = await pdfDoc.embedPng(imageBytes);
      page.drawImage(pngImage, { x: 300, y: y - 5, width: 120, height: 40 });
    } catch (e) {
      console.error("Error embedding seller signature:", e);
    }
    page.drawText(sellerNameText, { x: 300, y: y - 15, size: 7, font: fontNormal });
    page.drawText(`IP: ${sellerSig.ip_address}`, { x: 300, y: y - 23, size: 6, font: fontNormal, color: rgb(0.4, 0.4, 0.4) });
    page.drawText(`Data: ${new Date(sellerSig.signed_at).toLocaleString("pt-BR")}`, { x: 300, y: y - 31, size: 6, font: fontNormal, color: rgb(0.4, 0.4, 0.4) });
  } else {
    page.drawText("Pendente", { x: 300, y: y + 10, size: 8, font: fontNormal, color: rgb(0.8, 0.2, 0.2) });
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes).toString("base64");
}
