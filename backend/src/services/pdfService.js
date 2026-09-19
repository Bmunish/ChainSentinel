'use strict';

/**
 * pdfService.js
 * Generates automated Section 91 CrPC notices for law enforcement cryptocurrency subpoena and freeze requests.
 */

const PDFDocument = require('pdfkit');

function generateSection91Notice(caseData, seedWallet, transactions, res) {
  const doc = new PDFDocument({ margin: 50 });

  const caseNum = (caseData && (caseData.case_number || caseData.case_id)) || 'CS-ACTIVE';

  // Stream the PDF directly to the Express response
  res.setHeader('Content-disposition', `attachment; filename=Section91_Notice_${caseNum}.pdf`);
  res.setHeader('Content-type', 'application/pdf');
  doc.pipe(res);

  // --- HEADER: Official Seal & Department ---
  doc.fontSize(14).font('Helvetica-Bold').text('NOTICE UNDER SECTION 91 CrPC / BNS', { align: 'center' });
  doc.fontSize(12).text('Cyber Crime Investigation Cell', { align: 'center' });
  doc.moveDown(2);

  // --- METADATA ---
  doc.fontSize(10).font('Helvetica-Bold').text('To: ', { continued: true }).font('Helvetica').text('The Nodal / Compliance Officer, [Insert VASP/Exchange Name]');
  doc.font('Helvetica-Bold').text('Date: ', { continued: true }).font('Helvetica').text(new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }));
  doc.font('Helvetica-Bold').text('Case Reference: ', { continued: true }).font('Helvetica').text(caseNum);
  doc.moveDown(2);

  // --- SUBJECT & BODY ---
  doc.font('Helvetica-Bold').text('Subject: Requisition for KYC and Transaction Records of Suspect Cryptocurrency Wallet');
  doc.moveDown();
  
  doc.font('Helvetica').text(`During the course of investigation into cyber fraud case ${caseNum}, it has surfaced that the proceeds of crime have been routed to a cryptocurrency wallet hosted on your platform. You are hereby directed under Section 91 of the Code of Criminal Procedure (CrPC) to preserve the assets and provide the complete KYC details, IP login logs, and bank payout linkages for the following address:`, { align: 'justify' });
  doc.moveDown();

  // --- WALLET HIGHLIGHT ---
  const targetWalletAddress = (seedWallet && seedWallet.address) ? seedWallet.address : (caseData && caseData.seed_address ? caseData.seed_address : '0x7A3F...B91F');
  doc.rect(50, doc.y, 500, 30).fill('#f1f5f9');
  doc.fillColor('#000000').font('Helvetica-Bold').text(`Target Wallet: ${targetWalletAddress}`, 60, doc.y - 20);
  doc.moveDown(2);

  // --- TRANSACTION LEDGER ---
  doc.font('Helvetica-Bold').text('Associated High-Risk Transactions (Ledger Extract):');
  doc.moveDown();
  
  // Table Headers
  const startY = doc.y;
  doc.fontSize(9);
  doc.text('Date', 50, startY);
  doc.text('Tx Hash', 150, startY);
  doc.text('Amount', 420, startY);
  doc.text('Asset', 480, startY);
  
  doc.moveTo(50, startY + 12).lineTo(550, startY + 12).stroke();
  let currentY = startY + 20;

  // Table Rows (Top 10 transactions)
  const txList = Array.isArray(transactions) ? transactions : [];
  txList.slice(0, 10).forEach(tx => {
    if (currentY > 700) {
      doc.addPage();
      currentY = 50;
    }
    let dateStr = '';
    try {
      dateStr = tx.timestamp ? new Date(tx.timestamp).toISOString().split('T')[0] : '2026-08-22';
    } catch {
      dateStr = '2026-08-22';
    }
    const hash = tx.tx_hash || tx.hash || '0x0000...';
    const shortHash = hash.length > 20 ? `${hash.slice(0, 12)}...${hash.slice(-8)}` : hash;
    const amountVal = tx.amount !== undefined ? tx.amount.toString() : (tx.value || '0');
    const assetVal = tx.token_symbol || tx.token || tx.asset || 'USDT';

    doc.font('Helvetica').text(dateStr, 50, currentY);
    doc.text(shortHash, 150, currentY);
    doc.text(amountVal, 420, currentY);
    doc.text(assetVal, 480, currentY);
    currentY += 15;
  });

  doc.moveDown(3);
  
  // --- SIGNATORIES ---
  doc.y = currentY + 30;
  doc.font('Helvetica-Bold').text('Investigating Officer', 50, doc.y);
  doc.font('Helvetica').text((caseData && (caseData.assigned_to || caseData.assigned_investigator)) || 'Cyber Cell Duty Officer', 50, doc.y + 15);
  doc.text('ChainTrace Intelligence Platform', 50, doc.y + 30);

  doc.end();
}

module.exports = { generateSection91Notice };
