'use strict';

const express = require('express');
const router = express.Router();

const LIMITS = {
  small: 10,
  medium: 25,
  detailed: 50,
};

function text(value, max = 240) {
  return String(value || '').trim().slice(0, max);
}

function validateGraph(input, maxNodes = 25) {
  if (!input || !Array.isArray(input.nodes) || !Array.isArray(input.edges)) {
    throw new Error('The graph response must contain nodes and edges arrays.');
  }
  if (input.nodes.length === 0 || input.nodes.length > maxNodes) {
    throw new Error(`The graph must contain between 1 and ${maxNodes} nodes.`);
  }

  const ids = new Set();
  const nodes = input.nodes.map((node) => {
    const id = text(node.id, 80).replace(/[^a-zA-Z0-9_.:-]/g, '-');
    if (!id || ids.has(id)) throw new Error('Graph nodes must have unique IDs.');
    ids.add(id);
    return {
      id,
      label: text(node.label || id, 120),
      type: text(node.type || 'component', 40).toLowerCase(),
      description: text(node.description, 300),
    };
  });

  const edgeIds = new Set();
  const edges = input.edges.slice(0, maxNodes * 3).map((edge, index) => {
    const source = text(edge.source, 80);
    const target = text(edge.target, 80);
    const id = text(edge.id || `edge-${index + 1}`, 100).replace(/[^a-zA-Z0-9_.:-]/g, '-');
    if (!source || !target || !ids.has(source) || !ids.has(target)) {
      throw new Error('Every edge must reference existing source and target nodes.');
    }
    if (edgeIds.has(id)) throw new Error('Graph edges must have unique IDs.');
    edgeIds.add(id);
    return { id, source, target, label: text(edge.label || 'related to', 120) };
  });

  return { nodes, edges };
}

function parseModelJson(content) {
  const raw = String(content || '').trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(raw);
}

async function requestGraph(prompt, detail, expansion = false) {
  if (!process.env.OPENROUTER_API_KEY) {
    const error = new Error('AI graph generation is not configured on the server.');
    error.status = 503;
    throw error;
  }

  const maxNodes = LIMITS[detail] || LIMITS.medium;
  const system = `You are a graph-generation engine. Return ONLY valid JSON with this exact shape: {"nodes":[{"id":"unique-id","label":"Display Name","type":"category","description":"short explanation"}],"edges":[{"id":"unique-edge-id","source":"node-id","target":"node-id","label":"relationship"}]}. Create meaningful, non-duplicate entities and relationships. Keep the graph under ${maxNodes} nodes. Never return markdown, HTML, SVG, frontend code, URLs, or commentary.`;
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:3001',
      'X-Title': process.env.OPENROUTER_APP_NAME || 'ChainTrace AI Graph Lab',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
      temperature: 0.15,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: expansion ? `Expand this node using the existing graph context. Return only new related nodes and edges.\n${prompt}` : prompt },
      ],
    }),
  });

  if (!response.ok) {
    const error = new Error(response.status === 429 ? 'The AI service is rate-limited. Try again shortly.' : 'The AI service is temporarily unavailable.');
    error.status = response.status === 429 ? 429 : 502;
    throw error;
  }

  const payload = await response.json();
  return validateGraph(parseModelJson(payload.choices?.[0]?.message?.content), maxNodes);
}

router.post('/generate', async (req, res, next) => {
  try {
    const prompt = text(req.body?.prompt, 2000);
    const detail = String(req.body?.detail || 'medium').toLowerCase();
    if (prompt.length < 5) return res.status(400).json({ error: 'Describe a project or topic with at least 5 characters.' });
    if (!LIMITS[detail]) return res.status(400).json({ error: 'Detail must be small, medium, or detailed.' });
    const graph = await requestGraph(prompt, detail);
    return res.json({ success: true, data: graph, detail });
  } catch (error) {
    return res.status(error.status || 422).json({ error: error.message || 'The graph response could not be understood. Try again.' });
  }
});

router.post('/expand', async (req, res, next) => {
  try {
    const detail = String(req.body?.detail || 'medium').toLowerCase();
    const maxNodes = LIMITS[detail] || LIMITS.medium;
    const graph = validateGraph(req.body?.graph, maxNodes);
    const nodeId = text(req.body?.nodeId, 80);
    const node = graph.nodes.find((item) => item.id === nodeId);
    if (!node) return res.status(400).json({ error: 'Selected graph node was not found.' });
    if (graph.nodes.length >= maxNodes) return res.status(400).json({ error: 'This graph has reached its selected detail limit.' });
    const expansion = await requestGraph(JSON.stringify({ selectedNode: node, existingGraph: graph }), detail, true);
    const allowedIds = new Set(graph.nodes.map((item) => item.id));
    expansion.nodes = expansion.nodes.filter((item) => !allowedIds.has(item.id)).slice(0, maxNodes - graph.nodes.length);
    const expansionIds = new Set(expansion.nodes.map((item) => item.id));
    expansion.edges = expansion.edges.filter((edge) => expansionIds.has(edge.source) || expansionIds.has(edge.target));
    return res.json({ success: true, data: expansion });
  } catch (error) {
    return res.status(error.status || 422).json({ error: error.message || 'The graph expansion could not be understood. Try again.' });
  }
});

module.exports = router;