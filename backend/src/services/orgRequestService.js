'use strict';

/**
 * orgRequestService.js
 * Unified Organization Intelligence Request Service.
 * Implements connectors for Cryptocurrency Exchanges, VASPs, and Banks with simulated sandbox responses.
 */

const { getDb, logAudit } = require('../db/database');

// ── Connectors ────────────────────────────────────────────────────────────────
class BaseOrganizationConnector {
  constructor(name, type) {
    this.name = name;
    this.type = type;
  }
  async sendRequest(requestPayload) {
    throw new Error('sendRequest must be implemented');
  }
}

class DemoExchangeConnector extends BaseOrganizationConnector {
  constructor() {
    super('Exchange X (Sandbox)', 'VASP');
  }

  async sendRequest(payload) {
    // Generate deterministic simulated response for demo
    const wallet = payload.wallet_address || '0x7A3F...B91F';
    return {
      status: 'RESPONSE_RECEIVED',
      source: 'SANDBOX_ORGANIZATION (Exchange X Compliance Gateway)',
      receivedAt: new Date().toISOString(),
      data: {
        account_id: 'EX-28492',
        account_holder: 'Attributed Entity Alpha',
        kyc_status: 'TIER_2_VERIFIED',
        associated_wallet: wallet,
        registered_email: 'att***alpha@encrypted-mail.org',
        registered_phone: '+971 50 *** 8921',
        country: 'United Arab Emirates',
        exchange_name: 'Exchange X',
        deposit_history_count: 4,
        total_deposit_usd: 54200.0,
        compliance_action: 'ACCOUNT_FROZEN_FOR_REVIEW',
        ip_logs: ['185.220.101.5', '194.26.29.112'],
      },
    };
  }
}

class WazirXConnector extends BaseOrganizationConnector {
  constructor() {
    super('WazirX (Sandbox)', 'EXCHANGE');
  }
  async sendRequest(payload) {
    return {
      status: 'RESPONSE_RECEIVED',
      source: 'SANDBOX_ORGANIZATION (WazirX Law Enforcement Response)',
      receivedAt: new Date().toISOString(),
      data: {
        account_id: 'WZ-99104',
        account_holder: 'Trader Node 7',
        kyc_status: 'AADHAAR_PAN_VERIFIED',
        associated_wallet: payload.wallet_address || '0xDIST_1_A9B8C7D6E5F4',
        country: 'India',
        exchange_name: 'WazirX',
        compliance_action: 'FLAGGED_UNDER_SECTION_91',
      },
    };
  }
}

class HDFCBankConnector extends BaseOrganizationConnector {
  constructor() {
    super('HDFC Bank (Sandbox)', 'BANK');
  }
  async sendRequest(payload) {
    return {
      status: 'RESPONSE_RECEIVED',
      source: 'SANDBOX_ORGANIZATION (HDFC Cyber Cell Nodal Office)',
      receivedAt: new Date().toISOString(),
      data: {
        account_number: '50100293849182',
        account_type: 'CURRENT_ACCOUNT',
        account_holder: 'Shree Sai Enterprises (Beneficiary)',
        kyc_verified: true,
        upi_vpa: 'shreesai@hdfcbank',
        branch_ifsc: 'HDFC0000240',
        freeze_status: 'DEBIT_FREEZE_INITIATED',
      },
    };
  }
}

const CONNECTORS = {
  'exchange-x': new DemoExchangeConnector(),
  'binance': new DemoExchangeConnector(),
  'wazirx': new WazirXConnector(),
  'hdfc-bank': new HDFCBankConnector(),
};

/**
 * Creates an organization request record.
 */
function createOrganizationRequest({
  case_id = 'CS-2026-001',
  organization_id = 'exchange-x',
  organization_name = 'Exchange X',
  request_type = 'KYC_AND_OWNERSHIP',
  requested_fields = ['KYC', 'ACCOUNT_OWNER', 'DEPOSIT_LOGS', 'IP_ADDRESS'],
  wallet_address = null,
  transaction_hash = null,
  reason = 'Section 91 CrPC lawful production order',
  priority = 'CRITICAL',
  created_by = 'CP-FCI-042',
}) {
  const db = getDb();
  const requestId = `OR-${Date.now().toString().slice(-5)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO organization_requests (
      id, case_id, organization_id, organization_name, request_type,
      requested_fields, wallet_address, transaction_hash, reason,
      priority, status, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    requestId,
    case_id,
    organization_id,
    organization_name,
    request_type,
    JSON.stringify(requested_fields),
    wallet_address,
    transaction_hash,
    reason,
    priority,
    'SUBMITTED',
    created_by,
    now,
    now
  );

  logAudit(created_by, `Created Organization Request ${requestId} to ${organization_name}`, 'Org_Request', requestId, 'Success');

  return {
    id: requestId,
    case_id,
    organization_id,
    organization_name,
    request_type,
    requested_fields,
    wallet_address,
    transaction_hash,
    reason,
    priority,
    status: 'SUBMITTED',
    created_by,
    created_at: now,
  };
}

/**
 * Submits and triggers sandbox fulfillment of an organization request.
 */
async function fulfillOrganizationRequest(requestId) {
  const db = getDb();
  const req = db.prepare('SELECT * FROM organization_requests WHERE id = ?').get(requestId);
  if (!recExists(req)) throw new Error(`Request ${requestId} not found`);

  const connectorKey = req.organization_id.toLowerCase();
  const connector = CONNECTORS[connectorKey] || new DemoExchangeConnector();

  const response = await connector.sendRequest(req);

  db.prepare(`
    UPDATE organization_requests
    SET status = 'RESPONSE_RECEIVED',
        response_received_at = ?,
        response_source = ?,
        response_data = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(
    response.receivedAt,
    response.source,
    JSON.stringify(response.data),
    requestId
  );

  logAudit(req.created_by, `Received response for ${requestId} from ${req.organization_name}`, 'Org_Response', requestId, 'Success');

  return {
    id: requestId,
    case_id: req.case_id,
    organization_name: req.organization_name,
    status: 'RESPONSE_RECEIVED',
    response_received_at: response.receivedAt,
    response_source: response.source,
    response_data: response.data,
  };
}

function recExists(obj) {
  return obj !== undefined && obj !== null;
}

module.exports = {
  createOrganizationRequest,
  fulfillOrganizationRequest,
};
