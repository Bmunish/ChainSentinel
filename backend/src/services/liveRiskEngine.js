'use strict';

function normalizeTx(tx) {
	return {
		sender: String(tx.sender || '').toLowerCase(),
		receiver: String(tx.receiver || '').toLowerCase(),
		amount: Number(tx.amount || 0),
		timestamp: Number(tx.timestamp || Date.now()),
		tx_hash: String(tx.tx_hash || tx.hash || '').toLowerCase(),
	};
}

function calculateRiskScore(walletCategory, behaviours = [], counterparties = []) {
	const baseMap = {
		SEED_WALLET: 40,
		MIXER_POOL: 100,
		SANCTIONED_ENTITY: 100,
		TRANSIT_INTERMEDIARY: 25,
		REGULATED_VASP: 20,
		UNLABELED_WALLET: 10,
	};
	const baseScore = baseMap[walletCategory] || 10;
	const factors = [{ name: `Base Profile: ${walletCategory}`, points: baseScore }];
	let score = baseScore;

	behaviours.forEach(behaviour => {
		const points = Number(behaviour.penalty) || 0;
		score += points;
		factors.push({ name: behaviour.rule, points, reason: behaviour.reason });
	});

	const categories = counterparties.map(item => String(item.category || item.type || '').toUpperCase());
	if (categories.includes('MIXER_POOL') || categories.includes('MIXER')) {
		score += 45;
		factors.push({ name: 'INDIRECT_MIXER_EXPOSURE', points: 45, reason: 'Transacted with a known mixer pool' });
	}
	if (categories.includes('DARKNET')) {
		score += 40;
		factors.push({ name: 'DARKNET_EXPOSURE', points: 40, reason: 'Exposure to a darknet marketplace' });
	}

	const finalScore = Math.min(100, Math.max(0, score));
	const level = finalScore >= 86 ? 'CRITICAL' : finalScore >= 71 ? 'HIGH' : finalScore >= 31 ? 'MEDIUM' : 'LOW';
	return { score: finalScore, level, baseScore, factors };
}

function evaluateLiveBehaviours(walletAddress, transactions = []) {
	const target = String(walletAddress || '').toLowerCase();
	const txs = transactions.map(normalizeTx).filter(tx => tx.sender || tx.receiver);
	const outgoing = txs.filter(tx => tx.sender === target).sort((a, b) => a.timestamp - b.timestamp);
	const incoming = txs.filter(tx => tx.receiver === target).sort((a, b) => a.timestamp - b.timestamp);
	const behaviours = [];
	const mixerAddresses = new Set(['0x722122df12d45044dd7917c805eb3a1f81014e7a', '0x47ce0c61d0e0f0e5f663cfd50805506c3a0120b1', '0x910cbd523d972eb0a6f4cae4618ad62622b39dbf', '0xa160cdab225685da1d56aa342ad8841c3b53f291', '0xd90e2f925da726b50c4ed8d0fb90ad053324f31b']);
	const bridgeAddresses = new Set(['0x280e4d75a1aa087967480848d536a73653aa0508', '0x4d9079bb4165aeb4084c526a32695dcfd2f77381', '0x5c7d92366f4c17b40677c3f917da06f225a4245b']);

	if (txs.some(tx => mixerAddresses.has(tx.sender) || mixerAddresses.has(tx.receiver))) behaviours.push({ rule: 'MIXER_INTERACTION', penalty: 30, reason: 'Direct interaction with a known mixer' });
	if (txs.some(tx => bridgeAddresses.has(tx.sender) || bridgeAddresses.has(tx.receiver))) behaviours.push({ rule: 'CHAIN_HOPPING', penalty: 15, reason: 'Funds routed through a cross-chain bridge' });

	for (let i = 0; i < outgoing.length; i += 1) {
		const window = outgoing.filter(tx => tx.timestamp - outgoing[i].timestamp <= 10 * 60 * 1000 && tx.timestamp >= outgoing[i].timestamp);
		if (new Set(window.map(tx => tx.receiver)).size >= 3) {
			behaviours.push({ rule: 'RAPID_FAN_OUT', penalty: 25, reason: 'Funds dispersed to at least three recipients within ten minutes' });
			break;
		}
	}
	if (outgoing.some((tx, index) => outgoing.slice(index).filter(next => next.timestamp - tx.timestamp <= 60 * 60 * 1000).reduce((sum, next) => sum + next.amount, 0) >= 15)) behaviours.push({ rule: 'HIGH_VELOCITY', penalty: 20, reason: 'At least 15 ETH routed within one hour' });
	if (incoming.length && outgoing.length && incoming.some(input => outgoing.some(output => output.timestamp >= input.timestamp && output.timestamp <= input.timestamp + 5 * 60 * 1000 && output.amount >= input.amount * 0.95 && input.amount > 0.1))) behaviours.push({ rule: 'IMMEDIATE_FORWARDING', penalty: 15, reason: 'Funds forwarded within five minutes of receipt' });
	return behaviours;
}

function aggregateGraphEdges(transactions = []) {
	const groups = new Map();
	transactions.forEach(tx => {
		const source = String(tx.sender || tx.source || '').trim();
		const target = String(tx.receiver || tx.target || '').trim();
		if (!source || !target) return;
		const key = `${source.toLowerCase()}->${target.toLowerCase()}`;
		const current = groups.get(key) || { source, target, amount: 0, count: 0 };
		current.amount += Number(tx.amount || 0);
		current.count += 1;
		groups.set(key, current);
	});
	return Array.from(groups.values()).map(edge => ({
		...edge,
		label: edge.amount > 0 ? `${edge.amount} ETH (${edge.count} txs)` : `${edge.count} calls ($0.00)`,
	}));
}

module.exports = { calculateRiskScore, evaluateLiveBehaviours, aggregateGraphEdges };
