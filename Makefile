# Musician Practice Suite — local dev and deployment.
# Run `make help` for the list of targets.

SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c

SUPABASE := npx supabase
WRANGLER := npx wrangler
PROD_ENV := .env.production

# Load deployment settings into a recipe's shell (keeps secrets out of make's echo)
WITH_PROD_ENV := set -a && source ./$(PROD_ENV) && set +a &&

# Supabase's local stack talks to a Docker API; use Podman's socket when Docker is absent
ifeq ($(shell command -v docker),)
export DOCKER_HOST ?= unix:///run/user/$(shell id -u)/podman/podman.sock
endif

.DEFAULT_GOAL := help

.PHONY: help
help: ## Show this help
	@grep -hE '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

# ---------------------------------------------------------------------------
# Local development
# ---------------------------------------------------------------------------

.PHONY: install
install: ## Install tooling and frontend dependencies
	npm ci
	cd frontend && npm ci

.PHONY: dev
dev: ## Start the local Supabase stack and the Vite dev server
	$(SUPABASE) start
	cd frontend && npm run dev

.PHONY: stop
stop: ## Stop the local Supabase stack
	$(SUPABASE) stop

.PHONY: status
status: ## Show local Supabase URLs and keys
	$(SUPABASE) status

.PHONY: db-reset
db-reset: ## Recreate the local database from migrations
	$(SUPABASE) db reset

.PHONY: migration
migration: ## Create a new migration: make migration name=add_something
	@test -n "$(name)" || { echo "Usage: make migration name=<description>"; exit 1; }
	$(SUPABASE) migration new $(name)

# ---------------------------------------------------------------------------
# Production
# ---------------------------------------------------------------------------

.PHONY: check-env
check-env:
	@test -f $(PROD_ENV) || { echo "Missing $(PROD_ENV) — copy $(PROD_ENV).example and fill it in"; exit 1; }
	@$(WITH_PROD_ENV) for v in SUPABASE_PROJECT_REF SUPABASE_DB_PASSWORD VITE_SUPABASE_URL \
		VITE_SUPABASE_PUBLISHABLE_KEY CLOUDFLARE_PAGES_PROJECT ANTHROPIC_API_KEY; do \
		test -n "$${!v:-}" || { echo "$$v is not set in $(PROD_ENV)"; exit 1; }; \
	done

.PHONY: link
link: check-env ## One-time: link this repo to the hosted Supabase project
	@$(WITH_PROD_ENV) $(SUPABASE) link --project-ref "$$SUPABASE_PROJECT_REF" --password "$$SUPABASE_DB_PASSWORD"

.PHONY: pages-create
pages-create: check-env ## One-time: create the Cloudflare Pages project
	@$(WITH_PROD_ENV) $(WRANGLER) pages project create "$$CLOUDFLARE_PAGES_PROJECT" --production-branch main

.PHONY: db-push
db-push: check-env ## Apply pending migrations to the hosted database
	@$(WITH_PROD_ENV) $(SUPABASE) db push --linked --password "$$SUPABASE_DB_PASSWORD"

.PHONY: secrets
secrets: check-env ## Set Edge Function secrets on the hosted project
	@$(WITH_PROD_ENV) $(SUPABASE) secrets set --project-ref "$$SUPABASE_PROJECT_REF" ANTHROPIC_API_KEY="$$ANTHROPIC_API_KEY"

.PHONY: functions-deploy
functions-deploy: check-env ## Deploy Edge Functions
	@$(WITH_PROD_ENV) $(SUPABASE) functions deploy --project-ref "$$SUPABASE_PROJECT_REF"

.PHONY: frontend-build
frontend-build: check-env ## Build the frontend against the hosted project
	@$(WITH_PROD_ENV) cd frontend && npm run build

.PHONY: frontend-deploy
frontend-deploy: frontend-build ## Build and upload the frontend to Cloudflare Pages
	@$(WITH_PROD_ENV) $(WRANGLER) pages deploy frontend/dist --project-name "$$CLOUDFLARE_PAGES_PROJECT" --branch main

.PHONY: deploy
deploy: db-push secrets functions-deploy frontend-deploy ## Deploy everything: database, functions, frontend
