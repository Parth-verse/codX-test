// hi
const express = require('express');
const crypto = require('crypto');
const { Octokit } = require('@octokit/rest');

const app = express();

// Keep raw body for signature verification
app.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf; }
}));

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

// --- Signature verification ---
function verifySignature(req) {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) return false;

  const expected = 'sha256=' + crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(req.rawBody)
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

// --- Main webhook endpoint ---
app.post('/webhook', async (req, res) => {
  if (!verifySignature(req)) {
    return res.status(401).send('Invalid signature');
  }

  const event = req.headers['x-github-event'];
  const payload = req.body;

  // Respond immediately so GitHub doesn't retry on slow processing
  res.status(202).send('Accepted');

  if (event === 'pull_request') {
    await handlePullRequestEvent(payload);
  }
});

// --- Detect PR actions we care about ---
async function handlePullRequestEvent(payload) {
  const { action, pull_request: pr, repository } = payload;

  const relevantActions = ['opened', 'synchronize', 'reopened', 'ready_for_review'];
  if (!relevantActions.includes(action)) {
    console.log(`Ignoring PR action: ${action}`);
    return;
  }

  // Skip draft PRs unless explicitly marked ready
  if (pr.draft && action !== 'ready_for_review') {
    console.log(`Skipping draft PR #${pr.number}`);
    return;
  }
