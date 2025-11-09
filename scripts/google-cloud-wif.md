#!/bin/sh
# Google Cloud Workload Identity Federation (WIF) setup for GitHub Actions
# to access Vertex AI resources.
#
# Huan Li <huan@chatie.io>
# Date: 2025-11-08

# === Variables ===
PROJECT_ID="cineai-c7qqw"
REGION="us-central1"
SA_NAME="gha-vertex"
WIP_POOL_ID="github"
WIP_PROVIDER_ID="github-actions"
REPO="ShipFail/firegen"          # e.g. "huan/my-app"
BRANCH_REF="refs/heads/main"

# === Derive project number ===
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"

# === Create a service account used by CI ===
gcloud iam service-accounts create "$SA_NAME" \
  --project="$PROJECT_ID" \
  --display-name="GitHub Actions Vertex runner"

SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

# === Enable required APIs ===
gcloud services enable aiplatform.googleapis.com iamcredentials.googleapis.com sts.googleapis.com \
  --project="$PROJECT_ID"

# === Create a Workload Identity Pool (once per project/org) ===
gcloud iam workload-identity-pools create "$WIP_POOL_ID" \
  --project="$PROJECT_ID" \
  --location="global" \
  --display-name="GitHub OIDC"

# === Create an OIDC provider for GitHub Actions ===
gcloud iam workload-identity-pools providers create-oidc "$WIP_PROVIDER_ID" \
  --project="$PROJECT_ID" \
  --location="global" \
  --workload-identity-pool="$WIP_POOL_ID" \
  --display-name="GitHub OIDC Provider" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="attribute.repository_owner == 'ShipFail'"

# === Allow the GitHub repo/branch to impersonate the SA ===
# Principals of the form:
#   principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL/attribute.repository/OWNER/REPO
#
# Optionally also constrain by assertion.ref (branch) in a condition.
gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
  --project "$PROJECT_ID" \
  --role "roles/iam.workloadIdentityUser" \
  --member "principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WIP_POOL_ID}/attribute.repository/${REPO}" \
  --condition=None

# === Grant Vertex AI permissions for your tests (adjust as needed) ===
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member "serviceAccount:${SA_EMAIL}" \
  --role "roles/aiplatform.user" \
  --condition=None

# If your tests need storage, logging, etc., add more roles minimally.
