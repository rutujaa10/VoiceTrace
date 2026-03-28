# ============================================
# VoiceTrace — Makefile
# ============================================

.PHONY: install dev-backend dev-frontend dev seed test lint clean

# Install all dependencies
install:
	cd backend && npm install
	cd frontend && npm install

# Development servers
dev-backend:
	cd backend && npm run dev

dev-frontend:
	cd frontend && npm run dev

# Run both (requires concurrently or two terminals)
dev:
	@echo "Run 'make dev-backend' and 'make dev-frontend' in separate terminals"

# Database
seed:
	cd backend && node database/seeds/index.js

# Testing
test:
	cd backend && npm test
	cd frontend && npm test

test-backend:
	cd backend && npm test

test-frontend:
	cd frontend && npm test

# Linting
lint:
	cd backend && npm run lint
	cd frontend && npm run lint

# Clean
clean:
	rm -rf backend/node_modules frontend/node_modules
	rm -rf backend/dist frontend/dist

# Docker
docker-build:
	docker-compose build

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down
